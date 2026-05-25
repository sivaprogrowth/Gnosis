/**
 * fetchUrl.ts — pull a URL, extract the main article, return clean markdown.
 *
 * Three-stage pipeline:
 *   1. fetch with a 15s timeout + a real browser UA (some sites 403 the default
 *      undici UA)
 *   2. parse the HTML with jsdom; run @mozilla/readability to strip nav/ads/etc
 *   3. convert the extracted HTML to markdown with turndown
 *
 * Falls back to a full-page turndown if readability fails (some pages —
 * GitHub READMEs, MDX-rendered docs — don't fit readability's article heuristic
 * but still produce useful markdown when we just convert everything).
 *
 * Errors are thrown with a one-line message — the pipeline catches and turns
 * them into an SSE `error` frame so the user sees them.
 */

import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

export interface FetchedDocument {
  markdown: string
  title: string
  sourceDomain: string
  byline: string | null
  publishedTime: string | null
  excerpt: string | null
  wordCount: number
}

function makeTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  })
  // Strip script + style entirely (turndown's default keeps them as preformatted)
  td.remove(["script", "style", "noscript", "iframe"])
  return td
}

export async function fetchUrl(url: string): Promise<FetchedDocument> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error(`Only http/https URLs are supported (got ${parsedUrl.protocol})`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Fetch failed for ${url}: ${msg}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new Error(`Fetch returned HTTP ${res.status} for ${url}`)
  }

  const html = await res.text()
  if (!html.trim()) throw new Error(`Empty response body from ${url}`)

  // Parse + readability. linkedom over jsdom because jsdom fails to init in
  // Vercel's serverless runtime (it needs Node internals not exposed there).
  // Readability is happy with any DOM that quacks like the spec.
  const { document } = parseHTML(html)
  // Set base href so relative links resolve correctly during readability's parse
  if (!document.querySelector("base")) {
    const base = document.createElement("base")
    base.setAttribute("href", url)
    document.head?.appendChild(base)
  }
  const reader = new Readability(document as unknown as Document)
  const article = reader.parse()

  const td = makeTurndown()
  let markdown: string
  let title: string
  let byline: string | null = null
  let publishedTime: string | null = null
  let excerpt: string | null = null

  if (article && article.content && article.content.trim().length > 200) {
    markdown = td.turndown(article.content)
    title = article.title || parsedUrl.hostname
    byline = article.byline ?? null
    publishedTime = article.publishedTime ?? null
    excerpt = article.excerpt ?? null
  } else {
    // Fallback: whole-document turndown (readability bailed)
    markdown = td.turndown(document.body?.innerHTML ?? html)
    title =
      document.querySelector("title")?.textContent?.trim() ||
      parsedUrl.hostname
  }

  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim()
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  if (wordCount < 30) {
    throw new Error(
      `Extracted only ${wordCount} words from ${url} — page may be a paywall, app shell, or JS-rendered. Try the PDF route if you have one.`,
    )
  }

  return {
    markdown,
    title,
    sourceDomain: parsedUrl.hostname,
    byline,
    publishedTime,
    excerpt,
    wordCount,
  }
}
