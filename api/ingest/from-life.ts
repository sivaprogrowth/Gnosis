/**
 * POST /api/ingest/from-life — Bearer-secured clipping ingest from the
 * progrowth-life-system app (e.g. a finished book). Unlike /api/ingest/url
 * (session-gated, human-in-loop), this runs the clipping pipeline and
 * AUTO-COMMITS: synthesize → commit, no awaiting_user step. Fire-and-forget
 * from the caller's POV — returns 202 with a jobId; synth+commit (~90s) run in
 * waitUntil(). runCommit() fires the reverse life-system sync itself.
 *
 * Auth: Bearer LIFE_SYSTEM_SECRET (same shared secret as the reverse webhook),
 * also accepted as body.secret (mirrors the reader-webhook pattern).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { supabase } from "../_auth/supabase.js"
import { runSynthesisOnly, runCommit, markJobFailed } from "../_ingest/pipeline.js"

export const config = { maxDuration: 300 }

function authorized(req: VercelRequest, bodySecret?: unknown): boolean {
  const expected = (process.env.LIFE_SYSTEM_SECRET || "").trim()
  if (!expected) return false
  const header = req.headers.authorization || ""
  const m = header.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim() ?? (typeof bodySecret === "string" ? bodySecret.trim() : "")
  return token === expected
}

async function autoCommit(jobId: string): Promise<void> {
  try {
    await runSynthesisOnly(jobId) // synthesize → status awaiting_user
    await runCommit(jobId, () => {}) // commit wiki files + fire syncToLifeSystem
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ingest/from-life] auto-commit failed for ${jobId}:`, msg)
    await markJobFailed(jobId, msg).catch(() => {})
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" })
    return
  }
  const body = (req.body || {}) as { title?: unknown; markdown?: unknown; sourceUrl?: unknown; secret?: unknown }
  if (!authorized(req, body.secret)) {
    res.status(401).json({ error: "unauthorized" })
    return
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""
  const markdown = typeof body.markdown === "string" ? body.markdown.trim() : ""
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : ""
  if (!title || !markdown) {
    res.status(400).json({ error: "title and markdown are required" })
    return
  }

  const { data: job, error } = await supabase
    .from("gnosis_ingest_jobs")
    .insert({
      source_type: "clipping",
      source_url: sourceUrl || null,
      source_title: title,
      raw_markdown: markdown,
      status: "discussing", // skip 'fetching' — content is already supplied
      progress_message: "Synthesizing source page + entities…",
      requested_by: "life-system",
    })
    .select("id")
    .single()
  if (error || !job) {
    console.error("[ingest/from-life] job insert failed:", error)
    res.status(500).json({ error: "could not create job" })
    return
  }

  waitUntil(autoCommit(job.id))
  res.status(202).json({ ok: true, jobId: job.id })
}
