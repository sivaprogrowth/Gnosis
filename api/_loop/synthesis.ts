/**
 * synthesis.ts — automated §4.7 weekly synthesis brief.
 *
 * Transcribes the vault CLAUDE.md §4.7 workflow: pull the week's highlights,
 * cluster (no pre-defined categories), run the standing collision-hunt
 * (contradictions, cross-domain rhymes, wiki-impact), file the brief as a
 * query page with the exact 4-section contract, append a log.md entry.
 *
 * Server-side deltas from the manual ritual, on purpose:
 *  - the cross-domain rhyme hunt runs against this week's highlights plus the
 *    wiki's concept pages (the MCP's full-text search over ALL older
 *    highlights isn't available server-side) — noted in the page intro;
 *  - run state goes to gnosis_loop_runs instead of readwise-state.json;
 *  - step 5's "offer to fan out" has no user present, so contradictions are
 *    listed in the page for the user to act on later.
 */

import { supabase } from "../_auth/supabase.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { fetchHighlights, type Highlight } from "./readwise.js"
import { loopLLM } from "./llm.js"
import { commitQueryPage, isoDate, isoWeekLabel, pageExists } from "./wiki.js"
import { recordRun } from "./state.js"

export interface TaskResult {
  digests: string[] // messages for the bot to deliver
  filed: string[] // wiki paths committed
}

const MIN_HIGHLIGHTS = 5 // §4.7: skip weeks with fewer — not enough to cluster honestly

const SYSTEM = `You are the weekly-synthesis pass of a personal LLM wiki (Gnosis). You receive one week of the user's reading highlights (books + articles, with their private margin notes), the wiki's existing concept pages, and the pages ingested this week.

Produce the BODY of a weekly synthesis brief (markdown, starting at "## Clusters this week" — no frontmatter, no H1; those are added by the caller). The contract is exactly these four sections, in order:

## Clusters this week
Group the highlights into 3-6 clusters using your own judgement. Do NOT pre-define categories — let the clusters fall out of what the user actually marked; they're a more honest signal than any taxonomy. One-sentence label per cluster (as an H3), each with 2-4 representative highlights as block quotes with attribution ("— Author, *Title*").

## Collisions and tensions
The standing instruction — hunt for three kinds of friction, every week, even when nothing nominally connects:
- Direct contradictions: two highlights from this week that disagree on the same claim. Quote both, name the disagreement.
- Cross-domain rhymes: a marketing/business/craft highlight that rhymes with a philosophical or older-tradition idea — check against the provided wiki concept pages and this week's other highlights. A Storr observation about theory-of-control rhyming with the Gita on detachment is the canonical example; that rhyme is the brief's most valuable output.
- Wiki-impact: a highlight that strengthens or undermines a claim in an existing concept page. Name the [[concept-slug]], the claim, the highlight, and the direction.

## What this week added to the wiki
Existing [[concept-slug]] pages this week's highlights strengthen or extend, and the newly ingested pages (provided) in [[slug]] form.

## What this week contradicted
Existing [[concept-slug]] pages this week's highlights weaken or qualify.

Rules: if a section is empty, write "_none._" — never omit the section. Quote highlights verbatim (the punctuation is the user's, not yours). Use [[slug]] wiki-links exactly as given in the concept list — never invent slugs. Margin notes (the "note" field) are the user's own thinking; weight them heavily. If the collision-hunt finds nothing, "_none found this week._" is honest data — never fabricate a connection.`

