/**
 * pipeline.ts — orchestrates the ingest flow.
 *
 * The discovery phase (fetch → synthesize → compoundingFilter) is invoked
 * via `waitUntil` from /api/ingest/url and /api/ingest/pdf and writes its
 * progress directly to public.gnosis_ingest_jobs (status + progress_message).
 * The frontend polls /api/ingest/job for the current state.
 *
 * The commit phase still uses SSE in /api/ingest/continue because it's fast
 * (~2-5s) and the SSE disconnect bug doesn't trigger on short windows.
 */

import { supabase } from "../_auth/supabase.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { compoundingFilter } from "./compoundingFilter.js"
import { extractPdf } from "./extractPdf.js"
import { fetchUrl } from "./fetchUrl.js"
import { commitFiles, triggerVercelRebuild, type CommitResult } from "./githubPush.js"
import { synthesize } from "./synthesize.js"

export interface PipelineFrame {
  stage: string
  message?: string
  data?: unknown
}
export type FrameHandler = (frame: PipelineFrame) => void

async function updateJob(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("gnosis_ingest_jobs")
    .update(patch)
    .eq("id", jobId)
  if (error) console.warn(`[pipeline] could not update job ${jobId}:`, error.message)
}

/**
 * Run just the synthesize + compoundingFilter steps on a job whose
 * raw_markdown is already populated. Used by both:
 *   - the initial discovery from URL/PDF (after fetching)
 *   - the regenerate action (re-running synth on existing content)
 *
 * Updates `status`, `progress_message`, `takeaways`, `surfaced_entities`
 * in place. Sets status to `awaiting_user` on success.
 */
export async function runSynthesisStandalone(jobId: string): Promise<void> {
  try {
    await runSynthesisOnly(jobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] standalone synthesis failed for job ${jobId}:`, msg)
    await updateJob(jobId, {
      status: "failed",
      error_message: msg,
      progress_message: `Synthesis failed: ${msg}`,
    })
  }
}

export async function runSynthesisOnly(jobId: string): Promise<void> {
  const { data: job, error: loadErr } = await supabase
    .from("gnosis_ingest_jobs")
    .select("source_type, source_url, source_filename, source_title, raw_markdown")
    .eq("id", jobId)
    .single()
  if (loadErr || !job) throw new Error(`Job ${jobId} not found: ${loadErr?.message}`)
  if (!job.raw_markdown) throw new Error(`Job ${jobId} has no raw_markdown to synthesize`)

  await updateJob(jobId, {
    status: "discussing",
    progress_message: "Synthesizing source page + entities…",
    // Clear stale outputs so the UI doesn't briefly show old data on regenerate
    takeaways: null,
    surfaced_entities: null,
  })

  // Build the existing-pages index once; pass to both synthesize (for
  // interlinking) and compoundingFilter (for the compounding decision).
  const index = getPageIndex()
  const existingPages = index.pages.map((p) => ({
    slug: p.slug,
    type: p.type,
    title: p.title,
  }))

  const sourceUrl =
    job.source_type === "url"
      ? job.source_url || ""
      : `pdf://${job.source_filename || "unknown.pdf"}`
  const sourceDomain =
    job.source_type === "url"
      ? (() => {
          try {
            return new URL(job.source_url || "").hostname
          } catch {
            return job.source_url || ""
          }
        })()
      : "pdf-upload"

  const synth = await synthesize({
    rawMarkdown: job.raw_markdown,
    title: job.source_title || "Untitled",
    sourceDomain,
    sourceUrl,
    byline: null,
    publishedTime: null,
    existingPages,
  })
  await updateJob(jobId, {
    progress_message: `Synthesized ${synth.takeaways.length} takeaways and ${synth.surfacedEntities.length} entities. Applying compounding bar…`,
  })

  const filter = await compoundingFilter({
    candidates: synth.surfacedEntities,
    existingPages,
    sourceSummary: (synth.takeaways || []).join(" "),
  })

  await updateJob(jobId, {
    status: "awaiting_user",
    takeaways: synth.takeaways,
    surfaced_entities: {
      promote: filter.promote,
      inline: filter.inline,
      suggestedSlug: synth.suggestedSlug,
      sourcePage: synth.sourcePage,
      sourceTitle: job.source_title || "Untitled",
    },
    progress_message: `Ready to commit: ${filter.promote.length} new entity pages + 1 source page.`,
  })
}

/** Phase A — URL: fetch → synthesize → compoundingFilter → awaiting_user. */
export async function runDiscoveryFromUrl(url: string, jobId: string): Promise<void> {
  try {
    await updateJob(jobId, {
      status: "fetching",
      progress_message: `Fetching ${url}`,
    })

    const doc = await fetchUrl(url)
    await updateJob(jobId, {
      status: "discussing",
      raw_markdown: doc.markdown,
      source_title: doc.title,
      progress_message: `Extracted ${doc.wordCount} words from ${doc.sourceDomain}. Synthesizing…`,
    })

    await runSynthesisOnly(jobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] discovery failed for job ${jobId}:`, msg)
    await updateJob(jobId, {
      status: "failed",
      error_message: msg,
      progress_message: `Failed: ${msg}`,
    })
  }
}

/** Phase A — PDF: same downstream as URL after extractPdf. */
export async function runDiscoveryFromPdf(
  pdfBytes: Uint8Array,
  filename: string,
  jobId: string,
): Promise<void> {
  try {
    await updateJob(jobId, {
      status: "fetching",
      progress_message: `Reading ${filename} (${(pdfBytes.byteLength / 1024).toFixed(0)} KB)`,
    })

    const extracted = await extractPdf(pdfBytes, filename)
    await updateJob(jobId, {
      status: "discussing",
      raw_markdown: extracted.markdown,
      source_title: extracted.title,
      progress_message: `Extracted ${extracted.wordCount} words across ${extracted.pageCount} pages. Synthesizing…`,
    })

    await runSynthesisOnly(jobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] PDF discovery failed for job ${jobId}:`, msg)
    await updateJob(jobId, {
      status: "failed",
      error_message: msg,
      progress_message: `Failed: ${msg}`,
    })
  }
}

