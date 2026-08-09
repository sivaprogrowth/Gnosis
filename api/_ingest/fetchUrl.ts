/**
 * fetchUrl.ts — pull a URL, extract the main article, return clean markdown.
 *
 * Two-tier strategy:
 *
 *   Tier 1 (direct) — fetch with a 15s timeout + a real browser UA, parse with
 *   linkedom, run @mozilla/readability to strip nav/ads/etc, convert to
 *   markdown with turndown. Falls back to a full-page turndown if readability
 *   bails (GitHub READMEs, MDX docs) but still produces useful markdown.
 *
 *   Tier 2 (reader proxy) — a plain server-side fetch cannot get past bot
 *   management (Cloudflare Turnstile, PerimeterX, Incapsula). Those sites
 *   answer with a 403 or a 200 "Just a moment…" interstitial, and no amount of
 *   header spoofing helps because the challenge needs a real JS runtime.
 *   When tier 1 comes back blocked, challenged, or suspiciously thin, we retry
 *   through r.jina.ai, which renders the page in a headless browser and
 *   returns markdown. Free and keyless; set JINA_API_KEY for higher rate
 *   limits if we ever need them.
 *
 * Errors are thrown with a one-line message that names BOTH failures, so the
 * job row records why each tier gave up rather than just the last one.
 */

import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

const FETCH_TIMEOUT_MS = 15_000
/** The proxy renders JS, so it is legitimately slower than a raw fetch. */
const PROXY_TIMEOUT_MS = 45_000
const READER_PROXY_BASE = "https://r.jina.ai/"
/** Below this, whatever we extracted is a paywall stub or an app shell. */
const MIN_WORDS = 30

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/**
 * Fingerprints of bot-management interstitials. Matched against the <title>
 * and the first few KB of HTML only — never the article body — so a page that
 * merely writes *about* Cloudflare isn't mistaken for a challenge.
 */
const CHALLENGE_MARKERS = [
  "just a moment",
  "attention required",
  "checking your browser",
  "verifying you are human",
  "enable javascript and cookies to continue",
  "challenges.cloudflare.com",
  "cf-browser-verification",
  "_incapsula_resource",
  "perimeterx",
  "px-captcha",
]

/**
 * Unambiguous subscription-wall copy. Deliberately excludes bare "subscribe"
 * and "sign in", which appear on plenty of open pages (newsletter boxes, nav
 * bars) and would produce false positives.
 */
const PAYWALL_MARKERS = [
  "subscribenow",
  "subscribe now",
  "already a subscriber",
  "continue reading",
  "subscriber-only",
  "for subscribers",
  "free trial",
  "register to continue",
  "sign in to read",
  "create a free account",
  "this article is for",
]
/** Full articles run long; a preview does not. Above this we never flag. */
const PAYWALL_WORD_CEILING = 1500
/** Two independent hits — one stray phrase shouldn't reject a real article. */
const PAYWALL_MARKER_THRESHOLD = 2

/**
 * Detect a subscription-wall preview: the lede plus navigation, with the body
 * withheld. Both tiers fetch anonymously — the subscription lives in Siva's
 * browser, not in a serverless function — so a paid Economist/WSJ article
 * comes back as a stub that clears the 30-word floor and looks like success.
 * Left unchecked that commits a near-empty page into the wiki (it did once:
 * `sources/how-to-spot-ai-writing-economist-2026`, removed 2026-08-09).
 *
 * Calibrated against real output: Economist previews run ~890 words with 5+
 * marker hits; a full open article (paulgraham.com/ds.html) runs 4,368 words
 * with none of these markers.
 */
function looksPaywalled(markdown: string, wordCount: number): boolean {
  if (wordCount >= PAYWALL_WORD_CEILING) return false
  const haystack = markdown.toLowerCase()
  let hits = 0
  for (const marker of PAYWALL_MARKERS) {
    if (haystack.includes(marker)) hits++
    if (hits >= PAYWALL_MARKER_THRESHOLD) return true
  }
  return false
}

export interface FetchedDocument {
  markdown: string
  title: string
  sourceDomain: string
  byline: string | null
  publishedTime: string | null
  excerpt: string | null
  wordCount: number
}

/** Tier-1 outcome: usable document, or a reason to escalate to the proxy. */
type DirectAttempt = { ok: true; doc: FetchedDocument } | { ok: false; reason: string }

/**
 * Both tiers hit a subscription wall. Distinct from a generic extraction
 * failure because the remedy is different — no amount of retrying helps, the
 * page has to be captured from a logged-in browser — so `fetchUrl` surfaces
 * this message verbatim instead of wrapping it in the two-tier summary.
 */
export class PaywallError extends Error {
  readonly name = "PaywallError"
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

function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length
}

