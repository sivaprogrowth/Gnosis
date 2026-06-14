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
import {
  commitFiles,
  getFileContent,
  listFilesInDirectory,
  triggerVercelRebuild,
  type CommitResult,
} from "./githubPush.js"
import matter from "gray-matter"
import { synthesize } from "./synthesize.js"
import { listReaderDocs, updateReaderDoc, readerTagKeys, type ReaderDocument } from "./reader.js"
import { syncToLifeSystem } from "./lifeSystemSync.js"
import TurndownService from "turndown"

export interface PipelineFrame {
  stage: string
  message?: string
  data?: unknown
}
export type FrameHandler = (frame: PipelineFrame) => void

async function updateJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("gnosis_ingest_jobs").update(patch).eq("id", jobId)
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
      : job.source_type === "pdf"
        ? `pdf://${job.source_filename || "unknown.pdf"}`
        : job.source_url || "clipping://pasted"
  const sourceDomain =
    job.source_type === "url"
      ? (() => {
          try {
            return new URL(job.source_url || "").hostname
          } catch {
            return job.source_url || ""
          }
        })()
      : job.source_type === "pdf"
        ? "pdf-upload"
        : job.source_url
          ? (() => {
              try {
                return new URL(job.source_url).hostname
              } catch {
                return "clipping"
              }
            })()
          : "clipping"

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

/**
 * Phase B — load awaiting_user job, write entity stubs, commit, trigger rebuild.
 *
 * `extraFiles` lets callers piggyback additional file changes into the same
 * atomic commit — e.g. the cron uses this to mark the source clipping with
 * `gnosis_ingested: true` so it's not picked up again on the next run.
 */