export async function runSynthesis(opts: { dry?: boolean } = {}): Promise<TaskResult> {
  const now = new Date()
  const week = isoWeekLabel(now)
  const path = `wiki/queries/synthesis-${week}.md`

  // Idempotence: one brief per ISO week.
  if (await pageExists(path)) {
    return { digests: [], filed: [] }
  }

  const since = new Date(now.getTime() - 7 * 86_400_000)
  const highlights = await fetchHighlights({ since: since.toISOString() })

  if (highlights.length < MIN_HIGHLIGHTS) {
    if (!opts.dry)
      await recordRun("synthesis", week, null, { skipped: true, highlights: highlights.length })
    return {
      digests: [
        `🪽 **Hermes** — weekly synthesis skipped: only ${highlights.length} highlight${highlights.length === 1 ? "" : "s"} this week (needs ${MIN_HIGHLIGHTS} to cluster honestly). The older material will surface through resurface instead.`,
      ],
      filed: [],
    }
  }

  // Wiki context: concept pages for the rhyme/impact hunt; this week's ingests.
  const index = getPageIndex()
  const concepts = index.pages
    .filter((p) => p.type === "concept")
    .slice(0, 200)
    .map((p) => `[[${p.slug}]] — ${p.title}`)
  const { data: weekJobs } = await supabase
    .from("gnosis_ingest_jobs")
    .select("source_title, surfaced_entities")
    .eq("status", "done")
    .gte("created_at", since.toISOString())
  const weekIngests = (weekJobs ?? [])
    .map((j) => {
      const slug = (j.surfaced_entities as { suggestedSlug?: string } | null)?.suggestedSlug
      return slug ? `[[${slug}]] — ${j.source_title ?? slug}` : null
    })
    .filter(Boolean) as string[]

  const sources = new Set(highlights.map((h) => h.title))
  const user = `Window: ${isoDate(since)} → ${isoDate(now)} (${week})

--- THIS WEEK'S HIGHLIGHTS (${highlights.length}, across ${sources.size} sources) ---
${JSON.stringify(highlights.map(compactHighlight), null, 1)}

--- EXISTING WIKI CONCEPT PAGES (use these exact slugs) ---
${concepts.join("\n")}

--- PAGES INGESTED THIS WEEK ---
${weekIngests.length ? weekIngests.join("\n") : "(none)"}

Produce the brief body now.`

  const body = await loopLLM({ callSite: "loop:synthesis", system: SYSTEM, user })

  const today = isoDate(now)
  const page = `---
type: query
created: ${today}
updated: ${today}
sources:
  - readwise://highlights/${isoDate(since)}..${today}
tags: [synthesis, weekly, query, readwise, automated]
---

# Weekly synthesis — ${week}

**Window:** ${isoDate(since)} → ${today}
**Highlights:** ${highlights.length} across ${sources.size} sources.

_Automated brief (learning loop). Rhyme-hunt ran against this week's highlights + wiki concepts; older-highlight full-text search only runs in manual §4.7 sessions._

${body}
`

  const digest = buildDigest(week, highlights.length, sources.size, body, path)
  if (opts.dry) return { digests: [digest], filed: [path] }

  await commitQueryPage({
    path,
    content: page,
    message: `Weekly synthesis brief ${week} (automated §4.7)`,
    logLine: `query | weekly synthesis brief — ${highlights.length} highlights, ${sources.size} sources (automated)`,
  })
  await recordRun("synthesis", week, path, { highlights: highlights.length, sources: sources.size })
  return { digests: [digest], filed: [path] }
}

function compactHighlight(h: Highlight) {
  return {
    text: h.text.slice(0, 700),
    note: h.note,
    title: h.title,
    author: h.author,
    category: h.category,
  }
}

/** Short Discord digest: collisions section (the paydirt) + link. */
function buildDigest(week: string, n: number, sources: number, body: string, path: string): string {
  const collisions = extractSection(body, "Collisions and tensions")
  const preview =
    collisions && !/^_none/.test(collisions)
      ? collisions.split("\n").filter(Boolean).slice(0, 6).join("\n")
      : "_no collisions this week — noted honestly._"
  const slug = path.replace(/^wiki\//, "").replace(/\.md$/, "")
  return [
    `🪽 **Hermes** — weekly synthesis **${week}** filed (${n} highlights, ${sources} sources).`,
    ``,
    `**Collisions & tensions:**`,
    preview,
    ``,
    `Full brief: https://gnosis.progrowth.services/${slug}`,
  ].join("\n")
}

function extractSection(body: string, heading: string): string | null {
  const m = body.match(new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`))
  return m ? m[1].trim() : null
}
