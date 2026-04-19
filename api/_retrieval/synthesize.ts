/**
 * Stage 4 (assemble) + Stage 5 (synthesize).
 *
 * Loads full page bodies for the top-K selections, assembles a scoped context
 * (a tiny fraction of the wiki), and streams Anthropic's answer back through a
 * callback. Routes by parsed intent:
 *   - lookup → claude-sonnet-4-6 (fast, cheap)
 *   - synthesis | comparison | exploration | refinement → claude-opus-4-7
 */

import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources"
import type { AssembledPage, PageIndex, ParsedQuery, SynthesisModel, TopKPage } from "./types.js"

const MODEL_OPUS = "claude-opus-4-7"
const MODEL_SONNET = "claude-sonnet-4-6"
const MAX_TOKENS = 1536

const SCHEMA_INSTRUCTIONS = `You are the Gnosis wiki assistant.

You answer the user's question using ONLY the scoped pages supplied below. The pages have already been selected by the retrieval pipeline as the ones most relevant to this query.

Rules:
1. **Cite every claim** with [[slug]] links — the same slug as each page's header (e.g. [[entities/chatgpt]], [[concepts/earned-media-bias]]). Citations must match a page in the scoped context.
2. **If the supplied pages don't cover the question, say so** — "I don't see that in the pages retrieved for this query." Never invent or speculate beyond the scoped context.
3. **Be concise.** Prefer 3–6 sentences unless the user asks for depth. Use bullets when listing >2 items.
4. **Surface contradictions.** If pages disagree, present both sides with citations rather than picking one.
5. **Cross-reference.** When the answer depends on multiple pages, cite each — the connections are the value.
6. **Match the user's emotional register.** If the parsed query carries emotion/aesthetic signals (e.g. "calming", "bold"), reflect them in the framing of your answer.`

export function pickModel(intent: ParsedQuery["intent"]): SynthesisModel {
  return intent === "lookup" ? "sonnet" : "opus"
}

export function assembleContext(topK: TopKPage[], index: PageIndex): AssembledPage[] {
  const out: AssembledPage[] = []
  for (const tk of topK) {
    const page = index.bySlug.get(tk.slug)
    if (!page) continue
    out.push({
      ...tk,
      body: page.body,
      tags: page.tags,
      aliases: page.aliases,
      emotionControlled: page.emotionControlled,
    })
  }
  return out
}

function formatPageForPrompt(p: AssembledPage): string {
  const meta: string[] = [`type: ${p.type}`]
  if (p.tags.length) meta.push(`tags: [${p.tags.join(", ")}]`)
  if (p.aliases.length) meta.push(`aliases: [${p.aliases.join(", ")}]`)
  if (p.emotionControlled?.length) meta.push(`emotion: [${p.emotionControlled.join(", ")}]`)
  const metaLine = meta.join("  ")
  const why = p.whySelected ? `(selected because: ${p.whySelected})` : ""
  return [`===== PAGE: ${p.slug} =====`, metaLine, why, "", p.body.trim()].join("\n")
}

function formatParsedForPrompt(parsed: ParsedQuery): string {
  const lines = [`intent: ${parsed.intent}`, `topic: ${parsed.topic}`]
  if (parsed.emotion.length) lines.push(`emotion: [${parsed.emotion.join(", ")}]`)
  if (parsed.emotionControlled.length)
    lines.push(`emotion_controlled: [${parsed.emotionControlled.join(", ")}]`)
  if (parsed.aesthetic.length) lines.push(`aesthetic: [${parsed.aesthetic.join(", ")}]`)
  return lines.join("\n")
}

export type SynthesizeInput = {
  messages: MessageParam[]
  parsed: ParsedQuery
  pages: AssembledPage[]
  onChunk: (text: string) => void
}

export type SynthesizeResult = {
  model: SynthesisModel
  modelId: string
  usage: Anthropic.Messages.Usage
  stopReason: string | null
}

export async function synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")

  const client = new Anthropic({ apiKey })
  const model = pickModel(input.parsed.intent)
  const modelId = model === "opus" ? MODEL_OPUS : MODEL_SONNET

  const scopedBody =
    input.pages.length === 0
      ? "(no pages retrieved — you must say the wiki doesn't cover this)"
      : input.pages.map(formatPageForPrompt).join("\n\n")

  const systemBlocks: TextBlockParam[] = [
    { type: "text", text: SCHEMA_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: `----- PARSED QUERY -----\n${formatParsedForPrompt(input.parsed)}`,
    },
    {
      type: "text",
      text: `----- SCOPED PAGES (${input.pages.length}) -----\n\n${scopedBody}\n\n----- END SCOPED PAGES -----\n\nAnswer the user's question using only the pages above. Cite every claim with [[slug]] where slug matches a PAGE header.`,
    },
  ]

  const stream = await client.messages.stream({
    model: modelId,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages: input.messages,
  })

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      input.onChunk(event.delta.text)
    }
  }

  const final = await stream.finalMessage()
  return {
    model,
    modelId,
    usage: final.usage,
    stopReason: final.stop_reason ?? null,
  }
}
