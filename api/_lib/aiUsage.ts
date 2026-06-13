import { supabase } from "../_auth/supabase.js"

// Per-token USD rates by model family (input, output). Cache reads bill at
// 0.1x input; cache writes (5-minute TTL) at 1.25x input.
function rates(model: string): { in: number; out: number } {
  const m = model.toLowerCase()
  if (m.includes("haiku")) return { in: 1e-6, out: 5e-6 }
  if (m.includes("opus")) return { in: 5e-6, out: 25e-6 }
  if (m.includes("sonnet")) return { in: 3e-6, out: 15e-6 }
  return { in: 3e-6, out: 15e-6 } // unknown → assume sonnet-tier
}

// Usage objects come from both the SDK (typed) and raw JSON, so accept
// `unknown` and narrow defensively.
function readUsage(u: unknown): {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
} {
  const o = (u ?? {}) as Record<string, unknown>
  const n = (v: unknown) => (typeof v === "number" ? v : 0)
  return {
    input: n(o.input_tokens),
    output: n(o.output_tokens),
    cacheRead: n(o.cache_read_input_tokens),
    cacheWrite: n(o.cache_creation_input_tokens),
  }
}

export function estimateCostUsd(model: string, usage: unknown): number {
  const r = rates(model)
  const { input, output, cacheRead, cacheWrite } = readUsage(usage)
  return input * r.in + output * r.out + cacheRead * r.in * 0.1 + cacheWrite * r.in * 1.25
}

/**
 * Record one Anthropic API call's token usage + estimated cost to the
 * ai_usage table, tagged with `callSite` for per-feature spend attribution.
 * Best-effort: never throws, so a logging failure can't break the caller.
 */
export async function logAiUsage(callSite: string, model: string, usage: unknown): Promise<void> {
  const { input, output, cacheRead, cacheWrite } = readUsage(usage)
  const cost = estimateCostUsd(model, usage)
  console.log(`[ai_usage] ${callSite} ${model} in=${input} out=${output} cost=$${cost.toFixed(6)}`)
  try {
    const { error } = await supabase.from("ai_usage").insert({
      call_site: callSite,
      model,
      input_tokens: input,
      output_tokens: output,
      cache_read_tokens: cacheRead,
      cache_creation_tokens: cacheWrite,
      cost_usd: Number(cost.toFixed(6)),
    })
    if (error) console.warn(`[ai_usage] insert failed for ${callSite}: ${error.message}`)
  } catch (err) {
    console.warn(
      `[ai_usage] insert threw for ${callSite}:`,
      err instanceof Error ? err.message : err,
    )
  }
}
