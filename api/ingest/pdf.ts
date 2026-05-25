/**
 * POST /api/ingest/pdf — start a PDF ingest. Dispatches by body shape:
 *
 *   1. `body.type === 'blob.*'` → Vercel Blob client-upload handshake.
 *      Returns a signed upload token so the browser can PUT the PDF directly
 *      to our Blob store, bypassing Vercel's 4.5 MB function body limit.
 *
 *   2. `body.contentBase64` → small file path (≤3.5 MB PDF as base64 in JSON).
 *      Kept for backwards compat and as a no-Blob-roundtrip fast path.
 *
 *   3. `body.blobUrl` → large file path. Server fetches the PDF from the
 *      blob URL, runs the discovery pipeline, then deletes the blob.
 *
 * All three are auth-gated. Responses for (2) and (3) are 202 {jobId} so
 * the frontend can poll /api/ingest/job for progress.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { del, head } from "@vercel/blob"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { runDiscoveryFromPdf } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
}

const MAX_INLINE_BYTES = 3.5 * 1024 * 1024 // base64 path
const MAX_BLOB_BYTES = 50 * 1024 * 1024 // Vercel Blob path

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

  const body = (req.body || {}) as Record<string, unknown>

  // ---- 1. Vercel Blob client-upload handshake ----
  if (typeof body.type === "string" && body.type.startsWith("blob.")) {
    try {
      const jsonResponse = await handleUpload({
        body: body as unknown as HandleUploadBody,
        request: req as unknown as Request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_BLOB_BYTES,
          // Bind the upload token to the user's email so we can audit later
          tokenPayload: JSON.stringify({ email: session.email }),
          addRandomSuffix: true, // keep slugs unique to prevent collisions
        }),
        onUploadCompleted: async () => {
          // No-op — frontend will POST { blobUrl } next to actually start the ingest.
        },
      })
      res.status(200).json(jsonResponse)
      return
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[ingest/pdf blob-handshake] error:", msg)
      res.status(400).json({ error: msg })
      return
    }
  }

  // ---- shared validation ----
  const filename = typeof body.filename === "string" ? body.filename.trim() : ""
  const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : ""
  const blobUrl = typeof body.blobUrl === "string" ? body.blobUrl.trim() : ""
  const force = body.force === true

  if (!filename) {
    res.status(400).json({ error: "filename required" })
    return
  }
  if (!filename.toLowerCase().endsWith(".pdf")) {
    res.status(400).json({ error: "filename must end with .pdf" })
    return
  }
  if (!contentBase64 && !blobUrl) {
    res.status(400).json({ error: "Either contentBase64 or blobUrl required" })
    return
  }

  // Duplicate guard. Filename isn't a perfect signal for PDF (two different
  // PDFs could share a name) but it's the only stable id we have.
  if (!force) {
    const { data: existing, error: dupErr } = await supabase
      .from("gnosis_ingest_jobs")
      .select("id, commit_sha, source_title, created_at")
      .eq("source_filename", filename)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (dupErr) console.warn("[ingest/pdf] dedup check error:", dupErr.message)
    if (existing) {
      // If a blob was uploaded, delete it since we're rejecting the ingest
      if (blobUrl) {
        del(blobUrl).catch((e) =>
          console.warn("[ingest/pdf] could not delete rejected-dup blob:", e instanceof Error ? e.message : e),
        )
      }
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

  // ---- 2. Small file path (base64) ----
  let bytes: Buffer
  if (contentBase64) {
    const cleaned = contentBase64.replace(/^data:application\/pdf;base64,/, "")
    try {
      bytes = Buffer.from(cleaned, "base64")
    } catch {
      res.status(400).json({ error: "Could not decode base64 PDF content" })
      return
    }
    if (bytes.byteLength === 0) {
      res.status(400).json({ error: "Decoded PDF is empty" })
      return
    }
    if (bytes.byteLength > MAX_INLINE_BYTES) {
      res.status(413).json({
        error: `PDF is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB — for files over ${(MAX_INLINE_BYTES / 1024 / 1024).toFixed(1)}MB, use the Blob upload flow (the UI handles this automatically).`,
      })
      return
    }
  } else {
    // ---- 3. Large file path (blob URL) ----
    // Verify the blob exists + size is reasonable before queueing the job
    try {
      const meta = await head(blobUrl)
      if (meta.size > MAX_BLOB_BYTES) {
        del(blobUrl).catch(() => {})
        res.status(413).json({
          error: `PDF is ${(meta.size / 1024 / 1024).toFixed(1)}MB — max ${(MAX_BLOB_BYTES / 1024 / 1024).toFixed(0)}MB.`,
        })
        return
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      res.status(400).json({ error: `Could not access blob URL: ${msg}` })
      return
    }

    // Fetch the bytes. The blob is on our private store; @vercel/blob's
    // public blob URLs are still fetchable via standard HTTP.
    let fetchRes: Response
    try {
      fetchRes = await fetch(blobUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      res.status(502).json({ error: `Could not fetch blob: ${msg}` })
      return
    }
    if (!fetchRes.ok) {
      res.status(502).json({ error: `Blob fetch returned HTTP ${fetchRes.status}` })
      return
    }
    const arrBuf = await fetchRes.arrayBuffer()
    bytes = Buffer.from(arrBuf)
    if (bytes.byteLength === 0) {
      res.status(400).json({ error: "Fetched blob is empty" })
      return
    }
  }

  // ---- create job + dispatch pipeline in the background ----
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
    if (blobUrl) del(blobUrl).catch(() => {})
    res.status(500).json({ error: `Could not create ingest job: ${jobErr?.message}` })
    return
  }

  const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  waitUntil(
    runDiscoveryFromPdf(uint8, filename, job.id).finally(() => {
      // Clean up the blob regardless of pipeline outcome — we have the bytes
      // and the source page lives in wiki-archive now.
      if (blobUrl) {
        del(blobUrl).catch((e) =>
          console.warn(`[ingest/pdf] could not delete blob ${blobUrl}:`, e instanceof Error ? e.message : e),
        )
      }
    }),
  )

  res.status(202).json({ jobId: job.id })
}