/** Phase B — load awaiting_user job, write entity stubs, commit, trigger rebuild. */
export async function runCommit(
  jobId: string,
  onFrame: FrameHandler,
): Promise<CommitResult> {
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

  await updateJob(jobId, { status: "synthesizing", user_decision: "proceed" })

  onFrame({ stage: "writing", message: "Generating entity stubs…" })

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
            ? "sources"
            : entity.type === "tool"
              ? "entities"
              : "concepts"
    const path = `wiki/${entityType}/${entity.suggestedSlug}.md`
    const content = buildEntityStub(entity, surfaced.sourceTitle, surfaced.suggestedSlug)
    files.push({ path, content })
  }

  onFrame({
    stage: "committing",
    message: `Committing ${files.length} file(s) to wiki-archive…`,
    data: { fileCount: files.length, paths: files.map((f) => f.path) },
  })

  const commitMessage = [
    `Ingest: ${surfaced.sourceTitle}`,
    "",
    `Source: ${job.source_url}`,
    `New pages: ${files.length} (1 source + ${surfaced.promote.length} entity stub${surfaced.promote.length === 1 ? "" : "s"})`,
    `Ingested via gnosis.progrowth.services (job ${jobId})`,
  ].join("\n")

  const result = await commitFiles(files, commitMessage)

  await updateJob(jobId, {
    status: "done",
    commit_sha: result.sha,
    committed_files: result.files,
  })

  onFrame({
    stage: "committed",
    message: `Committed ${result.sha.slice(0, 7)} — ${files.length} file(s)`,
    data: { sha: result.sha, commitUrl: result.commitUrl, files: result.files },
  })

  triggerVercelRebuild(`ingest of "${surfaced.sourceTitle}" (job ${jobId})`)
    .then((triggerSha) =>
      console.log(`[ingest] triggered Vercel rebuild via empty main commit ${triggerSha.slice(0, 7)}`),
    )
    .catch((e) =>
      console.warn(`[ingest] rebuild trigger failed:`, e instanceof Error ? e.message : e),
    )

  onFrame({
    stage: "done",
    message: "Ingest complete. Site rebuild triggered.",
    data: { jobId, sha: result.sha, rebuildTriggered: true },
  })

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

export async function markJobFailed(jobId: string, message: string): Promise<void> {
  await updateJob(jobId, {
    status: "failed",
    error_message: message,
    progress_message: `Failed: ${message}`,
  })
}

export async function markJobCancelled(jobId: string): Promise<void> {
  await updateJob(jobId, {
    status: "cancelled",
    user_decision: "cancel",
    progress_message: "Cancelled by user.",
  })
}
