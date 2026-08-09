/**
 * GET /api/loop?task=synthesis|resurface|nudges|mirror — learning-loop
 * dispatcher.
 *
 * Triggered on schedule by the progrowth-life-system bot (node-cron on
 * Railway), which authenticates with the shared LIFE_SYSTEM_SECRET; a
 * CRON_SECRET bearer also works so Vercel/GH-Actions scheduling stays
 * possible later.
 *
 * Runs SYNCHRONOUSLY and returns { digests, filed }: the bot posts the
 * digest strings to Discord through its own transport. That keeps every
 * secret where it already lives — no Discord token on Vercel, no new env
 * anywhere. maxDuration 300 bounds a task; tasks carry internal time budgets
 * under that.
 *
 * Query flags: &dry=1 → no commits, no state writes (testing);
 *              &force=1 → mirror ignores its quarter-boundary window.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { runSynthesis, type TaskResult } from "./_loop/synthesis.js"
import { runResurface } from "./_loop/resurface.js"
import { runNudges } from "./_loop/nudges.js"
import { runMirror } from "./_loop/mirror.js"
import { runThemedEmail } from "./_loop/themedEmail.js"

export const config = { maxDuration: 300 }

function authorized(req: VercelRequest): boolean {
  const header = req.headers.authorization || ""
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return false
  const secrets = [process.env.CRON_SECRET, process.env.LIFE_SYSTEM_SECRET]
    .map((s) => (s || "").trim())
    .filter(Boolean)
  return secrets.includes(token)
}

const TASKS: Record<string, (opts: { dry?: boolean; force?: boolean }) => Promise<TaskResult>> = {
  synthesis: (o) => runSynthesis(o),
  resurface: (o) => runResurface(o),
  nudges: (o) => runNudges(o),
  mirror: (o) => runMirror(o),
  themed_email: (o) => runThemedEmail(o),
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" })
    return
  }
  if (!authorized(req)) {
    res.status(401).json({ error: "unauthorized" })
    return
  }

  const task = String(req.query.task || "")
  const run = TASKS[task]
  if (!run) {
    res
      .status(400)
      .json({ error: `unknown task; expected one of ${Object.keys(TASKS).join(", ")}` })
    return
  }

  const opts = { dry: req.query.dry === "1", force: req.query.force === "1" }
  const started = Date.now()
  try {
    const result = await run(opts)
    res.status(200).json({ ok: true, task, ms: Date.now() - started, ...opts, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[loop] task ${task} failed:`, msg)
    res.status(500).json({
      ok: false,
      task,
      error: msg,
      // Give the bot something postable so failures are visible in Discord
      // rather than only in Vercel logs.
      digests: [`🪽 **Hermes** — ${task} failed: ${msg}`],
      filed: [],
    })
  }
}
