/**
 * Stage 3 — Re-rank.
 *
 * Feeds the top ~20 candidates from Stage 2 to gpt-4o-mini with a JSON schema,
 * which returns the top K=5-8 most relevant pages with a brief rationale.
 * Falls back to the top-K by lexical score if OPENAI_API_KEY is not configured.
 */

import OpenAI from "openai"
import type { CandidatePage, ParsedQuery, TopKPage } from "./types.js"

const MODEL = "gpt-4o-mini"
const TARGET_K = 6
const MAX_K = 8

const SYSTEM_PROMPT = `You are the re-ranking stage of a wiki retrieval pipeline.

You will receive a parsed query and a list of candidate pages (with titles, types, tags, and short previews). Pick the 5-8 pages most directly relevant to answering the query.

Rules:
- Prefer pages that answer the query directly over pages that mention it tangentially.
- For comparison queries, always include the entities being compared if present.
- For synthesis queries, prefer concept and source pages that carry the needed claims.
- For each selected page, write a one-sentence why_selected explaining what it contributes.
- Order the output by relevance (most relevant first).
- If fewer than 5 candidates are plausibly relevant, return fewer. Don't pad.`

const JSON_SCHEMA = {
  name: "reranked_pages",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["top_k"],
    properties: {
      top_k: {
        type: "array",
        minItems: 0,
        maxItems: MAX_K,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["slug", "why_selected"],
          properties: {
            slug: { type: "string" },
            why_selected: { type: "string" },
          },
        },
      },
    },
  },
} as const

function formatCandidates(candidates: CandidatePage[]): string {
  return candidates
    .map(
      (c, i) =>
        `${i + 1}. slug: ${c.slug}  [${c.type}]  score=${c.score.toFixed(2)}
   title: ${c.title}
   tags: [${c.tags.join(", ")}]${c.aliases.length ? `  aliases: [${c.aliases.join(", ")}]` : ""}
   preview: ${c.preview.replace(/\s+/g, " ").trim()}`,
    )
    .join("\n\n")
}

function formatParsed(parsed: ParsedQuery): string {
  const parts = [`raw: ${parsed.raw}`, `topic: ${parsed.topic}`, `intent: ${parsed.intent}`]
  if (parsed.entities.length) parts.push(`entities: [${parsed.entities.join(", ")}]`)
  if (parsed.emotion.length) parts.push(`emotion: [${parsed.emotion.join(", ")}]`)
  if (parsed.emotionControlled.length)
    parts.push(`emotion_controlled: [${parsed.emotionControlled.join(", ")}]`)
  if (parsed.aesthetic.length) parts.push(`aesthetic: [${parsed.aesthetic.join(", ")}]`)
  return parts.join("\n")
}

function fallbackRerank(candidates: CandidatePage[]): TopKPage[] {
  return candidates.slice(0, TARGET_K).map((c) => ({
    slug: c.slug,
    type: c.type,
    title: c.title,
    whySelected: `lexical score ${c.score.toFixed(2)}`,
  }))
}

export async function rerank(
  parsed: ParsedQuery,
  candidates: CandidatePage[],
): Promise<TopKPage[]> {
  if (candidates.length === 0) return []
  if (candidates.length <= 3) {
    // Too few to re-rank meaningfully; pass through.
    return candidates.map((c) => ({
      slug: c.slug,
      type: c.type,
      title: c.title,
      whySelected: "only candidate available",
    }))
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log("[gnosis] rerank: OPENAI_API_KEY not set, using lexical fallback")
    return fallbackRerank(candidates)
  }

  const client = new OpenAI({ apiKey })
  const userPrompt = `Parsed query:\n${formatParsed(parsed)}\n\nCandidates:\n\n${formatCandidates(
    candidates,
  )}\n\nReturn the top ${TARGET_K} most relevant pages (or fewer if appropriate).`

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
      temperature: 0,
    })
    const content = completion.choices[0]?.message?.content
    if (!content) return fallbackRerank(candidates)
    const data = JSON.parse(content) as { top_k: Array<{ slug: string; why_selected: string }> }

    // Join back with candidate metadata; drop any slug the model invented.
    const bySlug = new Map(candidates.map((c) => [c.slug, c]))
    const selected: TopKPage[] = []
    for (const item of data.top_k) {
      const c = bySlug.get(item.slug)
      if (!c) continue
      selected.push({
        slug: c.slug,
        type: c.type,
        title: c.title,
        whySelected: item.why_selected,
      })
    }

    if (selected.length === 0) return fallbackRerank(candidates)
    return selected
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[gnosis] rerank: error ${msg}, falling back to lexical`)
    return fallbackRerank(candidates)
  }
}
