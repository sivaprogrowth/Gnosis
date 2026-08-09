/**
 * resurface.ts — automated §4.8 "resurface for current work".
 *
 * Context-triggered relevance: for each active item in the vault's Now.md,
 * pull the wiki pages and Readwise highlights the user should re-use for that
 * work, re-ranked for APPLICABILITY (would quoting this change what they're
 * building?) rather than similarity.
 *
 * Spec guards honoured:
 *  - Now.md `updated:` more than 14 days old → do not resurface against stale
 *    context; nag instead (that nag is itself the loop working);
 *  - honest empty results are acceptable and reported as data;
 *  - one Discord message per work item (spec: present one item at a time).
 *
 * The manual ritual's Readwise vector search isn't available server-side;
 * highlights are pre-filtered lexically and the LLM does the applicability
 * cut — same shape, different first-stage sieve.
 */

import matter from "gray-matter"
import { getFileContent } from "../_ingest/githubPush.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { selectCandidates } from "../_retrieval/candidates.js"
import { tokenize } from "../_retrieval/tokenize.js"
import type { ParsedQuery } from "../_retrieval/types.js"
import { fetchHighlights, type Highlight } from "./readwise.js"
import { loopLLM } from "./llm.js"
import { commitQueryPage, isoDate, pageExists, slugify } from "./wiki.js"
import { recordRun } from "./state.js"
import type { TaskResult } from "./synthesis.js"

const STALE_DAYS = 14 // §4.8 step 1 guard
const MAX_CONTEXTS = 3
const TIME_BUDGET_MS = 220_000 // stop starting new contexts before the 300s cap

export interface WorkContext {
  slug: string
  title: string
  description: string
}

export async function parseNowContexts(): Promise<
  { stale: true; updated: string | null } | { stale: false; contexts: WorkContext[] }
