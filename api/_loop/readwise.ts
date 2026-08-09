/**
 * readwise.ts — flat highlight fetcher for the learning loop.
 *
 * Uses the Readwise v2 export API (same READWISE_TOKEN the Reader cron uses;
 * one account token serves both v2 and v3). Export returns books with nested
 * highlights; we flatten to one row per highlight because every loop consumer
 * (synthesis clustering, resurface ranking, mirror stats) thinks in
 * highlights, not books.
 *
 * `updatedAfter` narrows server-side, but we also filter client-side on
 * `highlighted_at` when a window is given — export's updatedAfter is
 * book-level-ish and can include a book's older highlights.
 */

export interface Highlight {
  text: string
  note: string | null
  title: string
  author: string | null
  category: string // "books" | "articles" | "tweets" | "podcasts" | ...
  highlightedAt: string | null
  tags: string[]
}

const EXPORT_URL = "https://readwise.io/api/v2/export/"
const MAX_PAGES = 30 // safety backstop; the full library is ~a handful of pages

interface ExportHighlight {
  text?: string
  note?: string | null
  highlighted_at?: string | null
  tags?: Array<{ name?: string }>
}
interface ExportBook {
  title?: string
  author?: string | null
  category?: string
  highlights?: ExportHighlight[]
}

export async function fetchHighlights(
  opts: {
    /** ISO timestamp; when set, only highlights at/after this instant are returned. */
    since?: string
  } = {},
): Promise<Highlight[]> {
  const token = (process.env.READWISE_TOKEN || "").trim()
  if (!token) throw new Error("READWISE_TOKEN is not set on the server")

  const out: Highlight[] = []
  let cursor: string | null = null
  const sinceMs = opts.since ? Date.parse(opts.since) : null

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams()
    if (opts.since) params.set("updatedAfter", opts.since)
    if (cursor) params.set("pageCursor", cursor)
    const res = await fetch(`${EXPORT_URL}?${params}`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (res.status === 429) {
      // Rate limited — Readwise sends Retry-After in seconds. Wait once, retry
      // the same cursor; the loop's page counter still bounds total work.
      const wait = Math.min(Number(res.headers.get("retry-after")) || 5, 30)
      await new Promise((r) => setTimeout(r, wait * 1000))
      page--
      continue
    }
    if (!res.ok) throw new Error(`Readwise export returned HTTP ${res.status}`)
    const data = (await res.json()) as { results?: ExportBook[]; nextPageCursor?: string | null }

    for (const book of data.results ?? []) {
      for (const h of book.highlights ?? []) {
        const text = (h.text || "").trim()
        if (!text) continue
        if (sinceMs && h.highlighted_at && Date.parse(h.highlighted_at) < sinceMs) continue
        out.push({
          text,
          note: h.note?.trim() || null,
          title: book.title || "Untitled",
          author: book.author || null,
          category: book.category || "unknown",
          highlightedAt: h.highlighted_at ?? null,
          tags: (h.tags ?? []).map((t) => t.name || "").filter(Boolean),
        })
      }
    }

    cursor = data.nextPageCursor ?? null
    if (!cursor) break
  }
  return out
}
