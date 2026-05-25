/**
 * GET /api/ingest/latest-pending
 *
 * Returns the most recent gnosis_ingest_jobs row for the authenticated user
 * that is in `awaiting_user` status — i.e. discovery finished but the user
 * hasn't yet clicked Proceed or Cancel.
 *
 * Used by the /ingest page on load to recover from a stuck SSE connection.
 * If the browser lost the connection during a long synthesize call, the
 * server-side job still finishes and ends in awaiting_user; this endpoint
 * lets the UI pick it back up and render the confirm screen.
 *
 * Response shape matches the `ready` frame from the URL pipeline.
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

  const { data, error } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, source_url, source_title, surfaced_entities, takeaways, created_at")
    .eq("requested_by", session.email)
    .eq("status", "awaiting_user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[ingest/latest-pending] supabase error:", error)
    res.status(500).json({ error: error.message })
    return
  }

  if (!data) {
    res.status(200).json({ pending: null })
    return
  }

  // Re-shape into the same payload the `ready` SSE frame carries
  const surfaced = (data.surfaced_entities ?? {}) as {
    promote?: unknown[]
    inline?: unknown[]
    suggestedSlug?: string
  }
  res.setHeader("Cache-Control", "no-store")
  res.status(200).json({
    pending: {
      jobId: data.id,
      sourceUrl: data.source_url,
      sourceTitle: data.source_title,
      sourceDomain: data.source_url ? new URL(data.source_url).hostname : "",
      suggestedSlug: surfaced.suggestedSlug ?? "",
      takeaways: data.takeaways ?? [],
      promote: surfaced.promote ?? [],
      inline: surfaced.inline ?? [],
      createdAt: data.created_at,
    },
  })
}
