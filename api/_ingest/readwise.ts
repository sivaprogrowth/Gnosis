/**
 * Readwise v2 API client — minimal shape needed by the Library UI.
 *
 * Mirrors scripts/readwise-state.py:fetch_readwise_books on the vault side
 * (~/Projects/gnosis/scripts/) but in TS so it can run inside a Vercel function.
 *
 * Auth: $READWISE_TOKEN env var ("Token <key>" header — Readwise v2 is *not* JWT).
 *
 * Pagination: each list endpoint returns {count, next, previous, results}.
 * `next` is a full URL with the next page's cursor; we follow it until null.
 */

const READWISE_BASE = "https://readwise.io/api/v2"
const PAGE_SIZE = 1000 // max per the Readwise docs

export interface ReadwiseBook {
  id: number
  title: string
  author: string | null
  category: string // "books" | "articles" | "tweets" | "podcasts" | "supplementals"
  source: string | null
  num_highlights: number
  last_highlight_at: string | null
  updated: string | null
  cover_image_url: string | null
  highlights_url: string | null
  source_url: string | null
  asin: string | null
  tags: Array<{ id: number; name: string }>
  document_note: string | null
}

export interface ReadwiseHighlight {
  id: number
  text: string
  note: string | null
  location: number | null
  location_type: string | null
  highlighted_at: string | null
  url: string | null
  color: string | null
  updated: string | null
  book_id: number
  tags: Array<{ id: number; name: string }>
}

function token(): string {
  const t = process.env.READWISE_TOKEN
  if (!t) throw new Error("READWISE_TOKEN is not set on the server")
  return t
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Token ${token()}` },
  })
  if (!res.ok) {
    throw new Error(`Readwise ${res.status} for ${url}: ${await res.text()}`)
  }
  return (await res.json()) as T
}

interface PageResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function fetchAllPages<T>(initialUrl: string): Promise<T[]> {
  const out: T[] = []
  let url: string | null = initialUrl
  while (url) {
    const page: PageResponse<T> = await getJson(url)
    out.push(...page.results)
    url = page.next
  }
  return out
}

/** Fetch every book in the user's Readwise library (category=books). */
export async function fetchBooks(): Promise<ReadwiseBook[]> {
  const url = `${READWISE_BASE}/books/?page_size=${PAGE_SIZE}&category=books`
  return fetchAllPages<ReadwiseBook>(url)
}

/** Fetch all highlights for a single book. */
export async function fetchHighlights(bookId: number): Promise<ReadwiseHighlight[]> {
  const url = `${READWISE_BASE}/highlights/?page_size=${PAGE_SIZE}&book_id=${bookId}`
  return fetchAllPages<ReadwiseHighlight>(url)
}
