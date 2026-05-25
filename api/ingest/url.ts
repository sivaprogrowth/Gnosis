/**
 * POST /api/ingest/url — start a URL ingest.
 *
 * Body: { url: string }
 * Response (202): { jobId: string }
 *
 * Returns immediately with the job id. Discovery (fetch → synthesize →
 * compoundingFilter) runs in the background via `waitUntil`, which keeps the
 * function instance alive after the response is sent. The frontend polls
 * /api/ingest/job?id=<jobId> for progress and final state.
 *
 * Why polling instead of SSE: long synthesize calls (60-180s) reliably drop
 * SSE connections on the edge network even with a 15s heartbeat. Polling
 * doesn't depend on a persistent connection.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { runDiscoveryFromUrl } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
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

  const body = (req.body || {}) as { url?: unknown; force?: unknown }
  const url = typeof body.url === "string" ? body.url.trim() : ""
  const force = body.force === true
  if (!url) {
    res.status(400).json({ error: "url (string) required in body" })
    return
  }

  // Duplicate guard: bail if this URL was already ingested (status=done).
  // Caller can pass force:true to re-ingest, which will overwrite the source
  // page. Earlier we hit this case silently and lost 10 entity pages.
  if (!force) {
    const { data: existing, error: dupErr } = await supabase
      .from("gnosis_ingest_jobs")
      .select("id, commit_sha, source_title, created_at")
      .eq("source_url", url)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (dupErr) console.warn("[ingest/url] dedup check error:", dupErr.message)
    if (existing) {
      res.status(409).json({
        error: "Already ingested",
        existing: {
          jobId: existing.id,
          commitSha: existing.commit_sha,
          commitUrl: existing.commit_sha
            ? `https://github.com/sivaprogrowth/Gnosis/commit/${existing.commit_sha}`
            : null,
          sourceTitle: existing.source_title,
          createdAt: existing.created_at,
        },
        hint: "Re-submit with { force: true } to ingest again (will overwrite the existing source page).",
      })
      return
    }
  }

  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "url",
      source_url: url,
      status: "queued",
      progress_message: "Queued",
      requested_by: session.email,
    })
    .select("id")
    .single()
  if (jobErr || !job) {
    console.error("[ingest/url] could not create job:", jobErr)
    res.status(500).json({ error: `Could not create ingest job: ${jobErr?.message}` })
    return
  }

  // Fire pipeline in the background; waitUntil keeps the function alive
  // after we return the 202 response.
  waitUntil(runDiscoveryFromUrl(url, job.id))

  res.status(202).json({ jobId: job.id })
}
