/**
 * POST /api/ingest/pdf — Phase A of the PDF ingest pipeline.
 *
 * Body: { filename: string, contentBase64: string }
 * Response: SSE stream of pipeline frames. Same shape as /api/ingest/url.
 *
 * Why JSON+base64 instead of multipart: multipart parsing in Vercel Node
 * functions requires bodyParser:false + busboy/formidable; base64 in a JSON
 * body uses the default parser and is dead simple on both ends. The cost
 * is ~33% size inflation. Vercel default body limit is 4.5MB which leaves
 * ~3MB usable PDF — fine for blog posts, short essays, and academic papers
 * up to ~40 pages. Larger PDFs we can route via Vercel Blob in v2.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { markJobFailed, runDiscoveryFromPdf } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
  api: {
    // Allow larger JSON bodies so a base64 PDF up to ~4MB fits
    bodyParser: { sizeLimit: "5mb" },
  },
}

const MAX_PDF_BYTES = 3.5 * 1024 * 1024 // ~3.5MB pdf → ~4.7MB base64

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

  const body = (req.body || {}) as { filename?: unknown; contentBase64?: unknown }
  const filename = typeof body.filename === "string" ? body.filename.trim() : ""
  const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : ""

  if (!filename) {
    res.status(400).json({ error: "filename required" })
    return
  }
  if (!filename.toLowerCase().endsWith(".pdf")) {
    res.status(400).json({ error: "filename must end with .pdf" })
    return
  }
  if (!contentBase64) {
    res.status(400).json({ error: "contentBase64 required" })
    return
  }

  // Strip data: URL prefix if the client sent the full data URL
  const cleaned = contentBase64.replace(/^data:application\/pdf;base64,/, "")
  let bytes: Buffer
  try {
    bytes = Buffer.from(cleaned, "base64")
  } catch (e) {
    res.status(400).json({ error: "Could not decode base64 PDF content" })
    return
  }
  if (bytes.byteLength === 0) {
    res.status(400).json({ error: "Decoded PDF is empty" })
    return
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    res.status(413).json({
      error: `PDF is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB — max ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(1)}MB. Larger files will arrive in v2 (Vercel Blob).`,
    })
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

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n")
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }, 15_000)

  let jobId: string | null = null
  try {
    const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const result = await runDiscoveryFromPdf(uint8, filename, session.email, (frame) => {
      if (frame.stage === "fetching" && frame.data && typeof frame.data === "object") {
        const d = frame.data as { jobId?: string }
        if (d.jobId) jobId = d.jobId
      }
      send(frame)
    })
    send({ stage: "done", message: "Awaiting your confirmation.", data: { jobId: result.jobId } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ingest/pdf] error (job=${jobId}):`, msg)
    if (jobId) await markJobFailed(jobId, msg).catch(() => {})
    send({ stage: "error", message: msg, data: { jobId } })
  } finally {
    clearInterval(heartbeat)
    res.write("data: [DONE]\n\n")
    res.end()
  }
}
