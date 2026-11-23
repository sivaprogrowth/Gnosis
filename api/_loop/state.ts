/**
 * state.ts — loop bookkeeping in Supabase.
 *
 * The vault CLAUDE.md's manual workflows record runs in a local
 * readwise-state.json; that file never made it onto wiki-archive, and a
 * server-side loop fighting the vault over an untracked JSON file would be
 * asking for sync conflicts. The automated loop keeps its state here instead
 * (gnosis_loop_runs / gnosis_nudges, service-role only) and still appends the
 * human-readable entries to the vault's log.md per spec.
 */

import { supabase } from "../_auth/supabase.js"

export async function recordRun(
  kind: "synthesis" | "resurface" | "nudges" | "mirror" | "themed_email",
  period: string | null,
  filedTo: string | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("gnosis_loop_runs").insert({
    kind,
    period,
    filed_to: filedTo,
    detail: detail ?? null,
  })
  if (error) console.warn(`[loop/state] could not record ${kind} run:`, error.message)
}

/** Most recent run of a kind, optionally for one period. Null when none. */
export async function lastRun(
  kind: string,
  period?: string,
): Promise<{ period: string | null; filed_to: string | null; created_at: string } | null> {
  let q = supabase
    .from("gnosis_loop_runs")
    .select("period, filed_to, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
  if (period) q = q.eq("period", period)
  const { data, error } = await q.maybeSingle()
  if (error) {
    console.warn(`[loop/state] lastRun(${kind}) failed:`, error.message)
    return null
  }
  return data
}

/**
 * Heartbeat for the two scheduled ingests (clippings, reader).
 *
 * A quiet day creates no gnosis_ingest_jobs rows, so the jobs table cannot tell
 * "the cron ran and found nothing" from "the cron never ran". Each wave leaves a
 * row here when it starts and another when it ends (with its summary, or the
 * error). /api/status reads them, and pg-life's watchdog reports a scheduled run
 * that is missing, failed or never finished.
 *
 * Never throws and never delays the ingest: a heartbeat that cannot be written
 * is logged and dropped.
 */
export async function recordCron(
  name: "ingest-clippings" | "ingest-reader",
  phase: "started" | "done" | "failed",
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from("gnosis_loop_runs").insert({
      kind: `cron:${name}`,
      period: new Date().toISOString().slice(0, 10),
      filed_to: null,
      detail: { phase, ...detail },
    })
    if (error) console.warn(`[loop/state] could not record cron ${name} ${phase}:`, error.message)
  } catch (err) {
    console.warn(`[loop/state] could not record cron ${name} ${phase}:`, err instanceof Error ? err.message : err)
  }
}
