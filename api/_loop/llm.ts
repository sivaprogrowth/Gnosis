/**
 * llm.ts — single-call helper for loop tasks.
 *
 * The loop's writing tasks (synthesis brief, resurface hooks, reading mirror)
 * are weekly/quarterly and quality-sensitive — the collision-hunt and the
 * "why this matters" hooks are the entire value — so they run on Opus
 * (`claude-opus-5`), unlike the ingest pipeline's high-volume extraction
 * which deliberately runs Sonnet. Cost at loop cadence is a few cents/week.
 */

import Anthropic from "@anthropic-ai/sdk"
import { logAiUsage } from "../_lib/aiUsage.js"

const MODEL_ID = "claude-opus-5"

export async function loopLLM(args: {
  callSite: string // e.g. "loop:synthesis" — ai_usage attribution
  system: string
  user: string
  maxTokens?: number
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server")
  const client = new Anthropic({ apiKey })

  // Stream + finalMessage: large max_tokens (deep thinking passes) trips the
  // SDK's non-streaming timeout ceiling otherwise.
  const stream = client.messages.stream({
    model: MODEL_ID,
    max_tokens: args.maxTokens ?? 8000,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  })
  const response = await stream.finalMessage()
  await logAiUsage(args.callSite, MODEL_ID, response.usage)

  if (response.stop_reason === "refusal") {
    throw new Error(`${args.callSite}: model declined the request (stop_reason=refusal)`)
  }
  const text = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()
  if (!text)
    throw new Error(
      `${args.callSite}: model returned no text (stop_reason=${response.stop_reason})`,
    )
  return text
}
