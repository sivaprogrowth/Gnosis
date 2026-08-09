/**
 * mirror.ts — automated §4.11 quarterly reading-pattern mirror.
 *
 * The one workflow with a truth-telling bias built into the spec: what you
 * said you'd focus on vs what you actually fed your brain. Runs in the first
 * week of each quarter month (Jan/Apr/Jul/Oct), mirroring the quarter that
 * just closed. A mirror that surfaces no friction is suspect — the prompt
 * carries that instruction verbatim.
 */

import matter from "gray-matter"
import { supabase } from "../_auth/supabase.js"
import { getFileContent } from "../_ingest/githubPush.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { fetchHighlights } from "./readwise.js"
import { loopLLM } from "./llm.js"
import { commitQueryPage, isoDate, pageExists } from "./wiki.js"
import { recordRun } from "./state.js"
import type { TaskResult } from "./synthesis.js"

const SYSTEM = `You are the quarterly reading-pattern mirror of a personal LLM wiki (Gnosis). You receive 13 weeks of reading data (highlights grouped by source, ingested wiki pages) and the user's stated goals (Now.md, project pages).

Produce a CANDID MIRROR — not a celebratory summary. Mirrors that conclude "great mix of reading this quarter!" have failed. If the reading was genuinely well-calibrated, still surface what didn't show up, what's narrowing, and what overlaps across nominally unrelated reads. A mirror that surfaces no friction is suspect.

Output the BODY of the mirror page (markdown, no frontmatter, no H1), with exactly these sections:

## Period
Window dates, # sources touched, # highlights added, # pages ingested.

## Frequency map
5-9 EMERGENT categories with counts — let them fall out of the data, never pre-define.

## Goal cross-reference
What was on the goal list this quarter (from the provided Now.md and project pages).

## Over-indexing
Topics that consumed disproportionate reading relative to goal priority. Be specific: "You read 4 sources on X but nothing on the quantitative side of [project], even though it's the harder leg."

## Verticals stopped feeding
Categories previously read that went silent. Ask the drift question: intentional narrowing, or passive drift?

## Narrowing
Contraction toward a smaller author/source set, named neutrally — sometimes deep is right, sometimes it's an echo chamber; surface the pattern, don't judge it.

## Surprising overlap
Themes recurring across 3+ nominally unrelated reads — candidates for a wiki concept page.

## Open question
End with ONE question for next quarter's reading diet — never a prescription. "Given the over-indexing on X and silence on Y, what would you bias toward?" The mirror is diagnostic; the prescription is the user's.

Write 1-3 specific observations per section; be willing to be wrong — the mirror is the user's prompt to push back. If a section genuinely has nothing, write "_none observed._"`

export async function runMirror(
  opts: { dry?: boolean; force?: boolean } = {},
): Promise<TaskResult> {
  const now = new Date()
  const month = now.getUTCMonth()
  const inWindow = [0, 3, 6, 9].includes(month) && now.getUTCDate() <= 7
  if (!inWindow && !opts.force) return { digests: [], filed: [] }

  // Mirror the quarter that just closed (Jan run → previous year's Q4).
  const qEndMonth = month - (month % 3) // start month of current quarter
  const end = new Date(Date.UTC(now.getUTCFullYear(), qEndMonth, 1))
  const start = new Date(end.getTime() - 13 * 7 * 86_400_000)
  const prevQ = Math.floor(((qEndMonth + 12 - 3) % 12) / 3) + 1
  const prevQYear = qEndMonth === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const period = `${prevQYear}-Q${prevQ}`
  const path = `wiki/queries/reading-mirror-${period}.md`

  if (await pageExists(path)) return { digests: [], filed: [] }

  const highlights = await fetchHighlights({ since: start.toISOString() })
  const inWindowHl = highlights.filter(
    (h) => !h.highlightedAt || Date.parse(h.highlightedAt) < end.getTime(),
  )
  const bySource = new Map<string, { author: string | null; category: string; count: number }>()
  for (const h of inWindowHl) {
    const cur = bySource.get(h.title) ?? { author: h.author, category: h.category, count: 0 }
    cur.count++
    bySource.set(h.title, cur)
  }

  const { data: ingests } = await supabase
    .from("gnosis_ingest_jobs")
    .select("source_title, created_at")
    .eq("status", "done")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())

  const nowMd = await getFileContent("Now.md")
  const goals = nowMd ? matter(nowMd).content.slice(0, 2500) : "(Now.md unavailable)"
  const projects = getPageIndex()
    .pages.filter((p) => p.path.startsWith("projects/") || p.tags.includes("project"))
    .map((p) => `[[${p.slug}]] — ${p.title}: ${p.body.slice(0, 300)}`)
    .slice(0, 10)

  const { data: loopRuns } = await supabase
    .from("gnosis_loop_runs")
    .select("kind, period, created_at")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())

  const user = `Quarter: ${period} (window ${isoDate(start)} → ${isoDate(end)})

--- HIGHLIGHTS BY SOURCE (${inWindowHl.length} highlights, ${bySource.size} sources) ---
${JSON.stringify(
  [...bySource.entries()].map(([title, v]) => ({ title, ...v })),
  null,
  1,
)}

--- PAGES INGESTED THIS QUARTER (${(ingests ?? []).length}) ---
${(ingests ?? []).map((i) => `- ${i.source_title} (${String(i.created_at).slice(0, 10)})`).join("\n") || "(none)"}

--- GOALS: Now.md ---
${goals}

--- PROJECT PAGES ---
${projects.join("\n") || "(none)"}

--- LOOP ACTIVITY (synthesis briefs / resurfaces run this quarter) ---
${JSON.stringify(loopRuns ?? [])}

Produce the candid mirror body now.`

  const body = await loopLLM({ callSite: "loop:mirror", system: SYSTEM, user })

  const today = isoDate(now)
  const page = `---
type: query
created: ${today}
updated: ${today}
sources:
  - readwise://highlights/${isoDate(start)}..${isoDate(end)}
tags: [mirror, quarterly, query, readwise, automated]
---

# Reading-pattern mirror — ${period}

${body}
`
  const openQ = body.match(/##\s+Open question\s*\n([\s\S]*?)$/)?.[1]?.trim() ?? ""
  const digest = [
    `🪽 **Hermes** — quarterly reading mirror **${period}** filed (${inWindowHl.length} highlights, ${bySource.size} sources, ${(ingests ?? []).length} pages ingested).`,
    ``,
    `**Open question for next quarter:**`,
    openQ.split("\n").slice(0, 3).join("\n"),
    ``,
    `Full mirror: https://gnosis.progrowth.services/queries/reading-mirror-${period}`,
  ].join("\n")

  if (opts.dry) return { digests: [digest], filed: [path] }

  await commitQueryPage({
    path,
    content: page,
    message: `Reading-pattern mirror ${period} (automated §4.11)`,
    logLine: `query | reading-pattern mirror — ${period} — ${bySource.size} sources, ${inWindowHl.length} highlights (automated)`,
  })
  await recordRun("mirror", period, path, { highlights: inWindowHl.length, sources: bySource.size })
  return { digests: [digest], filed: [path] }
}
