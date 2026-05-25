/**
 * POST /api/ingest/continue — Phase B of the ingest pipeline.
 *
 * Body: { job_id: string, decision: "proceed" | "cancel" }
 * Response: SSE stream of pipeline frames. Final frame is `done` with
 *           the commit SHA + file blob URLs.
 *
 * 401 if unauthenticated. 400 if the job isn't in awaiting_user state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { markJobCancelled, markJobFailed, runCommit } from "../_ingest/pipeline.js"

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

  const body = (req.body || {}) as { job_id?: unknown; decision?: unknown }
  const jobId = typeof body.job_id === "string" ? body.job_id : ""
  const decision = typeof body.decision === "string" ? body.decision : ""
  if (!jobId) {
    res.status(400).json({ error: "job_id (string) required" })
    return
  }
  if (decision !== "proceed" && decision !== "cancel") {
    res.status(400).json({ error: "decision must be 'proceed' or 'cancel'" })
    return
  }

  if (decision === "cancel") {
    await markJobCancelled(jobId)
    res.status(200).json({ ok: true, cancelled: true, jobId })
    return
  }

  // --- SSE setup (only for the proceed path) ---
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }

  // Heartbeat to survive edge idle timeouts during the GitHub commit step
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n")
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }, 15_000)

  try {
    await runCommit(jobId, send)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ingest/continue] error (job=${jobId}):`, msg)
    await markJobFailed(jobId, msg).catch(() => {})
    send({ stage: "error", message: msg, data: { jobId } })
  } finally {
    clearInterval(heartbeat)
    res.write("data: [DONE]\n\n")
    res.end()
  }
}
