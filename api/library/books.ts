/**
 * GET /api/library/books
 *
 * Returns the user's Readwise book library, annotated with two badges:
 *   - drained: a source page already exists in the wiki for this book
 *   - queued:  the book has a pending row in public.gnosis_drain_queue
 *
 * Drained detection: match book title (normalized) against the title of any
 * type=source page in the in-memory page index. Cheap, no extra I/O on warm
 * instances. False positives (two books with the same title) are accepted
 * for v1; can switch to a readwise_book_id frontmatter field later.
 *
 * 401 if the request isn't authenticated. Same JWT cookie shape as /api/ask.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { fetchBooks } from "../_ingest/readwise.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  // Auth gate (defence in depth — middleware also blocks)
  const cookieHeader = req.headers.cookie || ""
  const sessionMatch = cookieHeader.match(/(?:^|; )session=([^;]+)/)
  const sessionToken = sessionMatch?.[1]
  const session = sessionToken ? verifySessionToken(sessionToken) : null
  if (!session) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const [books, queueRes] = await Promise.all([
      fetchBooks(),
      supabase
        .from("gnosis_drain_queue")
        .select("readwise_book_id, requested_class, status, requested_at")
        .eq("status", "pending"),
    ])

    if (queueRes.error) {
      console.error("[library/books] supabase queue read failed:", queueRes.error)
    }
    const queued = new Set<number>(
      (queueRes.data ?? []).map((r) => Number(r.readwise_book_id)),
    )

    // Drained source pages: build a Set of normalized titles, including aliases.
    const index = getPageIndex()
    const drainedTitles = new Set<string>()
    for (const page of index.pages) {
      if (page.type !== "source") continue
      drainedTitles.add(normTitle(page.title))
      for (const a of page.aliases) drainedTitles.add(normTitle(a))
    }

    const annotated = books.map((b) => {
      const titleKey = normTitle(b.title)
      return {
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        cover_image_url: b.cover_image_url,
        num_highlights: b.num_highlights,
        last_highlight_at: b.last_highlight_at,
        updated: b.updated,
        source_url: b.source_url,
        tags: b.tags.map((t) => t.name),
        drained: drainedTitles.has(titleKey),
        queued: queued.has(b.id),
      }
    })

    // Sort: queued first, then most recently highlighted, then by title
    annotated.sort((a, b) => {
      if (a.queued !== b.queued) return a.queued ? -1 : 1
      const at = a.last_highlight_at ? Date.parse(a.last_highlight_at) : 0
      const bt = b.last_highlight_at ? Date.parse(b.last_highlight_at) : 0
      if (at !== bt) return bt - at
      return a.title.localeCompare(b.title)
    })

    res.setHeader("Cache-Control", "private, max-age=60") // 1-min client cache
    res.status(200).json({
      count: annotated.length,
      books: annotated,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[library/books] error:", msg)
    res.status(500).json({ error: msg })
  }
}