> {
  const raw = await getFileContent("Now.md")
  if (!raw) return { stale: true, updated: null }
  const parsed = matter(raw)
  // gray-matter parses bare YAML dates into Date objects; normalise either
  // shape to YYYY-MM-DD.
  const rawUpdated = parsed.data?.updated
  const updated =
    rawUpdated instanceof Date
      ? rawUpdated.toISOString().slice(0, 10)
      : rawUpdated
        ? String(rawUpdated).slice(0, 10)
        : null
  const ageDays = updated ? (Date.now() - Date.parse(updated)) / 86_400_000 : Infinity
  if (!updated || ageDays > STALE_DAYS) return { stale: true, updated }

  const section = parsed.content.match(/##\s+This week\s*\n([\s\S]*?)(?=\n##\s|$)/)
  const contexts: WorkContext[] = []
  for (const line of (section?.[1] ?? "").split("\n")) {
    const m = line.match(/^-\s+(.*)$/)
    if (!m) continue
    const text = m[1].trim()
    if (!text) continue
    const link = text.match(/\[\[([^\]|]+)/)?.[1]
    const bold = text.match(/\*\*(.+?)\*\*/)?.[1]
    const title = bold || link || text.slice(0, 60)
    contexts.push({
      slug: slugify(link || title, 40),
      title,
      description: text.replace(/\[\[|\]\]/g, "").replace(/\*\*/g, ""),
    })
  }
  return { stale: false, contexts: contexts.slice(0, MAX_CONTEXTS) }
}

const SYSTEM = `You are the resurface pass of a personal LLM wiki (Gnosis). You receive ONE active work context, candidate wiki pages, and candidate reading highlights (with the user's margin notes).

Select the 5-8 MOST APPLICABLE items — explicitly not most-recent, not most-similar. Most-applicable means: would quoting this change what the user is currently writing / building / pitching? If it just feels related, drop it.

Output the BODY of a resurface page (markdown, no frontmatter, no H1):
1. One short framing paragraph tying the selected set to the work.
2. Then each selected item as:

> "<verbatim quote — from a highlight, or a key passage from a wiki page>" — <author, source>
**Why this matters for <the work>:** <one line — what specifically changes if you act on this>

Rules: the "why this matters" line is the work you earn — never a generic gloss. When an item maps to a provided wiki page, weave its [[slug]] into the hook so the connection compounds. Quote verbatim; punctuation belongs to the original. Margin notes reveal why the user marked something — weight them.

If NOTHING crosses the applicability threshold, output exactly:
NONE
(Fabricating relevance is the failure mode to avoid; an honest empty is data.)`

export async function resurfaceForContext(
  ctx: WorkContext,
  shared: { highlights: Highlight[] },
): Promise<{ body: string | null; candidates: number }> {
  const index = getPageIndex()
  const parsed: ParsedQuery = {
    raw: ctx.description,
    topic: ctx.title,
    intent: "synthesis",
    entities: [],
    tokens: tokenize(`${ctx.title} ${ctx.description}`),
    emotion: [],
    emotionControlled: [],
    aesthetic: [],
    timeScope: "any",
  }
  const pages = selectCandidates(parsed, index).slice(0, 10)
  // §4.8 step 1: anchor to the project page when one exists.
  const project = index.bySlug.get(ctx.slug)

  const ctxTokens = parsed.tokens
  const scored = shared.highlights
    .map((h) => {
      const ht = tokenize(`${h.text} ${h.note ?? ""} ${h.title}`)
      let overlap = 0
      for (const t of ht) if (ctxTokens.has(t)) overlap++
      return { h, overlap }
    })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 25)

  const user = `--- ACTIVE WORK CONTEXT ---
${ctx.title}
${ctx.description}
${project ? `\nProject page [[${project.slug}]]:\n${project.body.slice(0, 1500)}` : ""}

--- CANDIDATE WIKI PAGES ---
${pages.map((p) => `[[${p.slug}]] (${p.type}) — ${p.title}\n${p.preview}`).join("\n\n")}

--- CANDIDATE HIGHLIGHTS (lexically pre-filtered; you make the applicability cut) ---
${JSON.stringify(
  scored.map(({ h }) => ({
    text: h.text.slice(0, 600),
    note: h.note,
    title: h.title,
    author: h.author,
  })),
  null,
  1,
)}

Produce the resurface body (or NONE) now.`

  const out = await loopLLM({ callSite: "loop:resurface", system: SYSTEM, user, maxTokens: 4000 })
  if (/^NONE\b/.test(out.trim())) return { body: null, candidates: pages.length + scored.length }
  return { body: out, candidates: pages.length + scored.length }
}

export async function runResurface(opts: { dry?: boolean } = {}): Promise<TaskResult> {
  const now = await parseNowContexts()
  const today = isoDate(new Date())

  if (now.stale) {
    if (!opts.dry)
      await recordRun("resurface", today, null, { skipped: "stale-now", updated: now.updated })
    return {
      digests: [
        `🪽 **Hermes** — resurface skipped: \`Now.md\` was last updated ${now.updated ?? "(never)"} — more than ${STALE_DAYS} days ago. Resurfacing against stale context produces stale results (§4.8 guard). Refresh the "This week" list in Obsidian and the Sunday loop will pick it up.`,
      ],
      filed: [],
    }
  }
  if (now.contexts.length === 0) {
    if (!opts.dry) await recordRun("resurface", today, null, { skipped: "no-contexts" })
    return {
      digests: [`🪽 **Hermes** — resurface skipped: Now.md has no "This week" items.`],
      filed: [],
    }
  }

  const started = Date.now()
  const highlights = await fetchHighlights({})
  const digests: string[] = []
  const filed: string[] = []

  for (const ctx of now.contexts) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      digests.push(
        `🪽 **Hermes** — resurface for **${ctx.title}** deferred (time budget); it'll run next Sunday.`,
      )
      continue
    }
    const path = `wiki/queries/resurface-${ctx.slug}-${today}.md`
    if (await pageExists(path)) continue

    try {
      const r = await resurfaceForContext(ctx, { highlights })
      if (!r.body) {
        digests.push(
          `🪽 **Hermes** — resurface for **${ctx.title}**: nothing crossed the applicability threshold (${r.candidates} candidates reviewed). The library doesn't have material this work can borrow from yet — that's data on where to read next.`,
        )
        if (!opts.dry) await recordRun("resurface", ctx.slug, null, { empty: true })
        continue
      }

      const page = `---
type: query
created: ${today}
updated: ${today}
sources:
  - loop://resurface/${ctx.slug}/${today}
tags: [resurface, query, automated, ${ctx.slug}]
work_context: ${ctx.slug}
---

# Resurface — ${ctx.title} (${today})

${r.body}
`
      const hooks = (r.body.match(/^\*\*Why this matters/gm) || []).length
      const digest = [
        `🪽 **Hermes** — resurface for **${ctx.title}** (${hooks} hooks):`,
        ``,
        firstHooks(r.body, 2),
        ``,
        `Full set: https://gnosis.progrowth.services/wiki/queries/resurface-${ctx.slug}-${today}`,
      ].join("\n")

      if (opts.dry) {
        digests.push(digest)
        filed.push(path)
        continue
      }
      await commitQueryPage({
        path,
        content: page,
        message: `Resurface for ${ctx.title} (automated §4.8)`,
        logLine: `query | resurface — ${ctx.slug} — ${hooks} hooks (automated)`,
      })
      await recordRun("resurface", ctx.slug, path, { hooks })
      digests.push(digest)
      filed.push(path)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[loop/resurface] context ${ctx.slug} failed:`, msg)
      digests.push(`🪽 **Hermes** — resurface for **${ctx.title}** failed: ${msg}`)
    }
  }
  return { digests, filed }
}

/** First N quote+hook pairs for the digest. */
function firstHooks(body: string, n: number): string {
  const blocks = body.split(/\n\n+/).filter((b) => b.startsWith(">"))
  return blocks.slice(0, n).join("\n\n") || body.split("\n\n")[0] || ""
}