export async function runCommit(
  jobId: string,
  onFrame: FrameHandler,
  extraFiles: Array<{ path: string; content: string }> = [],
): Promise<CommitResult> {
  const { data: job, error: loadErr } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, source_url, source_title, surfaced_entities, status, takeaways")
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

  // Backlink updates: scan the new source page for [[wiki-link]] markers and,
  // for each one that resolves to an existing wiki page, append a new entry
  // to that page's ## Mentions section. All updates land in the same atomic
  // commit, so the wiki stays consistent.
  const newlyCreatedSlugs = new Set<string>([
    surfaced.suggestedSlug,
    ...surfaced.promote.map((e) => e.suggestedSlug),
  ])
  const backlinkUpdates = await collectBacklinkUpdates({
    sourcePage: surfaced.sourcePage,
    newSourceSlug: surfaced.suggestedSlug,
    newSourceTitle: surfaced.sourceTitle,
    newlyCreatedSlugs,
  })
  for (const update of backlinkUpdates) {
    files.push({ path: update.path, content: update.content })
  }
  for (const extra of extraFiles) {
    files.push(extra)
  }

  onFrame({
    stage: "committing",
    message: `Committing ${files.length} file(s) to wiki-archive… (${backlinkUpdates.length} backlink update${backlinkUpdates.length === 1 ? "" : "s"})`,
    data: {
      fileCount: files.length,
      paths: files.map((f) => f.path),
      backlinkUpdates: backlinkUpdates.length,
    },
  })

  const commitMessage = [
    `Ingest: ${surfaced.sourceTitle}`,
    "",
    `Source: ${job.source_url}`,
    `New pages: ${1 + surfaced.promote.length} (1 source + ${surfaced.promote.length} entity stub${surfaced.promote.length === 1 ? "" : "s"})`,
    backlinkUpdates.length > 0
      ? `Backlinks updated: ${backlinkUpdates.length} existing page${backlinkUpdates.length === 1 ? "" : "s"}`
      : "",
    `Ingested via gnosis.progrowth.services (job ${jobId})`,
  ]
    .filter(Boolean)
    .join("\n")

  const result = await commitFiles(files, commitMessage)

  await updateJob(jobId, {
    status: "done",
    commit_sha: result.sha,
    committed_files: result.files,
  })

  // Fire-and-forget: sync article to life-system for Learning section
  syncToLifeSystem({
    title:     surfaced.sourceTitle,
    url:       job.source_url ?? null,
    takeaways: Array.isArray(job.takeaways) ? (job.takeaways as string[]) : [],
    theme:     null,
    docSlug:   `sources/${surfaced.suggestedSlug}`,
  }).catch(() => {/* already logged inside syncToLifeSystem */})

  onFrame({
    stage: "committed",
    message: `Committed ${result.sha.slice(0, 7)} — ${files.length} file(s)`,
    data: {
      sha: result.sha,
      commitUrl: result.commitUrl,
      files: result.files,
      backlinksUpdated: backlinkUpdates.length,
      newPageCount: 1 + surfaced.promote.length,
      backlinkPaths: backlinkUpdates.map((u) => u.path),
    },
  })

  triggerVercelRebuild(`ingest of "${surfaced.sourceTitle}" (job ${jobId})`)
    .then((triggerSha) =>
      console.log(
        `[ingest] triggered Vercel rebuild via empty main commit ${triggerSha.slice(0, 7)}`,
      ),
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

interface BacklinkUpdate {
  path: string
  content: string
  targetSlug: string
}

/**
 * Scan the new source page for [[wiki-link]] markers, resolve each to an
 * existing wiki page (by exact slug OR unambiguous basename), fetch that
 * page's current content from wiki-archive, append the new source to its
 * ## Mentions section. Returns the updated file contents ready to commit.
 *
 * Skips:
 *   - Self-links
 *   - Links to pages being created in the same commit (newlyCreatedSlugs)
 *   - Ambiguous bare-name links (e.g. [[brand-age]] when two pages share
 *     that basename)
 *   - Pages whose current content already references the new source
 */
async function collectBacklinkUpdates(args: {
  sourcePage: string
  newSourceSlug: string
  newSourceTitle: string
  newlyCreatedSlugs: Set<string>
}): Promise<BacklinkUpdate[]> {
  // Extract every [[slug]] or [[slug|display]] from the source page
  const linkRe = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g
  const linkedRaw = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(args.sourcePage)) !== null) {
    linkedRaw.add(m[1].trim())
  }
  if (linkedRaw.size === 0) return []

  const index = getPageIndex()
  const fullSlugToPage = new Map<string, { slug: string; title: string }>()
  const bareToFullSlugs = new Map<string, string[]>()
  for (const p of index.pages) {
    fullSlugToPage.set(p.slug, { slug: p.slug, title: p.title })
    const bare = p.slug.includes("/") ? p.slug.split("/").pop()! : p.slug
    const existing = bareToFullSlugs.get(bare) ?? []
    existing.push(p.slug)
    bareToFullSlugs.set(bare, existing)
  }

  // Resolve each linked slug to a wiki-archive path
  const targets = new Map<string, { wikiPath: string; title: string }>()
  for (const linkSlug of linkedRaw) {
    if (linkSlug === args.newSourceSlug) continue
    if (args.newlyCreatedSlugs.has(linkSlug)) continue
    let resolved: { slug: string; title: string } | null = null
    if (fullSlugToPage.has(linkSlug)) {
      resolved = fullSlugToPage.get(linkSlug)!
    } else {
      const candidates = bareToFullSlugs.get(linkSlug) ?? []
      if (candidates.length === 1) {
        resolved = fullSlugToPage.get(candidates[0]) ?? null
      }
      // candidates.length > 1 → ambiguous; skip
    }
    if (!resolved) continue
    if (args.newlyCreatedSlugs.has(resolved.slug)) continue
    targets.set(resolved.slug, {
      wikiPath: `wiki/${resolved.slug}.md`,
      title: resolved.title,
    })
  }

  const updates: BacklinkUpdate[] = []
  for (const [slug, target] of targets) {
    let current: string | null
    try {
      current = await getFileContent(target.wikiPath)
    } catch (err) {
      console.warn(
        `[pipeline] backlink: could not fetch ${target.wikiPath}:`,
        err instanceof Error ? err.message : err,
      )
      continue
    }
    if (current === null) {
      // Page exists in our local index but not on wiki-archive — possibly a
      // newly-renamed page or a sync gap. Skip rather than create a stub.
      continue
    }
    // Already mentions the new source? skip
    const already = new RegExp(`\\[\\[${escapeRegex(args.newSourceSlug)}(\\||\\]\\])`).test(current)
    if (already) continue

    const updated = appendMention(current, args.newSourceSlug, args.newSourceTitle)
    if (updated !== current) {
      updates.push({ path: target.wikiPath, content: updated, targetSlug: slug })
    }
  }
  return updates
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Append a new bullet to a page's ## Mentions section. If the section
 * doesn't exist, append one at the end. Idempotent on duplicate sources
 * (caller already checks for that).
 */
function appendMention(content: string, sourceSlug: string, sourceTitle: string): string {
  const bullet = `- [[${sourceSlug}|${sourceTitle}]]`

  const headingRe = /^##\s+Mentions\s*$/m
  const headingMatch = headingRe.exec(content)
  if (headingMatch) {
    const insertAt = headingMatch.index + headingMatch[0].length
    const before = content.slice(0, insertAt)
    const after = content.slice(insertAt).replace(/^\n+/, "")
    return `${before}\n\n${bullet}\n${after}`
  }

  // No Mentions section — append one at end with the right separator
  const sep = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n"
  return `${content}${sep}## Mentions\n\n${bullet}\n`
}

// ============================================================================
// Daily clippings cron
// ============================================================================

const CLIPPINGS_DIR = "Clippings"
const MAX_CLIPPINGS_PER_RUN = 6 // per-wave ceiling; the time budget below is the real guard
const CLIPPINGS_TIME_BUDGET_MS = 240_000 // stop starting new clips ~60s before the 300s function limit
const SYSTEM_USER_EMAIL = "siva@progrowth.services"

export interface CronClippingResult {
  filename: string
  status: "ingested" | "skipped" | "failed"
  jobId?: string
  commitSha?: string
  reason?: string
}

export interface CronSummary {
  scanned: number
  candidates: number
  processed: number
  results: CronClippingResult[]
}

/**
 * Daily-cron entry: list Clippings/*.md on wiki-archive, ingest unprocessed
 * ones (no `gnosis_ingested: true` frontmatter), mark each one done in the
 * same atomic commit as its ingest.
 *
 * Capped at MAX_CLIPPINGS_PER_RUN per run because Vercel's 300s function
 * limit forces sequential synth+commit and each takes ~90s. Remaining
 * clippings get picked up next run.
 */
export async function processClippingsCron(
  deadline: number = Date.now() + CLIPPINGS_TIME_BUDGET_MS,
): Promise<CronSummary & { remaining: number }> {
  const files = await listFilesInDirectory(CLIPPINGS_DIR).catch((e) => {
    console.error(`[cron] could not list ${CLIPPINGS_DIR}:`, e instanceof Error ? e.message : e)
    return []
  })
  const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith(".md"))

  const summary: CronSummary & { remaining: number } = {
    scanned: mdFiles.length,
    candidates: 0,
    processed: 0,
    results: [],
    remaining: 0,
  }
  const candidates: Array<{
    file: { path: string; name: string }
    raw: string
    parsed: matter.GrayMatterFile<string>
  }> = []

  for (const f of mdFiles) {
    let raw: string | null
    try {
      raw = await getFileContent(f.path)
    } catch (e) {
      summary.results.push({
        filename: f.name,
        status: "failed",
        reason: `read failed: ${e instanceof Error ? e.message : e}`,
      })
      continue
    }
    if (!raw) continue
    const parsed = matter(raw)
    if (parsed.data && parsed.data.gnosis_ingested === true) {
      summary.results.push({ filename: f.name, status: "skipped", reason: "already ingested" })
      continue
    }
    candidates.push({ file: f, raw, parsed })
  }
  summary.candidates = candidates.length

  // Process up to MAX_CLIPPINGS_PER_RUN, but stop starting new ones once the
  // time budget is spent so the function never gets killed mid-synth (which
  // would strand a job in `discussing` and wedge that clip via the in-flight
  // guard). `remaining` = candidates we didn't attempt this wave, so the
  // caller can self-chain another wave to drain the rest.
  const batch = candidates.slice(0, MAX_CLIPPINGS_PER_RUN)
  let attempted = 0
  for (let i = 0; i < batch.length; i++) {
    if (Date.now() >= deadline) break
    const result = await ingestOneClipping(batch[i])
    summary.results.push(result)
    if (result.status === "ingested") summary.processed++
    attempted = i + 1
  }
  summary.remaining = candidates.length - attempted

  return summary
}

