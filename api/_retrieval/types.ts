/**
 * Shared types for the Gnosis retrieval pipeline.
 *
 * Stages (see Gnosis-Retrieval-Plan.md):
 *   1 parse    — raw query → ParsedQuery
 *   2 candidates — ParsedQuery + PageIndex → CandidatePage[]
 *   3 rerank   — CandidatePage[] → TopKPage[]
 *   4 assemble — TopKPage[] → scoped context (pure code)
 *   5 synthesize — scoped context → streamed answer
 */

export type PageType = "source" | "entity" | "concept" | "query"
export type PageSubtype = "fact" | "take" | "object"

export type PageRecord = {
  slug: string
  type: PageType
  subtype?: PageSubtype
  title: string
  body: string
  tokens: Set<string>
  tags: string[]
  aliases: string[]
  emotion?: string[]
  emotionControlled?: string[]
  aesthetic?: string[]
  mood?: string
  sources?: string[]
  path: string
}

export type PageIndex = {
  pages: PageRecord[]
  bySlug: Map<string, PageRecord>
  loadedAt: number
}

export type QueryIntent = "lookup" | "synthesis" | "comparison" | "exploration" | "refinement"

export type ParsedQuery = {
  raw: string
  topic: string
  intent: QueryIntent
  entities: string[]
  tokens: Set<string>
  emotion: string[]
  emotionControlled: string[]
  aesthetic: string[]
  timeScope: "recent" | "historical" | "any"
}

export type CandidateSignals = {
  titleMatch: number
  bodyMatch: number
  tagMatch: number
  aliasMatch: number
  emotionMatch: number
  typeBonus: number
}

export type CandidatePage = {
  slug: string
  type: PageType
  title: string
  tags: string[]
  aliases: string[]
  preview: string
  score: number
  signals: CandidateSignals
}

export type TopKPage = {
  slug: string
  type: PageType
  title: string
  whySelected: string
}

export type AssembledPage = TopKPage & {
  body: string
  tags: string[]
  aliases: string[]
  emotionControlled?: string[]
}

export type SynthesisModel = "opus" | "sonnet"
