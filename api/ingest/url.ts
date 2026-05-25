/**
 * POST /api/ingest/url — Phase A of the URL ingest pipeline.
 *
 * Body: { url: string }
 * Response: SSE stream of pipeline frames. Final frame is `ready` with
 *           the data the UI needs to render the confirmation screen.
 *
 * 401 if unauthenticated.
 *
 * Vercel default function timeout (300s) is plenty — typical run is
 * fetch (~2s) + synthesize (~10s) + compoundingFilter (~5s) = ~17s.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { markJobFailed, runDiscoveryFromUrl } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 60, // generous cap; real runs are ~20s
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

  const body = (req.body || {}) as { url?: unknown }
  const url = typeof body.url === "string" ? body.url.trim() : ""
  if (!url) {
    res.status(400).json({ error: "url (string) required in body" })
    return
  }

  // --- SSE setup ---
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }

  let jobId: string | null = null
  try {
    const result = await runDiscoveryFromUrl(url, session.email, (frame) => {
      // Capture jobId from the first fetching frame so we can mark failed on error
      if (frame.stage === "fetching" && frame.data && typeof frame.data === "object") {
        const d = frame.data as { jobId?: string }
        if (d.jobId) jobId = d.jobId
      }
      send(frame)
    })
    send({ stage: "done", message: "Awaiting your confirmation.", data: { jobId: result.jobId } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ingest/url] error (job=${jobId}):`, msg)
    if (jobId) await markJobFailed(jobId, msg).catch(() => {})
    send({ stage: "error", message: msg, data: { jobId } })
  } finally {
    res.write("data: [DONE]\n\n")
    res.end()
  }
}