async function ingestOneClipping(args: {
  file: { path: string; name: string }
  raw: string
  parsed: matter.GrayMatterFile<string>
}): Promise<CronClippingResult> {
  const filename = args.file.name
  const frontmatter = args.parsed.data ?? {}
  const body = args.parsed.content.trim()

  // Title: prefer frontmatter title, fall back to filename without .md
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : filename.replace(/\.md$/i, "")
  // Source URL: Obsidian Web Clipper writes `source` (string URL)
  const sourceUrl =
    typeof frontmatter.source === "string" && frontmatter.source.trim()
      ? frontmatter.source.trim()
      : null

  if (body.length < 200) {
    return { filename, status: "failed", reason: `body too short (${body.length} chars)` }
  }

  // Dedup against gnosis_ingest_jobs.done with same source_url OR same title
  const dupQuery = supabase
    .from("gnosis_ingest_jobs")
    .select("id, commit_sha")
    .eq("status", "done")
    .or(
      sourceUrl
        ? `source_url.eq.${sourceUrl},source_title.eq.${title}`
        : `source_title.eq.${title}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
  const { data: dup } = await dupQuery.maybeSingle()
  if (dup) {
    // Already ingested previously by some other path — just mark this clipping done so we stop re-checking
    await markClippingProcessed(args.file.path, args.parsed, dup.id, dup.commit_sha)
    return {
      filename,
      status: "skipped",
      reason: `already ingested as commit ${dup.commit_sha?.slice(0, 7)}`,
    }
  }

  // In-flight guard: skip if another cron pass (or web ingest) is currently
  // processing the same source. Without this, concurrent cron invocations
  // can both pass the `done`-status dedup, both run synth+commit, and end up
  // overwriting each other with orphan entity pages left in the wiki.
  // The `discussing`/`synthesizing` states cover the active window from
  // synthesize start through commit.
  const inFlightQuery = supabase
    .from("gnosis_ingest_jobs")
    .select("id, status")
    .in("status", ["queued", "fetching", "discussing", "synthesizing", "committing"])
    .or(
      sourceUrl
        ? `source_url.eq.${sourceUrl},source_title.eq.${title}`
        : `source_title.eq.${title}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
  const { data: inFlight } = await inFlightQuery.maybeSingle()
  if (inFlight) {
    return {
      filename,
      status: "skipped",
      reason: `another ingest is already in-flight for this source (job ${inFlight.id.slice(0, 8)}, status=${inFlight.status})`,
    }
  }

  // Create the job row with raw_markdown pre-filled
  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "clipping",
      source_url: sourceUrl,
      source_title: title,
      raw_markdown: body,
      status: "discussing",
      progress_message: `[cron] Synthesizing ${filename}`,
      requested_by: SYSTEM_USER_EMAIL,
    })
    .select("id")
    .single()
  if (jobErr || !job) {
    return { filename, status: "failed", reason: `job insert: ${jobErr?.message}` }
  }
  const jobId = job.id

  try {
    await runSynthesisOnly(jobId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await markJobFailed(jobId, msg).catch(() => {})
    return { filename, status: "failed", jobId, reason: `synth failed: ${msg}` }
  }

  // Mark the source clipping file as processed in the SAME commit as the ingest
  const updatedClipping = stringifyClippingAsProcessed(args.parsed, jobId)
  const extraFile = { path: args.file.path, content: updatedClipping }

  try {
    // runCommit takes an onFrame callback for the SSE flow; for cron we just
    // log to the function console.
    const result = await runCommit(
      jobId,
      (frame) => {
        if (frame.message) console.log(`[cron ${filename}] ${frame.stage}: ${frame.message}`)
      },
      [extraFile],
    )
    return { filename, status: "ingested", jobId, commitSha: result.sha }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await markJobFailed(jobId, msg).catch(() => {})
    return { filename, status: "failed", jobId, reason: `commit failed: ${msg}` }
  }
}

