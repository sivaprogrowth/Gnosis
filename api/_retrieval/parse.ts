/**
 * Stage 1 — Query understanding.
 *
 * Calls OpenAI (gpt-4o-mini) with a JSON schema to extract structured intent,
 * emotion, and aesthetic signals from the raw query. Falls back to a naive
 * tokenization-only parse if OPENAI_API_KEY is not configured.
 */

import OpenAI from "openai"
import { EMOTION_PRIMARIES, AESTHETIC_AXES } from "./emotions.js"
import { tokenize } from "./tokenize.js"
import type { ParsedQuery, QueryIntent } from "./types.js"

const MODEL = "gpt-4o-mini"

const INTENTS: QueryIntent[] = ["lookup", "synthesis", "comparison", "exploration", "refinement"]

const SYSTEM_PROMPT = `You parse a user's question about a personal wiki into structured retrieval signals.

Rules:
- "topic" is a 1-4 word noun phrase capturing what the question is about.
- "intent" classifies the query shape:
  - lookup: single fact or definition ("what is X?")
  - synthesis: combine multiple pages to produce something new ("design a landing page…", "summarize…")
  - comparison: contrast two or more things ("difference between X and Y")
  - exploration: open-ended browsing ("what do I have on X?")
  - refinement: follow-up tightening a prior answer
- "entities" are named things the user references (brands, people, products, works).
- "emotion" is open-vocabulary: any emotion word the user uses ("calming", "nostalgic", "bold"). Empty if none.
- "emotion_controlled" maps those to the closed set of Plutchik primaries: joy, trust, fear, surprise, sadness, disgust, anger, anticipation. Empty if none apply.
- "aesthetic" uses the closed set: warm, cool, bold, subtle, vintage, modern, organic, geometric, minimal, ornate, soft, hard, light, dark, bright, muted, dense, spacious, playful, serious. Empty if none apply.
- "time_scope": "recent" | "historical" | "any". Default "any" unless the user specifies.

Be conservative — if a field isn't clearly implied by the question, leave its list empty.`

const JSON_SCHEMA = {
  name: "parsed_query",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "topic",
      "intent",
      "entities",
      "emotion",
      "emotion_controlled",
      "aesthetic",
      "time_scope",
    ],
    properties: {
      topic: { type: "string" },
      intent: { type: "string", enum: INTENTS },
      entities: { type: "array", items: { type: "string" } },
      emotion: { type: "array", items: { type: "string" } },
      emotion_controlled: {
        type: "array",
        items: { type: "string", enum: [...EMOTION_PRIMARIES] },
      },
      aesthetic: { type: "array", items: { type: "string", enum: [...AESTHETIC_AXES] } },
      time_scope: { type: "string", enum: ["recent", "historical", "any"] },
    },
  },
} as const

function fallbackParse(raw: string): ParsedQuery {
  const tokens = tokenize(raw)
  const text = raw.toLowerCase()
  let intent: QueryIntent = "lookup"
  if (/\b(vs\.?|versus|difference|compare|contrast)\b/.test(text)) intent = "comparison"
  else if (/\b(design|summariz|synthesi|combine|inspire|ideas for)\b/.test(text))
    intent = "synthesis"
  else if (/\b(what do i have|show me|browse|explore)\b/.test(text)) intent = "exploration"
  return {
    raw,
    topic: raw.slice(0, 80),
    intent,
    entities: [],
    tokens,
    emotion: [],
    emotionControlled: [],
    aesthetic: [],
    timeScope: "any",
  }
}

export async function parseQuery(raw: string): Promise<ParsedQuery> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log("[gnosis] parseQuery: OPENAI_API_KEY not set, using fallback parse")
    return fallbackParse(raw)
  }

  const client = new OpenAI({ apiKey })

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: raw },
      ],
      response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
      temperature: 0,
    })
    const content = completion.choices[0]?.message?.content
    if (!content) {
      console.warn("[gnosis] parseQuery: empty response, falling back")
      return fallbackParse(raw)
    }
    const data = JSON.parse(content) as {
      topic: string
      intent: QueryIntent
      entities: string[]
      emotion: string[]
      emotion_controlled: string[]
      aesthetic: string[]
      time_scope: "recent" | "historical" | "any"
    }
    const tokens = tokenize(`${raw} ${data.topic} ${data.entities.join(" ")}`)
    return {
      raw,
      topic: data.topic,
      intent: data.intent,
      entities: data.entities,
      tokens,
      emotion: data.emotion,
      emotionControlled: data.emotion_controlled,
      aesthetic: data.aesthetic,
      timeScope: data.time_scope,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[gnosis] parseQuery: error ${msg}, falling back`)
    return fallbackParse(raw)
  }
}
