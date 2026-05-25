/**
 * compoundingFilter.ts — second Anthropic pass that decides which surfaced
 * entities meet the **compounding rule**: only promote an entity to its own
 * wiki page if at least one existing page (or the new source page) would
 * plausibly cite it. Otherwise it stays as an inline mention.
 *
 * Why a separate call rather than asking synthesize.ts to decide: synthesize
 * sees the article in isolation. The compounding judgment requires seeing the
 * existing wiki — which entities the wiki already discusses, and which
 * neighbouring topics could plausibly link to this entity. Keeping the two
 * calls separate also lets us tune temperature/prompt independently — the
 * compounding call should be more conservative than synthesis.
 *
 * Per Q.3 decision: this is the chosen strategy (separate LLM filter) over
 * "default to inline only" or "user opt-in checklist".
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Tool } from "@anthropic-ai/sdk/resources/messages"
import type { SynthesizedEntity } from "./synthesize.js"

const MODEL_ID = "claude-sonnet-4-6"
const MAX_TOKENS = 2000

export interface ExistingPageSummary {
  slug: string
  type: string
  title: string
}

export interface PromotionDecision {
  name: string
  type: string
  /** Slug the new entity page should use if promoted, kebab-case */
  suggestedSlug: string
  /** Why this passes the compounding bar (single sentence) */
  rationale: string
}

export interface CompoundingFilterResult {
  promote: PromotionDecision[]
  inline: Array<{ name: string; type: string; reason: string }>
}

const SYSTEM_PROMPT = `You are the compounding-bar judge in a personal LLM wiki ingest pipeline.

The wiki has a strict rule: a new entity page is created ONLY if at least one existing wiki page (or the new source being ingested) would plausibly cite it. The point is to keep the wiki dense with cross-links rather than littered with stub pages that nothing references.

You will receive:
- A list of EXISTING wiki pages (slug, type, title)
- A list of CANDIDATE entities surfaced by the synthesize pass (name, type, context)
- A short SUMMARY of the new source page being ingested

For each candidate, decide:
- promote: the entity belongs in its own wiki page. Include rationale.
- inline: the entity is mentioned but doesn't earn its own page. Include reason.

Be conservative. When in doubt, choose inline. Promotion criteria, any one of:
1. Two or more existing pages discuss adjacent topics that would naturally cite this entity.
2. The entity is a well-defined framework, method, or concept (not just a person mentioned in passing) that the user will likely want to reference repeatedly.
3. The entity is a named person, company, or tool that the user clearly tracks (i.e., similar entities already have pages).

Do NOT promote: passing references, one-off citations, generic categories, or things that would only ever be cited by the source page itself.`

export async function compoundingFilter(args: {
  candidates: SynthesizedEntity[]
  existingPages: ExistingPageSummary[]
  sourceSummary: string
}): Promise<CompoundingFilterResult> {
  if (args.candidates.length === 0) {
    return { promote: [], inline: [] }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server")

  const client = new Anthropic({ apiKey })

  // Compact representation — minimise tokens while preserving signal
  const existingPagesText = args.existingPages
    .map((p) => `${p.type}/${p.slug} — ${p.title}`)
    .join("\n")

  const candidatesText = args.candidates
    .map((c, i) => `${i + 1}. [${c.type}] ${c.name} — ${c.context}`)
    .join("\n")

  const userPrompt = `EXISTING WIKI PAGES (${args.existingPages.length} total):
${existingPagesText}

NEW SOURCE PAGE SUMMARY:
${args.sourceSummary}

CANDIDATE ENTITIES (${args.candidates.length}):
${candidatesText}

Decide promote vs inline for each candidate. Emit the structured decision via the compounding_decision tool.`

  const tool: Tool = {
    name: "compounding_decision",
    description: "Emit the promote/inline split for the candidate entities.",
    input_schema: {
      type: "object",
      properties: {
        promote: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              suggestedSlug: {
                type: "string",
                pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              },
              rationale: { type: "string" },
            },
            required: ["name", "type", "suggestedSlug", "rationale"],
          },
        },
        inline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              reason: { type: "string" },
            },
            required: ["name", "type", "reason"],
          },
        },
      },
      required: ["promote", "inline"],
    },
  }

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: "compounding_decision" },
    messages: [{ role: "user", content: userPrompt }],
  })

  const block = response.content.find((b) => b.type === "tool_use")
  if (!block || block.type !== "tool_use") {
    throw new Error(
      `Compounding filter returned no tool_use block (stop_reason=${response.stop_reason})`,
    )
  }
  return block.input as CompoundingFilterResult
}
