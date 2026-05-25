/**
 * GET /api/ingest/job?id=<uuid> — poll for the current state of an ingest job.
 *
 * Used by the /ingest frontend after POST to /api/ingest/url or /api/ingest/pdf
 * returns a jobId. The frontend polls every 2s.
 *
 * Response shape:
 *   {
 *     status: 'queued'|'fetching'|'discussing'|'awaiting_user'|...|'failed'|'done',
 *     progressMessage: string,
 *     sourceTitle: string|null,
 *     sourceUrl: string|null,
 *     sourceFilename: string|null,
 *     // populated once status='awaiting_user':
 *     ready?: { takeaways, promote, inline, suggestedSlug, sourceDomain },
 *     // populated once status='done':
 *     commit?: { sha, commitUrl, files }
 *     // populated when status='failed':
 *     errorMessage?: string
 *   }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { deleteFiles, triggerVercelRebuild } from "../_ingest/githubPush.js"
import { processClippingsCron, runSynthesisStandalone } from "../_ingest/pipeline.js"

// One-shot orphan from the race-condition double-ingest of "AI and the
// danger of cognitive surrender". Both passes committed to the same source
// slug; the later pass overwrote the source page but didn't promote
// Steven Shaw (the author) as an entity, so the first pass's
// wiki/people/steven-shaw.md is now unreferenced.
const COGNITIVE_SURRENDER_ORPHANS = ["wiki/people/steven-shaw.md"]

export const config = {
  maxDuration: 300,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  // Vercel cron dispatch. Vercel sends GET requests with
  // `Authorization: Bearer ${CRON_SECRET}` for scheduled jobs. We carve out a
  // cron path *before* the regular session check so the cron doesn't need a
  // user cookie. Returns 202 immediately and runs the actual work via
  // waitUntil — sequential synth+commit per clipping takes 60-90s each, far
  // longer than Vercel middleware's ~25s invocation cap.
  if (req.method === "GET" && req.query.cron === "ingest-clippings") {
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`
    if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
      res.status(401).json({ error: "Unauthorized cron" })
      return
    }
    waitUntil(
      processClippingsCron()
        .then((summary) => console.log("[cron] ingest-clippings done:", JSON.stringify(summary)))
        .catch((err) => console.error("[cron] ingest-clippings failed:", err instanceof Error ? err.message : err)),
    )
    res.status(202).json({ started: true, message: "Cron started in background; check /api/ingest/job?id=… or git history for results." })
    return
  }

  const cookieHeader = req.headers.cookie || ""
  const sessionMatch = cookieHeader.match(/(?:^|; )session=([^;]+)/)
  const sessionToken = sessionMatch?.[1]
  const session = sessionToken ? verifySessionToken(sessionToken) : null
  if (!session) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  // POST {action: "cleanup-cognitive-surrender-orphans"} — one-shot cleanup.
  // Will be removed after one successful run.
  if (req.method === "POST") {
    const peekBody = (req.body || {}) as { action?: unknown }
    if (peekBody.action === "cleanup-cognitive-surrender-orphans") {
      try {
        const result = await deleteFiles(
          COGNITIVE_SURRENDER_ORPHANS,
          `Cleanup: remove orphan entity page from cognitive-surrender duplicate ingest

The cron race condition caused two ingests of the same Economist article.
The later commit (cd2ef66) overwrote the source page but didn't promote
Steven Shaw — the earlier commit's (5102d99) wiki/people/steven-shaw.md
is unreferenced. Removing.`,
        )
        triggerVercelRebuild("cognitive-surrender orphan cleanup").catch(() => {})
        res.status(200).json({ ok: true, deleted: COGNITIVE_SURRENDER_ORPHANS.length, commit: { sha: result.sha, url: result.commitUrl } })
        return
      } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
        return
      }
    }
  }

  // POST {action: "regenerate", jobId} re-runs synthesize+compoundingFilter
  // on an existing awaiting_user job. Doesn't re-fetch the URL or
  // re-extract the PDF — operates on the persisted raw_markdown.
  if (req.method === "POST") {
    const body = (req.body || {}) as { action?: unknown; jobId?: unknown }
    if (body.action !== "regenerate") {
      res.status(400).json({ error: "Unknown POST action" })
      return
    }
    const jobId = typeof body.jobId === "string" ? body.jobId : ""
    if (!jobId) {
      res.status(400).json({ error: "jobId required" })
      return
    }
    const { data: job, error: loadErr } = await supabase
      .from("gnosis_ingest_jobs")
      .select("id, status, requested_by, raw_markdown")
      .eq("id", jobId)
      .maybeSingle()
    if (loadErr) {
      res.status(500).json({ error: loadErr.message })
      return
    }
    if (!job) {
      res.status(404).json({ error: "Job not found" })
      return
    }
    if (job.requested_by !== session.email) {
      res.status(403).json({ error: "Forbidden" })
      return
    }
    if (job.status !== "awaiting_user") {
      res.status(409).json({
        error: `Job status is ${job.status}; only awaiting_user jobs can be regenerated.`,
      })
      return
    }
    if (!job.raw_markdown) {
      res.status(409).json({
        error: "Job has no stored raw_markdown to re-synthesize from.",
      })
      return
    }
    waitUntil(runSynthesisStandalone(jobId))
    res.status(202).json({ jobId, status: "discussing" })
    return
  }

  const idRaw = req.query.id
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "id query param required" })
    return
  }

  const { data, error } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, status, progress_message, source_url, source_title, source_filename, takeaways, surfaced_entities, error_message, commit_sha, committed_files, requested_by")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[ingest/job] supabase error:", error)
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  // Only the requester can see their own jobs
  if (data.requested_by !== session.email) {
    res.status(403).json({ error: "Forbidden" })
    return
  }

  const response: Record<string, unknown> = {
    jobId: data.id,
    status: data.status,
    progressMessage: data.progress_message,
    sourceTitle: data.source_title,
    sourceUrl: data.source_url,
    sourceFilename: data.source_filename,
  }

  if (data.status === "awaiting_user" && data.surfaced_entities) {
    const surfaced = data.surfaced_entities as {
      promote?: unknown[]
      inline?: unknown[]
      suggestedSlug?: string
    }
    response.ready = {
      takeaways: data.takeaways ?? [],
      promote: surfaced.promote ?? [],
      inline: surfaced.inline ?? [],
      suggestedSlug: surfaced.suggestedSlug ?? "",
      sourceDomain: data.source_url
        ? (() => {
            try {
              return new URL(data.source_url).hostname
            } catch {
              return data.source_url ?? ""
            }
          })()
        : "pdf-upload",
    }
  }

  if (data.status === "done" && data.commit_sha) {
    response.commit = {
      sha: data.commit_sha,
      commitUrl: `https://github.com/sivaprogrowth/Gnosis/commit/${data.commit_sha}`,
      files: data.committed_files ?? [],
    }
  }

  if (data.status === "failed" && data.error_message) {
    response.errorMessage = data.error_message
  }

  res.setHeader("Cache-Control", "no-store")
  res.status(200).json(response)
}