/**
 * Re-serialize a clipping with `gnosis_ingested: true` + a couple of audit
 * fields added to its frontmatter. The body content is preserved verbatim.
 */
function stringifyClippingAsProcessed(
  parsed: matter.GrayMatterFile<string>,
  jobId: string,
  commitSha?: string,
): string {
  const data = { ...(parsed.data ?? {}) }
  data.gnosis_ingested = true
  data.gnosis_job_id = jobId
  if (commitSha) data.gnosis_commit_sha = commitSha
  data.gnosis_ingested_at = new Date().toISOString()
  return matter.stringify(parsed.content, data)
}

/**
 * Sync helper: mark a clipping as processed without re-committing the wiki.
 * Used when we detect a clipping that was already ingested by some other path
 * (e.g. via the web /ingest UI on the same URL). Just updates the file's
 * frontmatter in a dedicated commit so we stop scanning it.
 */
async function markClippingProcessed(
  path: string,
  parsed: matter.GrayMatterFile<string>,
  jobId: string,
  commitSha: string | null,
): Promise<void> {
  const content = stringifyClippingAsProcessed(parsed, jobId, commitSha ?? undefined)
  try {
    await commitFiles(
      [{ path, content }],
      `Mark clipping as already-ingested (matched job ${jobId.slice(0, 8)})\n\nNo new wiki commit — this matches a previous ingest by URL/title. Marking the clipping file processed so the daily cron stops scanning it.`,
    )
  } catch (e) {
    console.warn(`[cron] could not mark ${path} processed:`, e instanceof Error ? e.message : e)
  }
}

