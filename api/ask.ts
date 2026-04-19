/**
 * POST /api/ask — Gnosis wiki retrieval endpoint.
 *
 * Orchestrates the 6-stage retrieval pipeline (see Gnosis-Plan.md §7 and
 * Gnosis-Retrieval-Plan.md):
 *
 *   Stage 1 — parse query (OpenAI gpt-4o-mini, JSON schema)
 *   Stage 2 — candidate retrieval (pure TS, lexical + tag + alias + emotion)
 *   Stage 3 — re-rank (OpenAI gpt-4o-mini, JSON schema)
 *   Stage 4 — assemble scoped context
 *   Stage 5 — synthesize with citations (Anthropic; opus-4-7 / sonnet-4-6 by intent)
 *
 * Streaming contract (unchanged from widget era):
 *   data: {"text":"..."}         — per-token synthesis chunks
 *   data: {"meta":{...}}         — metadata frames ignored by widget, consumed
 *                                  by /chat page. Emitted as each stage completes.
 *   data: {"done":true,...}      — terminal status frame
 *   data: [DONE]                 — terminal sentinel
 *
 * The widget's client only reads `text` and ignores everything else — so the
 * contract remains backwards-compatible until R6 migrates to typed events.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { parseQuery } from "./_retrieval/parse"
import { selectCandidates } from "./_retrieval/candidates"
import { rerank } from "./_retrieval/rerank"
import { assembleContext, synthesize } from "./_retrieval/synthesize"
import { getPageIndex } from "./_retrieval/pageIndex"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server" })
    return
  }

  const body = (req.body || {}) as { messages?: Array<{ role: string; content: string }> }
  const messages = (body.messages || []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  )
  if (messages.length === 0) {
    res.status(400).json({ error: "messages required" })
    return
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  if (!lastUser) {
    res.status(400).json({ error: "no user message in conversation" })
    return
  }

  // --- SSE response setup ---
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }

  const t0 = Date.now()
  try {
    const index = getPageIndex()

    // Stage 1 — parse
    const parsed = await parseQuery(lastUser.content)
    send({
      meta: {
        stage: "parsed",
        data: {
          topic: parsed.topic,
          intent: parsed.intent,
          entities: parsed.entities,
          emotion: parsed.emotion,
          emotion_controlled: parsed.emotionControlled,
          aesthetic: parsed.aesthetic,
          time_scope: parsed.timeScope,
        },
      },
    })
    console.log(
      `[gnosis] parsed in ${Date.now() - t0}ms — intent=${parsed.intent} topic="${parsed.topic}"`,
    )

    // Stage 2 — candidates
    const tCand = Date.now()
    const candidates = selectCandidates(parsed, index)
    send({
      meta: {
        stage: "candidates",
        data: candidates.map((c) => ({
          slug: c.slug,
          type: c.type,
          score: Number(c.score.toFixed(3)),
          signals: c.signals,
        })),
      },
    })
    console.log(
      `[gnosis] candidates in ${Date.now() - tCand}ms — ${candidates.length} of ${index.pages.length}`,
    )

    // Stage 3 — rerank
    const tRank = Date.now()
    const topK = await rerank(parsed, candidates)
    send({
      meta: {
        stage: "top_k",
        data: topK.map((t) => ({
          slug: t.slug,
          type: t.type,
          title: t.title,
          why_selected: t.whySelected,
        })),
      },
    })
    console.log(
      `[gnosis] rerank in ${Date.now() - tRank}ms — K=${topK.length} [${topK
        .map((t) => t.slug)
        .join(", ")}]`,
    )

    // Stage 4 — assemble
    const pages = assembleContext(topK, index)

    // Stage 5 — synthesize (streaming)
    const tSyn = Date.now()
    const result = await synthesize({
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      parsed,
      pages,
      onChunk: (text) => send({ text }),
    })
    console.log(
      `[gnosis] synthesis in ${Date.now() - tSyn}ms — model=${result.model} (${result.modelId})`,
    )

    send({
      done: true,
      model: result.model,
      model_id: result.modelId,
      usage: result.usage,
      stop_reason: result.stopReason,
      timings_ms: {
        total: Date.now() - t0,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[gnosis] error: ${msg}`)
    send({ error: msg })
  } finally {
    res.write("data: [DONE]\n\n")
    res.end()
  }
}
