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
import { resolvePublicOrigin } from "../_lib/publicOrigin.js"
import {
  processClippingsCron,
  processReaderCron,
  runSynthesisStandalone,
} from "../_ingest/pipeline.js"

/**
 * Re-invoke this endpoint for the next drain wave.
 *
 * Returns true only when the next wave was actually accepted. Every non-2xx is
 * reported as a failure: `fetch` resolves (it does not reject) on a 302 or a
 * 401, so a chain being bounced by Deployment Protection or a stale secret
 * would otherwise be indistinguishable from a healthy one — which is exactly
 * how the clippings cron spent two weeks running a single wave a day while
 * every job row read `done`.
 *
 * `redirect: "manual"` is load-bearing. Following the SSO redirect lands on a
 * 200 HTML login page, so `r.ok` would be true and the bug would stay hidden.
 */
async function chainNextWave(
  req: VercelRequest,
  cron: string,
  wave: number,
  authorization: string,
): Promise<boolean> {
  const nextUrl = `${resolvePublicOrigin(req)}/api/ingest/job?cron=${cron}&wave=${wave}`
  try {
    const r = await fetch(nextUrl, {
      method: "GET",
      headers: { Authorization: authorization },
      redirect: "manual",
    })
    if (!r.ok) {
      console.error(
        `[cron] ${cron} chain wave ${wave} REJECTED: ${r.status} ${r.headers.get("location") ?? ""} (${nextUrl}) — the rest of the queue will NOT drain this run`,
      )
      return false
    }
    console.log(`[cron] ${cron} chained wave ${wave}`)
    return true
  } catch (e) {
    console.error(
      `[cron] ${cron} chain wave ${wave} failed:`,
      e instanceof Error ? e.message : e,
    )
    return false
  }
}

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
    const clipWaveRaw = Array.isArray(req.query.wave) ? req.query.wave[0] : req.query.wave
    const clipWave = Math.max(0, Number(clipWaveRaw) || 0)
    const MAX_CLIP_WAVES = 50 // backstop; a real backlog drains long before this
    waitUntil(
      processClippingsCron()
        .then(async (summary) => {
          console.log(
            `[cron] ingest-clippings wave ${clipWave} done:`,
            JSON.stringify(summary),
          )
          // Self-chain only if this wave made progress AND work remains.
          if (summary.remaining > 0 && summary.processed > 0 && clipWave < MAX_CLIP_WAVES) {
            console.log(
              `[cron] ingest-clippings chaining wave ${clipWave + 1} (${summary.remaining} remaining)`,
            )
            await chainNextWave(req, "ingest-clippings", clipWave + 1, expected)
          } else if (summary.remaining > 0) {
            console.warn(
              `[cron] ingest-clippings stopping with ${summary.remaining} remaining (processed=${summary.processed}, wave=${clipWave}) — next daily run will resume`,
            )
          }
        })
        .catch((err) =>
          console.error(
            "[cron] ingest-clippings failed:",
            err instanceof Error ? err.message : err,
          ),
        ),
    )
    res.status(202).json({
      started: true,
      wave: clipWave,
      message: "Cron started in background; check git history for results.",
    })
    return
  }

  // Reader auto-ingest cron. Same dispatch shape as ingest-clippings, plus
  // self-chaining: when a wave hits its time budget with docs still pending,
  // it re-invokes this same endpoint so the next wave continues draining. This
  // is how we get uncapped throughput on a 300s-bounded function. A `wave`
  // counter backstops runaway recursion (e.g. a doc that keeps failing without
  // shedding its trigger tag — though markReaderError should prevent that).
  if (req.method === "GET" && req.query.cron === "ingest-reader") {
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`
    if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
      res.status(401).json({ error: "Unauthorized cron" })
      return
    }
    const waveRaw = Array.isArray(req.query.wave) ? req.query.wave[0] : req.query.wave
    const wave = Math.max(0, Number(waveRaw) || 0)
    const MAX_WAVES = 50 // backstop; a real burst empties long before this
    waitUntil(
      processReaderCron()
        .then(async (summary) => {
          console.log(`[cron] ingest-reader wave ${wave} done:`, JSON.stringify(summary))
          // Self-chain only if this wave made progress AND work remains.
          if (summary.remaining > 0 && summary.processed > 0 && wave < MAX_WAVES) {
            console.log(
              `[cron] ingest-reader chaining wave ${wave + 1} (${summary.remaining} remaining)`,
            )
            await chainNextWave(req, "ingest-reader", wave + 1, expected)
          } else if (summary.remaining > 0) {
            console.warn(
              `[cron] ingest-reader stopping with ${summary.remaining} remaining (processed=${summary.processed}, wave=${wave}) — next hourly run will resume`,
            )
          }
        })
        .catch((err) =>
          console.error("[cron] ingest-reader failed:", err instanceof Error ? err.message : err),
        ),
    )
    res.status(202).json({ started: true, wave, message: "Reader cron started in background." })
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
    .select(
      "id, status, progress_message, source_url, source_title, source_filename, takeaways, surfaced_entities, error_message, commit_sha, committed_files, requested_by",
    )
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