// ============================================================================
// Readwise Reader auto-ingest cron
// ============================================================================
//
// Trigger: the user tags a Reader document `gnosis` (from the mobile share
// sheet, desktop, anywhere). The hourly cron pulls every document still
// carrying that tag, ingests each through the same synth+commit pipeline as
// the web /ingest UI, then removes the trigger tag and archives the doc so it
// drops out of the pending set. Because we query by `?tag=gnosis`, the scan is
// naturally bounded to *unprocessed* items — no growing backlog to filter.
//
// No per-run count cap (the user asked for uncapped). Instead the cron drains
// up to a wall-clock budget, then job.ts self-re-triggers the next wave until
// the pending set is empty (a wave counter backstops runaway recursion).

const READER_TRIGGER_TAG = "gnosis"
const READER_DONE_TAG = "gnosis-done"
const READER_ERROR_TAG = "gnosis-error"
/** Leave ~60s headroom under the 300s maxDuration for the in-flight ingest. */
const READER_TIME_BUDGET_MS = 240_000
/** Reader's html_content shorter than this triggers the source-URL refetch. */
const READER_HTML_MIN_CHARS = 400

export interface ReaderCronSummary extends CronSummary {
  /** Pending docs not attempted this wave (deadline hit). >0 ⇒ self-chain. */
  remaining: number
}

let readerTurndown: TurndownService | null = null
function htmlToMarkdown(html: string): string {
  if (!readerTurndown) {
    readerTurndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "_",
    })
    readerTurndown.remove(["script", "style", "noscript", "iframe"])
  }
  return readerTurndown
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Resolve a Reader doc to clean markdown.
 *   (A) Reader's own cleaned html_content — works for paywalled / email /
 *       app-only saves that a re-fetch could never reach.
 *   (B) Fallback: re-fetch source_url through the same fetchUrl() the web
 *       /ingest path uses, for docs whose html_content came back thin/empty.
 * Throws if neither yields usable content.
 */
async function resolveReaderMarkdown(
  doc: ReaderDocument,
): Promise<{ markdown: string; via: "html_content" | "source_url" }> {
  const html = doc.html_content?.trim() ?? ""
  if (html.length >= READER_HTML_MIN_CHARS) {
    const md = htmlToMarkdown(html)
    if (md.length >= 200) return { markdown: md, via: "html_content" }
  }
  if (doc.source_url) {
    const fetched = await fetchUrl(doc.source_url)
    return { markdown: fetched.markdown, via: "source_url" }
  }
  throw new Error(
    `no usable content — html_content ${html.length} chars and no source_url to re-fetch`,
  )
}

/**
 * Daily/hourly-cron entry: list every Reader doc tagged `gnosis`, ingest each
 * one through synth+commit, retag + archive on success. Drains until the
 * `deadline` wall-clock is hit; returns `remaining` so the caller can decide
 * whether to fire another wave.
 */
export async function processReaderCron(
  deadline: number = Date.now() + READER_TIME_BUDGET_MS,
): Promise<ReaderCronSummary> {
  let pending: ReaderDocument[]
  try {
    pending = await listReaderDocs({
      tag: READER_TRIGGER_TAG,
      withHtmlContent: true,
    })
  } catch (e) {
    console.error("[cron reader] list failed:", e instanceof Error ? e.message : e)
    return { scanned: 0, candidates: 0, processed: 0, results: [], remaining: 0 }
  }

  // Skip highlights/notes (they're also "documents" but have a parent_id) and
  // any doc already archived with the done/error marker still lingering.
  const docs = pending.filter(
    (d) =>
      !d.parent_id &&
      d.category !== "highlight" &&
      d.category !== "note" &&
      !readerTagKeys(d).includes(READER_DONE_TAG),
  )

  const summary: ReaderCronSummary = {
    scanned: pending.length,
    candidates: docs.length,
    processed: 0,
    results: [],
    remaining: 0,
  }

  for (let i = 0; i < docs.length; i++) {
    if (Date.now() >= deadline) {
      summary.remaining = docs.length - i
      break
    }
    const result = await ingestOneReaderDoc(docs[i])
    summary.results.push(result)
    if (result.status === "ingested") summary.processed++
  }

  return summary
}

