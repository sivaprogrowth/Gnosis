/**
 * GET /api/status — read-only health and cost report for pg-life's watchdog.
 *
 * Gnosis has no alarm of its own: a scheduled ingest that never ran, a job that
 * failed, or one that says "done" with nothing committed is only noticed when a
 * page turns out to be missing. pg-life (progrowth-life-system) already runs a
 * daily watchdog for its own jobs; this gives it what it needs to cover Gnosis
 * too, and one cost view across both systems. Stage 1 of running the two as one
 * system: nothing moves, pg-life only reads.
 *
 * Auth: Bearer LIFE_SYSTEM_SECRET (the secret the two systems already share).
 * Query: ?hours=<1..168> for the job and heartbeat window (default 26), and
 *        ?cost_days=<1..60> for the AI cost window (default 14).
 * No writes. No page content: titles, ids, statuses, counts and costs only.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "./_auth/supabase.js"

export const config = { maxDuration: 30 }

/** The scheduled ingests in vercel.json, in UTC. Kept here so the reader knows what to expect. */
const CRONS = [
  { name: "ingest-clippings", schedule: "0 5,15 * * *" },
  { name: "ingest-reader", schedule: "30 16 * * *" },
] as const

/** A job in one of these states for longer than STUCK_MINUTES has stalled. */
const IN_FLIGHT = ["queued", "fetching", "discussing", "synthesizing", "committing"]
const STUCK_MINUTES = 30

function authorized(req: VercelRequest): boolean {
  const expected = (process.env.LIFE_SYSTEM_SECRET || "").trim()
  if (!expected) return false
  const m = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() === expected
}

function intParam(v: unknown, def: number, min: number, max: number): number {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : def
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

  const hours = intParam(req.query.hours, 26, 1, 168)
  const costDays = intParam(req.query.cost_days, 14, 1, 60)
  const now = Date.now()
  const since = new Date(now - hours * 3600_000).toISOString()
  const costSince = new Date(now - costDays * 86_400_000).toISOString()
  const stuckBefore = new Date(now - STUCK_MINUTES * 60_000).toISOString()
  const jobCols = "id, source_type, source_title, status, commit_sha, committed_files, error_message, created_at, updated_at"

  const [beats, jobs, stuck, loop, usage] = await Promise.all([
    supabase.from("gnosis_loop_runs").select("kind, detail, created_at").like("kind", "cron:%").gte("created_at", since).order("created_at", { ascending: true }).limit(500),
    supabase.from("gnosis_ingest_jobs").select(jobCols).gte("updated_at", since).order("updated_at", { ascending: false }).limit(500),
    supabase.from("gnosis_ingest_jobs").select(jobCols).in("status", IN_FLIGHT).lt("updated_at", stuckBefore).order("updated_at", { ascending: true }).limit(50),
    supabase.from("gnosis_loop_runs").select("kind, period, filed_to, created_at").not("kind", "like", "cron:%").order("created_at", { ascending: false }).limit(60),
    supabase.from("ai_usage").select("created_at, call_site, model, cost_usd").gte("created_at", costSince).limit(5000),
  ])
  const failedRead = [beats, jobs, stuck, loop, usage].find((r) => r.error)
  if (failedRead?.error) {
    res.status(500).json({ error: `status read failed: ${failedRead.error.message}` })
    return
  }

  type Job = { id: string; source_type: string; source_title: string | null; status: string; commit_sha: string | null; committed_files: unknown; error_message: string | null; created_at: string; updated_at: string }
  const brief = (j: Job) => ({ id: j.id, source_type: j.source_type, title: (j.source_title ?? "").slice(0, 120), status: j.status, updated_at: j.updated_at, error: j.error_message ? j.error_message.slice(0, 300) : null })
  const all = (jobs.data ?? []) as Job[]
  const byStatus: Record<string, number> = {}
  for (const j of all) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1
  // "Done" must mean something was committed to the vault.
  const doneWithoutCommit = all.filter((j) => j.status === "done" && (!j.commit_sha || !Array.isArray(j.committed_files) || j.committed_files.length === 0))

  const heartbeats = ((beats.data ?? []) as Array<{ kind: string; detail: Record<string, unknown> | null; created_at: string }>).map((b) => ({
    cron: b.kind.replace(/^cron:/, ""),
    at: b.created_at,
    phase: String(b.detail?.phase ?? ""),
    wave: Number(b.detail?.wave ?? 0),
    processed: typeof b.detail?.processed === "number" ? b.detail.processed : null,
    remaining: typeof b.detail?.remaining === "number" ? b.detail.remaining : null,
    error: typeof b.detail?.error === "string" ? b.detail.error : null,
  }))

  const lastLoop: Record<string, { at: string; period: string | null; filed_to: string | null }> = {}
  for (const r of (loop.data ?? []) as Array<{ kind: string; period: string | null; filed_to: string | null; created_at: string }>) {
    if (!lastLoop[r.kind]) lastLoop[r.kind] = { at: r.created_at, period: r.period, filed_to: r.filed_to }
  }

  // AI cost per day, call site and model: small enough to send whole.
  const cost = new Map<string, { day: string; call_site: string; model: string; calls: number; cost_usd: number }>()
  for (const u of (usage.data ?? []) as Array<{ created_at: string; call_site: string; model: string; cost_usd: number | string | null }>) {
    const day = u.created_at.slice(0, 10)
    const key = `${day}|${u.call_site}|${u.model}`
    const row = cost.get(key) ?? { day, call_site: u.call_site, model: u.model, calls: 0, cost_usd: 0 }
    row.calls += 1
    row.cost_usd += Number(u.cost_usd ?? 0)
    cost.set(key, row)
  }

  res.setHeader("Cache-Control", "no-store")
  res.status(200).json({
    service: "gnosis-status",
    version: 1,
    generated_at: new Date(now).toISOString(),
    window_hours: hours,
    crons: CRONS,
    heartbeats,
    jobs: {
      by_status: byStatus,
      failed: all.filter((j) => j.status === "failed").slice(0, 25).map(brief),
      done_without_commit: doneWithoutCommit.slice(0, 25).map(brief),
      stuck: ((stuck.data ?? []) as Job[]).map(brief),
    },
    loop_last_run: lastLoop,
    ai_cost: {
      days: costDays,
      rows: [...cost.values()].map((r) => ({ ...r, cost_usd: Number(r.cost_usd.toFixed(6)) })).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.cost_usd - a.cost_usd)),
      // The OpenAI parse and rerank calls in /api/ask are not logged to ai_usage, so they are not in this total.
      not_included: "OpenAI calls made by /api/ask",
    },
  })
}
