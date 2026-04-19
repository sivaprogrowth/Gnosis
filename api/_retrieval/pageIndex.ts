/**
 * In-memory page index for the Gnosis wiki.
 *
 * Walks content/, parses each .md with gray-matter, extracts structured fields
 * into PageRecord shape. Lazily built on first call, cached at module scope for
 * the lifetime of the serverless function warm instance.
 */

import matter from "gray-matter"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { tokenize } from "./tokenize"
import type { PageIndex, PageRecord, PageType, PageSubtype } from "./types"

const VALID_TYPES: ReadonlySet<string> = new Set(["source", "entity", "concept", "query"])
const VALID_SUBTYPES: ReadonlySet<string> = new Set(["fact", "take", "object"])

function toStringArray(v: unknown): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[]
  if (typeof v === "string") return [v]
  return []
}

function asPageType(v: unknown, fallback: PageType): PageType {
  return typeof v === "string" && VALID_TYPES.has(v) ? (v as PageType) : fallback
}

function asPageSubtype(v: unknown): PageSubtype | undefined {
  return typeof v === "string" && VALID_SUBTYPES.has(v) ? (v as PageSubtype) : undefined
}

/**
 * Extract a human-readable title from the body. Prefers the first `# ` heading;
 * falls back to the last path segment with hyphens → spaces + title-case.
 */
function extractTitle(body: string, slug: string): string {
  const h1 = body.match(/^#\s+(.+?)\s*$/m)
  if (h1) return h1[1].trim()
  const last = slug.split("/").pop() ?? slug
  return last
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/**
 * Infer page type from its directory when frontmatter doesn't specify.
 */
function inferTypeFromSlug(slug: string): PageType {
  if (slug.startsWith("sources/")) return "source"
  if (slug.startsWith("entities/")) return "entity"
  if (slug.startsWith("concepts/")) return "concept"
  if (slug.startsWith("queries/")) return "query"
  return "concept"
}

function walkMarkdown(dir: string, rel = ""): Array<{ slug: string; path: string; raw: string }> {
  const out: Array<{ slug: string; path: string; raw: string }> = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    const next = rel ? `${rel}/${name}` : name
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      out.push(...walkMarkdown(full, next))
    } else if (name.endsWith(".md") && name !== "index.md" && !name.startsWith(".")) {
      out.push({
        slug: next.replace(/\.md$/, ""),
        path: full,
        raw: readFileSync(full, "utf-8"),
      })
    }
  }
  return out
}

function buildRecord(entry: { slug: string; path: string; raw: string }): PageRecord {
  const parsed = matter(entry.raw)
  const data = parsed.data ?? {}
  const body = parsed.content ?? ""
  const title = extractTitle(body, entry.slug)
  const type = asPageType(data.type, inferTypeFromSlug(entry.slug))

  // Tokens from title + body. Bias title by emitting it twice would be wrong
  // here (it's a Set); instead, scorers will weight title matches independently.
  const tokens = tokenize(`${title}\n${body}`)

  return {
    slug: entry.slug,
    type,
    subtype: asPageSubtype(data.subtype),
    title,
    body,
    tokens,
    tags: toStringArray(data.tags),
    aliases: toStringArray(data.aliases),
    emotion: toStringArray(data.emotion).length ? toStringArray(data.emotion) : undefined,
    emotionControlled: toStringArray(data.emotion_controlled).length
      ? toStringArray(data.emotion_controlled)
      : undefined,
    aesthetic: toStringArray(data.aesthetic).length ? toStringArray(data.aesthetic) : undefined,
    mood: typeof data.mood === "string" ? data.mood : undefined,
    sources: toStringArray(data.sources).length ? toStringArray(data.sources) : undefined,
    path: entry.path,
  }
}

let CACHE: PageIndex | null = null

export function getPageIndex(contentDir?: string): PageIndex {
  if (CACHE) return CACHE
  const dir = contentDir ?? join(process.cwd(), "content")
  const entries = walkMarkdown(dir)
  const pages = entries.map(buildRecord)
  const bySlug = new Map(pages.map((p) => [p.slug, p]))
  CACHE = { pages, bySlug, loadedAt: Date.now() }
  // Observability — logs once per warm instance
  // eslint-disable-next-line no-console
  console.log(`[gnosis] page index loaded — ${pages.length} pages from ${dir}`)
  return CACHE
}

/** Test-only: force a re-read on next call. */
export function _resetPageIndex(): void {
  CACHE = null
}