async function ingestOneReaderDoc(doc: ReaderDocument): Promise<CronClippingResult> {
  const filename = doc.title || doc.source_url || `reader:${doc.id}`
  const title = (doc.title && doc.title.trim()) || doc.source_url || `Reader ${doc.id}`
  const sourceUrl = doc.source_url && doc.source_url.trim() ? doc.source_url.trim() : null

  // Dedup: already ingested by any path (web UI, clippings, a prior wave)?
  const { data: dup } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, commit_sha")
    .eq("status", "done")
    .or(
      sourceUrl
        ? `source_url.eq.${sourceUrl},source_title.eq.${title}`
        : `source_title.eq.${title}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (dup) {
    // Clear the trigger tag so it stops re-surfacing, but don't re-ingest.
    await markReaderDone(doc).catch(() => {})
    return {
      filename,
      status: "skipped",
      reason: `already ingested as commit ${dup.commit_sha?.slice(0, 7)}`,
    }
  }

  // In-flight guard: another wave or a web ingest mid-flight on this source.
  const { data: inFlight } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, status")
    .in("status", ["queued", "fetching", "discussing", "synthesizing", "committing"])
    .or(
      sourceUrl
        ? `source_url.eq.${sourceUrl},source_title.eq.${title}`
        : `source_title.eq.${title}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (inFlight) {
    return {
      filename,
      status: "skipped",
      reason: `another ingest is already in-flight (job ${inFlight.id.slice(0, 8)}, status=${inFlight.status})`,
    }
  }

  // Acquire content (Reader html_content → source_url fallback).
  let markdown: string
  try {
    const resolved = await resolveReaderMarkdown(doc)
    markdown = resolved.markdown
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await markReaderError(doc).catch(() => {})
    return { filename, status: "failed", reason: `content fetch failed: ${msg}` }
  }
  if (markdown.trim().length < 200) {
    await markReaderError(doc).catch(() => {})
    return {
      filename,
      status: "failed",
      reason: `body too short (${markdown.trim().length} chars)`,
    }
  }

  // Create the job row with raw_markdown pre-filled.
  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "reader",
      source_url: sourceUrl,
      source_title: title,
      raw_markdown: markdown,
      status: "discussing",
      progress_message: `[cron reader] Synthesizing ${title}`,
      requested_by: SYSTEM_USER_EMAIL,
    })
    .select("id")
    .single()
  if (jobErr || !job) {
    return { filename, status: "failed", reason: `job insert: ${jobErr?.message}` }
  }
  const jobId = job.id

  try {
    await runSynthesisOnly(jobId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await markJobFailed(jobId, msg).catch(() => {})
    await markReaderError(doc).catch(() => {})
    return { filename, status: "failed", jobId, reason: `synth failed: ${msg}` }
  }

  try {
    const result = await runCommit(jobId, (frame) => {
      if (frame.message) console.log(`[cron reader ${title}] ${frame.stage}: ${frame.message}`)
    })
    // Only after a clean commit do we retire the doc from the pending set.
    await markReaderDone(doc).catch((e) =>
      console.warn(
        `[cron reader] commit ok but retag failed for ${doc.id}:`,
        e instanceof Error ? e.message : e,
      ),
    )
    return { filename, status: "ingested", jobId, commitSha: result.sha }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await markJobFailed(jobId, msg).catch(() => {})
    await markReaderError(doc).catch(() => {})
    return { filename, status: "failed", jobId, reason: `commit failed: ${msg}` }
  }
}

/** Retire a successfully-ingested doc: drop the trigger tag, add done, archive. */
async function markReaderDone(doc: ReaderDocument): Promise<void> {
  const tags = readerTagKeys(doc).filter((t) => t !== READER_TRIGGER_TAG && t !== READER_ERROR_TAG)
  if (!tags.includes(READER_DONE_TAG)) tags.push(READER_DONE_TAG)
  await updateReaderDoc(doc.id, { tags, location: "archive" })
}

/** Mark a failed doc: drop the trigger tag (so it leaves the pending set), add error. */
async function markReaderError(doc: ReaderDocument): Promise<void> {
  const tags = readerTagKeys(doc).filter((t) => t !== READER_TRIGGER_TAG && t !== READER_DONE_TAG)
  if (!tags.includes(READER_ERROR_TAG)) tags.push(READER_ERROR_TAG)
  await updateReaderDoc(doc.id, { tags })
}

// ============================================================================

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
