/**
 * POST /api/ingest/url — start a URL or clipping ingest.
 *
 * Body shapes:
 *   { url: string }                                 — fetch + synthesize
 *   { markdown: string, title: string,
 *     sourceUrl?: string }                          — clipping: skip fetch,
 *                                                     synthesize the provided
 *                                                     markdown directly
 *
 * Response (202): { jobId: string }
 *
 * Returns immediately with the job id. Discovery runs in the background via
 * `waitUntil`. The frontend polls /api/ingest/job?id=<jobId>.
 *
 * Polling instead of SSE because long synthesize calls (60-180s) reliably
 * drop SSE connections on the edge network even with a heartbeat.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { runDiscoveryFromUrl, runSynthesisStandalone } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
}

const MIN_CLIPPING_CHARS = 200 // anything shorter isn't worth synthesizing

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

  const body = (req.body || {}) as {
    url?: unknown
    markdown?: unknown
    title?: unknown
    sourceUrl?: unknown
    force?: unknown
  }
  const url = typeof body.url === "string" ? body.url.trim() : ""
  const markdown = typeof body.markdown === "string" ? body.markdown : ""
  const clippingTitle = typeof body.title === "string" ? body.title.trim() : ""
  const clippingSourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : ""
  const force = body.force === true

  if (!url && !markdown) {
    res.status(400).json({ error: "Either url (URL fetch) or markdown (clipping) required" })
    return
  }
  if (markdown && !clippingTitle) {
    res.status(400).json({ error: "title required when ingesting a clipping" })
    return
  }
  if (markdown && markdown.trim().length < MIN_CLIPPING_CHARS) {
    res.status(400).json({
      error: `Clipping is only ${markdown.trim().length} chars — paste at least ${MIN_CLIPPING_CHARS} chars of content.`,
    })
    return
  }

  // -------- URL path --------
  if (url) {
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
    waitUntil(runDiscoveryFromUrl(url, job.id))
    res.status(202).json({ jobId: job.id })
    return
  }

  // -------- Clipping path --------
  // Dedup by title + sourceUrl (if provided). Falls back to title-only.
  if (!force) {
    const dupQuery = supabase
      .from("gnosis_ingest_jobs")
      .select("id, commit_sha, source_title, created_at")
      .eq("source_type", "clipping")
      .eq("source_title", clippingTitle)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
    if (clippingSourceUrl) dupQuery.eq("source_url", clippingSourceUrl)
    const { data: existing, error: dupErr } = await dupQuery.maybeSingle()
    if (dupErr) console.warn("[ingest/url clipping] dedup check error:", dupErr.message)
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
        hint: "Re-submit with { force: true } to ingest again.",
      })
      return
    }
  }

  // Job row gets raw_markdown pre-populated so runSynthesisOnly can skip the
  // fetch step and go straight to synthesize → compoundingFilter → awaiting_user.
  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "clipping",
      source_url: clippingSourceUrl || null,
      source_title: clippingTitle,
      raw_markdown: markdown,
      status: "discussing", // start past 'fetching' since there's nothing to fetch
      progress_message: "Synthesizing source page + entities…",
      requested_by: session.email,
    })
    .select("id")
    .single()
  if (jobErr || !job) {
    console.error("[ingest/url clipping] could not create job:", jobErr)
    res.status(500).json({ error: `Could not create ingest job: ${jobErr?.message}` })
    return
  }
  waitUntil(runSynthesisStandalone(job.id))
  res.status(202).json({ jobId: job.id })
}
