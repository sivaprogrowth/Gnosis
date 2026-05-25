/**
 * GET /api/library/highlights?book_id=<id>
 *
 * Returns every highlight for a single Readwise book. Used by the Library
 * drill-down view. Same JWT cookie session check as /api/library/books.
 *
 * Highlight payload is trimmed to the fields the UI actually renders.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { fetchHighlights } from "../_ingest/readwise.js"

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

  const bookIdRaw = req.query.book_id
  const bookIdStr = Array.isArray(bookIdRaw) ? bookIdRaw[0] : bookIdRaw
  const bookId = Number(bookIdStr)
  if (!bookId || !Number.isFinite(bookId)) {
    res.status(400).json({ error: "book_id query param required (number)" })
    return
  }

  try {
    const highlights = await fetchHighlights(bookId)
    const trimmed = highlights.map((h) => ({
      id: h.id,
      text: h.text,
      note: h.note,
      location: h.location,
      location_type: h.location_type,
      highlighted_at: h.highlighted_at,
      color: h.color,
      tags: h.tags.map((t) => t.name),
    }))

    // Sort by location (when available) — restores reading order
    trimmed.sort((a, b) => {
      if (a.location != null && b.location != null) return a.location - b.location
      if (a.location != null) return -1
      if (b.location != null) return 1
      return 0
    })

    res.setHeader("Cache-Control", "private, max-age=300") // 5-min client cache
    res.status(200).json({
      book_id: bookId,
      count: trimmed.length,
      highlights: trimmed,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[library/highlights] book_id=${bookId} error:`, msg)
    res.status(500).json({ error: msg })
  }
}