function looksLikeChallenge(title: string, html: string): boolean {
  const haystack = `${title}\n${html.slice(0, 4096)}`.toLowerCase()
  return CHALLENGE_MARKERS.some((marker) => haystack.includes(marker))
}

/** Tier 1 — direct fetch + readability. Returns a reason instead of throwing. */
async function tryDirectFetch(url: string, parsedUrl: URL): Promise<DirectAttempt> {
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
    return { ok: false, reason: `direct fetch failed (${msg})` }
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    return { ok: false, reason: `direct fetch returned HTTP ${res.status}` }
  }

  const html = await res.text()
  if (!html.trim()) return { ok: false, reason: "direct fetch returned an empty body" }

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
    title = document.querySelector("title")?.textContent?.trim() || parsedUrl.hostname
  }

  // A challenge page answers 200 with a tiny "Just a moment…" body, so the
  // status code alone doesn't catch it.
  if (looksLikeChallenge(title, html)) {
    return { ok: false, reason: "direct fetch hit a bot-protection interstitial" }
  }

  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim()
  const wordCount = countWords(markdown)
  if (wordCount < MIN_WORDS) {
    return { ok: false, reason: `direct fetch extracted only ${wordCount} words` }
  }
  // Escalate rather than reject: the proxy occasionally gets more of the body.
  if (looksPaywalled(markdown, wordCount)) {
    return { ok: false, reason: `direct fetch returned a paywall preview (${wordCount} words)` }
  }

  return {
    ok: true,
    doc: {
      markdown,
      title,
      sourceDomain: parsedUrl.hostname,
      byline,
      publishedTime,
      excerpt,
      wordCount,
    },
  }
}

/**
 * r.jina.ai answers with a small plain-text header block followed by the
 * article:
 *
 *   Title: ...
 *   URL Source: ...
 *   Published Time: ...
 *
 *   Markdown Content:
 *   <the article>
 */
function parseReaderProxyResponse(text: string, parsedUrl: URL): FetchedDocument {
  const marker = "\nMarkdown Content:\n"
  const idx = text.indexOf(marker)
  const head = idx === -1 ? "" : text.slice(0, idx)
  const field = (name: string): string | null => {
    const m = head.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))
    return m?.[1]?.trim() || null
  }

  const markdown = (idx === -1 ? text : text.slice(idx + marker.length))
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  const wordCount = countWords(markdown)
  if (wordCount < MIN_WORDS) {
    throw new Error(`reader proxy extracted only ${wordCount} words`)
  }
  if (looksPaywalled(markdown, wordCount)) {
    throw new PaywallError(
      `${parsedUrl.hostname} returned a paywall preview (${wordCount} words of lede + navigation). ` +
        `Both fetch tiers are anonymous — a subscription lives in your browser, not in this ` +
        `function, so it can't apply here. Save the page with the Obsidian Web Clipper, or tag ` +
        `it \`gnosis\` in Readwise Reader; both capture it from your logged-in browser.`,
    )
  }

  return {
    markdown,
    title: field("Title") || parsedUrl.hostname,
    sourceDomain: parsedUrl.hostname,
    byline: field("Author"),
    publishedTime: field("Published Time"),
    excerpt: null,
    wordCount,
  }
}

/** Tier 2 — render through r.jina.ai and take its markdown. */
async function fetchViaReaderProxy(url: string, parsedUrl: URL): Promise<FetchedDocument> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  const headers: Record<string, string> = { Accept: "text/plain" }
  const key = (process.env.JINA_API_KEY || "").trim()
  if (key) headers.Authorization = `Bearer ${key}`

  let res: Response
  try {
    res = await fetch(READER_PROXY_BASE + url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`reader proxy request failed (${msg})`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`reader proxy returned HTTP ${res.status}`)
  const text = await res.text()
  if (!text.trim()) throw new Error("reader proxy returned an empty body")

  return parseReaderProxyResponse(text, parsedUrl)
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

  const direct = await tryDirectFetch(url, parsedUrl)
  if (direct.ok) return direct.doc

  console.warn(`[fetchUrl] ${url}: ${direct.reason} — retrying via reader proxy`)
  try {
    const doc = await fetchViaReaderProxy(url, parsedUrl)
    console.info(`[fetchUrl] ${url}: reader proxy recovered ${doc.wordCount} words`)
    return doc
  } catch (e) {
    // A paywall diagnosis is already specific and actionable — don't bury it.
    if (e instanceof PaywallError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Could not extract ${url} — ${direct.reason}, and the reader proxy fallback also failed: ${msg}. ` +
        `The page may be hard-paywalled; try the PDF route or paste the text as a clipping.`,
    )
  }
}
