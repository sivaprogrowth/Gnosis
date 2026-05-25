/**
 * pipeline.ts — orchestrates the ingest flow across two SSE endpoints.
 *
 * Phase A (url.ts / pdf.ts entry):
 *   fetching → fetched → synthesizing → synthesized → compounding → ready (awaiting user)
 *
 * Phase B (continue.ts resume after user confirms):
 *   writing → committing → committed → done
 *
 * Frames are emitted via an `onFrame` callback the caller turns into SSE
 * `data: {...}` lines. Job state is persisted to public.gnosis_ingest_jobs
 * between phases so the user's "Proceed" click in the browser can hit a
 * different function instance than the one that ran discovery.
 */

import { supabase } from "../_auth/supabase.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { compoundingFilter, type CompoundingFilterResult } from "./compoundingFilter.js"
import { fetchUrl, type FetchedDocument } from "./fetchUrl.js"
import { commitFiles, type CommitResult } from "./githubPush.js"
import { synthesize, type SynthesizeResult } from "./synthesize.js"

export interface PipelineFrame {
  stage:
    | "fetching"
    | "fetched"
    | "synthesizing"
    | "synthesized"
    | "compounding"
    | "ready"
    | "writing"
    | "committing"
    | "committed"
    | "done"
    | "error"
  message?: string
  data?: unknown
}

export type FrameHandler = (frame: PipelineFrame) => void

interface DiscoveryResult {
  jobId: string
  synth: SynthesizeResult
  filter: CompoundingFilterResult
  sourceDoc: FetchedDocument
}

/**
 * Phase A — fetch + synthesize + compounding filter, persist as a
 * gnosis_ingest_jobs row with status='awaiting_user'. Returns the discovery
 * payload so the SSE endpoint can flush a final `ready` frame containing
 * everything the UI needs to render the confirmation screen.
 */
export async function runDiscoveryFromUrl(
  url: string,
  requestedBy: string,
  onFrame: FrameHandler,
): Promise<DiscoveryResult> {
  // 1. Create the job row up-front so we have an id to surface on errors
  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "url",
      source_url: url,
      status: "fetching",
      requested_by: requestedBy,
    })
    .select("id")
    .single()
  if (jobErr || !job) throw new Error(`Could not create ingest job: ${jobErr?.message}`)
  const jobId = job.id

  onFrame({ stage: "fetching", message: `Fetching ${url}`, data: { jobId } })

  // 2. Fetch + extract
  const doc = await fetchUrl(url)
  await supabase
    .from("gnosis_ingest_jobs")
    .update({
      status: "discussing",
      raw_markdown: doc.markdown,
      source_title: doc.title,
    })
    .eq("id", jobId)

  onFrame({
    stage: "fetched",
    message: `Extracted ${doc.wordCount} words from ${doc.sourceDomain}`,
    data: {
      title: doc.title,
      domain: doc.sourceDomain,
      wordCount: doc.wordCount,
      byline: doc.byline,
    },
  })

  // 3. Synthesize
  onFrame({ stage: "synthesizing", message: "Synthesizing source page + takeaways…" })
  const synth = await synthesize({
    rawMarkdown: doc.markdown,
    title: doc.title,
    sourceDomain: doc.sourceDomain,
    sourceUrl: url,
    byline: doc.byline,
    publishedTime: doc.publishedTime,
  })
  onFrame({
    stage: "synthesized",
    message: `Synthesized ${synth.takeaways.length} takeaways and surfaced ${synth.surfacedEntities.length} entities`,
    data: { takeaways: synth.takeaways, slug: synth.suggestedSlug },
  })

  // 4. Compounding filter
  onFrame({
    stage: "compounding",
    message: "Applying compounding bar to surfaced entities…",
  })
  const index = getPageIndex()
  const existingPages = index.pages.map((p) => ({
    slug: p.slug,
    type: p.type,
    title: p.title,
  }))
  const filter = await compoundingFilter({
    candidates: synth.surfacedEntities,
    existingPages,
    sourceSummary: synth.takeaways.join(" "),
  })

  await supabase
    .from("gnosis_ingest_jobs")
    .update({
      status: "awaiting_user",
      takeaways: synth.takeaways,
      surfaced_entities: {
        promote: filter.promote,
        inline: filter.inline,
        suggestedSlug: synth.suggestedSlug,
        sourcePage: synth.sourcePage,
        sourceTitle: doc.title,
      },
    })
    .eq("id", jobId)

  onFrame({
    stage: "ready",
    message: `Ready to commit: ${filter.promote.length} new entity pages + 1 source page`,
    data: {
      jobId,
      sourceTitle: doc.title,
      sourceUrl: url,
      sourceDomain: doc.sourceDomain,
      suggestedSlug: synth.suggestedSlug,
      takeaways: synth.takeaways,
      promote: filter.promote,
      inline: filter.inline,
    },
  })

  return { jobId, synth, filter, sourceDoc: doc }
}

