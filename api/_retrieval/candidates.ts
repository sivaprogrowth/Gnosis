/**
 * Stage 2 — Candidate retrieval.
 *
 * Pure TypeScript. Scores every page in the index against the parsed query on
 * weighted signals (title/body token overlap, tag/alias match, emotion overlap,
 * intent-aligned type bonus), returns top 20 candidates with signal breakdown.
 */

import { tokenize, overlap } from "./tokenize"
import type { CandidatePage, CandidateSignals, PageIndex, PageRecord, ParsedQuery } from "./types"

const MAX_CANDIDATES = 20
const PREVIEW_CHARS = 240

const WEIGHTS = {
  title: 3,
  body: 1,
  tag: 2,
  alias: 2,
  emotion: 2,
  typeBonus: 1,
} as const

function titleTokens(page: PageRecord): Set<string> {
  return tokenize(page.title)
}

function scoreTitle(parsed: ParsedQuery, page: PageRecord): number {
  return overlap(parsed.tokens, titleTokens(page))
}

function scoreBody(parsed: ParsedQuery, page: PageRecord): number {
  // Normalize by log to avoid very long pages swamping the signal.
  const raw = overlap(parsed.tokens, page.tokens)
  if (raw === 0) return 0
  return Math.log2(raw + 1)
}

function scoreTags(parsed: ParsedQuery, page: PageRecord): number {
  if (page.tags.length === 0) return 0
  const tagTokens = new Set(page.tags.flatMap((t) => [...tokenize(t)]))
  return overlap(parsed.tokens, tagTokens)
}

function scoreAliases(parsed: ParsedQuery, page: PageRecord): number {
  if (page.type !== "entity" || page.aliases.length === 0) return 0
  const entityTokens = new Set(parsed.entities.flatMap((e) => [...tokenize(e)]))
  if (entityTokens.size === 0) return 0
  const aliasTokens = new Set(page.aliases.flatMap((a) => [...tokenize(a)]))
  // Title tokens also count as an alias for matching purposes.
  for (const t of titleTokens(page)) aliasTokens.add(t)
  return overlap(entityTokens, aliasTokens)
}

function scoreEmotion(parsed: ParsedQuery, page: PageRecord): number {
  if (parsed.emotionControlled.length === 0) return 0
  if (!page.emotionControlled || page.emotionControlled.length === 0) return 0
  const qs = new Set(parsed.emotionControlled)
  let c = 0
  for (const e of page.emotionControlled) if (qs.has(e)) c++
  return c
}

function scoreTypeBonus(parsed: ParsedQuery, page: PageRecord): number {
  switch (parsed.intent) {
    case "lookup":
      return page.type === "entity" || page.type === "concept" ? 1 : 0
    case "synthesis":
      return page.type === "concept" || page.type === "source" ? 1 : 0
    case "comparison":
      return page.type === "entity" ? 1 : 0
    case "exploration":
      return page.type === "source" || page.type === "concept" ? 1 : 0
    default:
      return 0
  }
}

function weightedSum(s: CandidateSignals): number {
  return (
    WEIGHTS.title * s.titleMatch +
    WEIGHTS.body * s.bodyMatch +
    WEIGHTS.tag * s.tagMatch +
    WEIGHTS.alias * s.aliasMatch +
    WEIGHTS.emotion * s.emotionMatch +
    WEIGHTS.typeBonus * s.typeBonus
  )
}

function makePreview(body: string): string {
  const stripped = body
    .replace(/^#\s+.*$/m, "")
    .replace(/^\s+/, "")
    .replace(/\n+/g, " ")
  return stripped.slice(0, PREVIEW_CHARS)
}

export function selectCandidates(parsed: ParsedQuery, index: PageIndex): CandidatePage[] {
  const scored: CandidatePage[] = []

  for (const page of index.pages) {
    const signals: CandidateSignals = {
      titleMatch: scoreTitle(parsed, page),
      bodyMatch: scoreBody(parsed, page),
      tagMatch: scoreTags(parsed, page),
      aliasMatch: scoreAliases(parsed, page),
      emotionMatch: scoreEmotion(parsed, page),
      typeBonus: scoreTypeBonus(parsed, page),
    }
    const score = weightedSum(signals)
    if (score <= 0) continue
    scored.push({
      slug: page.slug,
      type: page.type,
      title: page.title,
      tags: page.tags,
      aliases: page.aliases,
      preview: makePreview(page.body),
      score,
      signals,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, MAX_CANDIDATES)
}
