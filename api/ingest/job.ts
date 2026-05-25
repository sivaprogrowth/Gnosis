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
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
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