/**
 * Phase B — load job, generate entity-page stubs for promoted candidates,
 * commit everything to wiki-archive in one commit, finalize the job row.
 */
export async function runCommit(
  jobId: string,
  onFrame: FrameHandler,
): Promise<CommitResult> {
  // 1. Load job
  const { data: job, error: loadErr } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, source_url, source_title, surfaced_entities, status")
    .eq("id", jobId)
    .single()
  if (loadErr || !job) throw new Error(`Job ${jobId} not found: ${loadErr?.message}`)
  if (job.status !== "awaiting_user") {
    throw new Error(`Job ${jobId} status is ${job.status}, expected awaiting_user`)
  }

  const surfaced = job.surfaced_entities as {
    promote: Array<{ name: string; type: string; suggestedSlug: string; rationale: string }>
    inline: Array<{ name: string; type: string; reason: string }>
    suggestedSlug: string
    sourcePage: string
    sourceTitle: string
  }

  await supabase
    .from("gnosis_ingest_jobs")
    .update({ status: "synthesizing", user_decision: "proceed" })
    .eq("id", jobId)

  onFrame({ stage: "writing", message: "Generating entity stubs…" })

  // 2. Build the file list — source page + entity stubs
  const files: Array<{ path: string; content: string }> = []

  files.push({
    path: `wiki/sources/${surfaced.suggestedSlug}.md`,
    content: surfaced.sourcePage,
  })

  for (const entity of surfaced.promote) {
    const entityType =
      entity.type === "person"
        ? "people"
        : entity.type === "company"
          ? "companies"
          : entity.type === "book"
            ? "sources" // books still go under sources/
            : entity.type === "tool"
              ? "entities"
              : "concepts" // concept | framework default
    const path = `wiki/${entityType}/${entity.suggestedSlug}.md`
    const content = buildEntityStub(entity, surfaced.sourceTitle, surfaced.suggestedSlug)
    files.push({ path, content })
  }

  onFrame({
    stage: "committing",
    message: `Committing ${files.length} file(s) to wiki-archive…`,
    data: { fileCount: files.length, paths: files.map((f) => f.path) },
  })

  // 3. Push
  const commitMessage = [
    `Ingest: ${surfaced.sourceTitle}`,
    "",
    `Source: ${job.source_url}`,
    `New pages: ${files.length} (1 source + ${surfaced.promote.length} entity stub${surfaced.promote.length === 1 ? "" : "s"})`,
    `Ingested via gnosis.progrowth.services (job ${jobId})`,
  ].join("\n")

  const result = await commitFiles(files, commitMessage)

  await supabase
    .from("gnosis_ingest_jobs")
    .update({
      status: "done",
      commit_sha: result.sha,
      committed_files: result.files,
    })
    .eq("id", jobId)

  onFrame({
    stage: "committed",
    message: `Committed ${result.sha.slice(0, 7)} — ${files.length} file(s)`,
    data: { sha: result.sha, commitUrl: result.commitUrl, files: result.files },
  })

  onFrame({ stage: "done", message: "Ingest complete.", data: { jobId, sha: result.sha } })

  return result
}

function buildEntityStub(
  entity: { name: string; type: string; suggestedSlug: string; rationale: string },
  sourceTitle: string,
  sourceSlug: string,
): string {
  const fmType =
    entity.type === "person"
      ? "person"
      : entity.type === "company"
        ? "company"
        : entity.type === "framework"
          ? "concept"
          : entity.type === "tool"
            ? "entity"
            : entity.type === "book"
              ? "source"
              : "concept"

  return `---
type: ${fmType}
title: ${entity.name}
tags: [ingested]
sources: [${sourceSlug}]
---

# ${entity.name}

_Stub page created automatically during ingest of [[${sourceSlug}|${sourceTitle}]]._

${entity.rationale}

## Why this earned its own page

${entity.rationale}

## Mentions

- [[${sourceSlug}|${sourceTitle}]]
`
}

/** Mark a job failed so the UI can recover. */
export async function markJobFailed(jobId: string, message: string): Promise<void> {
  await supabase
    .from("gnosis_ingest_jobs")
    .update({ status: "failed", error_message: message })
    .eq("id", jobId)
}

/** Mark a job cancelled (user clicked Cancel on the confirm screen). */
export async function markJobCancelled(jobId: string): Promise<void> {
  await supabase
    .from("gnosis_ingest_jobs")
    .update({ status: "cancelled", user_decision: "cancel" })
    .eq("id", jobId)
}
