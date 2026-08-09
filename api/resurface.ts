/**
 * POST /api/resurface — on-demand resurface for one work context, as JSON.
 *
 * The programmatic face of §4.8 for other systems (the life-system bot's
 * "resurface for X", and eventually GTM-factory briefs): given a context
 * string, return the applicability-ranked hooks WITHOUT committing a wiki
 * page — many resurfaces are operational, consumed once.
 *
 * Auth: Bearer LIFE_SYSTEM_SECRET (same contract as /api/search).
 * Body: { context: string, title?: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { resurfaceForContext } from "./_loop/resurface.js"
import { fetchHighlights } from "./_loop/readwise.js"
import { slugify } from "./_loop/wiki.js"

export const config = { maxDuration: 300 }

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
  const body = (req.body || {}) as { context?: unknown; title?: unknown; secret?: unknown }
  if (!authorized(req, body.secret)) {
    res.status(401).json({ error: "unauthorized" })
    return
  }
  const context = typeof body.context === "string" ? body.context.trim() : ""
  if (!context) {
    res.status(400).json({ error: "context is required" })
    return
  }
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : context.slice(0, 60)

  try {
    const highlights = await fetchHighlights({})
    const r = await resurfaceForContext(
      { slug: slugify(title, 40), title, description: context },
      { highlights },
    )
    res.status(200).json({
      ok: true,
      empty: r.body === null,
      markdown: r.body,
      candidates: r.candidates,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[api/resurface] failed:", msg)
    res.status(500).json({ ok: false, error: msg })
  }
}
