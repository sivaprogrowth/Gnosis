/**
 * reader.ts — Readwise *Reader* v3 API client (read-it-later documents).
 *
 * Distinct from readwise.ts, which speaks the v2 books/highlights API. Reader
 * documents live on a separate v3 surface:
 *   - LIST   GET   https://readwise.io/api/v3/list/        (20/min per token)
 *   - UPDATE PATCH https://readwise.io/api/v3/update/<id>/ (50/min per token)
 *
 * Auth: same $READWISE_TOKEN, "Token <key>" header (Reader v3 is not JWT).
 *
 * Used by processReaderCron() in pipeline.ts to auto-ingest documents the user
 * tags `gnosis` in Reader. The cron filters server-side with `?tag=gnosis`, so
 * we only ever pull the *pending* set — on completion the trigger tag is
 * removed (see pipeline.ts markReaderDone), which keeps the query bounded.
 *
 * Docs reference: https://readwise.io/reader_api
 */

const READER_BASE = "https://readwise.io/api/v3"

/**
 * A Reader document as returned by the LIST endpoint. Only the fields the cron
 * needs are typed; the API returns many more.
 *
 * `tags` is a dict keyed by tag key (e.g. {"gnosis": {...}}), NOT an array —
 * `{}` when the document has no tags. Use readerTagKeys() to get the keys.
 *
 * `parent_id` is non-null for highlights/notes (which are also "documents" in
 * Reader); the cron skips those.
 */
export interface ReaderDocument {
  id: string
  url: string // Reader's internal read URL
  source_url: string | null // original article URL
  title: string | null
  author: string | null
  site_name: string | null
  category: string | null // article | email | rss | pdf | epub | tweet | video | ...
  location: string | null // new | later | shortlist | archive | feed
  tags: Record<string, unknown> | null
  word_count: number | null
  summary: string | null
  html_content?: string | null // only present when withHtmlContent=true
  parent_id: string | null
  saved_at: string | null
  created_at: string | null
}

interface ListResponse {
  count: number
  nextPageCursor: string | null
  results: ReaderDocument[]
}

function token(): string {
  const t = process.env.READWISE_TOKEN
  if (!t) throw new Error("READWISE_TOKEN is not set on the server")
  return t
}

/**
 * Fetch with one retry on 429, respecting the Retry-After header. Reader's
 * limits (20/min list, 50/min update) are generous for the pending set, but a
 * burst of updates can still brush the ceiling, so we back off once.
 */
async function readerFetch(url: string, init: RequestInit): Promise<Response> {
  const headers = {
    Authorization: `Token ${token()}`,
    "Content-Type": "application/json",
    ...(init.headers || {}),
  }
  let res = await fetch(url, { ...init, headers })
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "5")
    const waitMs = Math.min(Math.max(retryAfter, 1), 60) * 1000
    await new Promise((r) => setTimeout(r, waitMs))
    res = await fetch(url, { ...init, headers })
  }
  return res
}

/**
 * List every Reader document matching a location and/or tag, following
 * pageCursor pagination to exhaustion. `withHtmlContent` pulls the cleaned
 * article HTML inline so the cron doesn't have to re-fetch the source.
 */
export async function listReaderDocs(opts: {
  location?: string
  tag?: string
  withHtmlContent?: boolean
}): Promise<ReaderDocument[]> {
  const out: ReaderDocument[] = []
  let cursor: string | null = null
  do {
    const params = new URLSearchParams()
    if (opts.location) params.set("location", opts.location)
    if (opts.tag) params.set("tag", opts.tag)
    if (opts.withHtmlContent) params.set("withHtmlContent", "true")
    if (cursor) params.set("pageCursor", cursor)

    const res = await readerFetch(`${READER_BASE}/list/?${params.toString()}`, {
      method: "GET",
    })
    if (!res.ok) {
      throw new Error(`Reader LIST ${res.status}: ${await res.text()}`)
    }
    const page = (await res.json()) as ListResponse
    out.push(...page.results)
    cursor = page.nextPageCursor
  } while (cursor)
  return out
}

/**
 * Fetch a single Reader document by id, with its cleaned html_content inline.
 * Used by the realtime webhook path: the webhook payload carries the document
 * id + tags but `content` is null, so we re-fetch to get usable content (and
 * the freshest tag set) before ingesting. Returns null if not found.
 */
export async function getReaderDocById(
  id: string,
  withHtmlContent = true,
): Promise<ReaderDocument | null> {
  const params = new URLSearchParams()
  params.set("id", id)
  if (withHtmlContent) params.set("withHtmlContent", "true")
  const res = await readerFetch(`${READER_BASE}/list/?${params.toString()}`, { method: "GET" })
  if (!res.ok) {
    throw new Error(`Reader LIST by id ${res.status}: ${await res.text()}`)
  }
  const page = (await res.json()) as ListResponse
  return page.results[0] ?? null
}

/**
 * Update a Reader document. Used to archive + retag after ingest.
 *
 * NOTE: `tags` REPLACES the document's entire tag set (Reader has no
 * append-a-tag endpoint), so callers must pass the full desired list.
 */
export async function updateReaderDoc(
  id: string,
  patch: { location?: string; tags?: string[]; seen?: boolean },
): Promise<void> {
  const res = await readerFetch(`${READER_BASE}/update/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(`Reader UPDATE ${res.status} for ${id}: ${await res.text()}`)
  }
}

/** The keys of a document's current tags dict ([] when it has none). */
export function readerTagKeys(doc: ReaderDocument): string[] {
  return doc.tags ? Object.keys(doc.tags) : []
}
