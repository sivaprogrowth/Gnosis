/**
 * POST /api/ingest/pdf — start a PDF ingest.
 *
 * Body: { filename: string, contentBase64: string }
 * Response (202): { jobId: string }
 *
 * Same pattern as /api/ingest/url: return jobId immediately, run discovery
 * in the background, frontend polls /api/ingest/job for state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { runDiscoveryFromPdf } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
}

const MAX_PDF_BYTES = 3.5 * 1024 * 1024

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

  const { data: job, error: jobErr } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "pdf",
      source_filename: filename,
      status: "queued",
      progress_message: "Queued",
      requested_by: session.email,
    })
    .select("id")
    .single()
  if (jobErr || !job) {
    console.error("[ingest/pdf] could not create job:", jobErr)
    res.status(500).json({ error: `Could not create ingest job: ${jobErr?.message}` })
    return
  }

  const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  waitUntil(runDiscoveryFromPdf(uint8, filename, job.id))

  res.status(202).json({ jobId: job.id })
}
