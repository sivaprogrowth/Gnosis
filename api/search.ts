/**
 * POST /api/search — lightweight, Bearer-secured wiki search for the
 * progrowth-life-system app. Unlike /api/ask (session-gated, SSE, LLM
 * synthesis), this runs ONLY the lexical candidate-retrieval stage
 * (pageIndex + token/tag/alias scoring) and returns ranked top-K results.
 * No OpenAI/Anthropic calls — fast enough for an inline "search Gnosis" box.
 *
 * Auth: Bearer LIFE_SYSTEM_SECRET (also accepted as body.secret).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getPageIndex } from "./_retrieval/pageIndex.js"
import { selectCandidates } from "./_retrieval/candidates.js"
import { tokenize } from "./_retrieval/tokenize.js"
import type { ParsedQuery } from "./_retrieval/types.js"

export const config = { maxDuration: 60 }

function authorized(req: VercelRequest, bodySecret?: unknown): boolean {
  const expected = (process.env.LIFE_SYSTEM_SECRET || "").trim()
  if (!expected) return false
  const header = req.headers.authorization || ""
  const m = header.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim() ?? (typeof bodySecret === "string" ? bodySecret.trim() : "")
  return token === expected
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" })
    return
  }
  const body = (req.body || {}) as { query?: unknown; q?: unknown; limit?: unknown; secret?: unknown }
  if (!authorized(req, body.secret)) {
    res.status(401).json({ error: "unauthorized" })
    return
  }

  const query =
    typeof body.query === "string" ? body.query.trim() : typeof body.q === "string" ? body.q.trim() : ""
  if (!query) {
    res.status(400).json({ error: "query is required" })
    return
  }
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(Math.floor(body.limit), 20) : 8

  try {
    const index = getPageIndex()
    const parsed: ParsedQuery = {
      raw: query,
      topic: query,
      intent: "lookup",
      entities: [],
      tokens: tokenize(query),
      emotion: [],
      emotionControlled: [],
      aesthetic: [],
      timeScope: "any",
    }
    const results = selectCandidates(parsed, index)
      .slice(0, limit)
      .map((c) => ({ slug: c.slug, title: c.title, type: c.type, score: c.score, preview: c.preview }))

    res.setHeader("Cache-Control", "no-store")
    res.status(200).json({ ok: true, query, results })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[api/search] failed:", error)
    res.status(500).json({ error })
  }
}
