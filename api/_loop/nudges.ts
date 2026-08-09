/**
 * nudges.ts — daily spaced-recall delivery.
 *
 * Re-exposes takeaways from previously ingested sources on a deterministic
 * expanding ladder: 2 → 7 → 30 → 90 days after ingest. Passive prose
 * re-exposure has no recall-grading signal, so fixed expanding intervals beat
 * a fake-adaptive algorithm (Readwise Daily Review's own cadence model);
 * cap at 2 sources / ≤3 takeaways per day so the message stays a
 * under-a-minute read instead of homework.
 *
 * Zero LLM calls — the takeaways were written at ingest time; this task only
 * schedules and delivers them.
 *
 * First-run flood guard: a stage whose due date is more than CATCHUP_DAYS in
 * the past is forfeited, not queued — otherwise enabling the loop against a
 * months-old backlog would nudge everything at once.
 */

import { supabase } from "../_auth/supabase.js"
import { recordRun } from "./state.js"
import { isoDate } from "./wiki.js"
import type { TaskResult } from "./synthesis.js"

const STAGES = [2, 7, 30, 90] // days after ingest; stage numbers are 1-based
const CATCHUP_DAYS = 45
const MAX_SOURCES_PER_DAY = 2
const MAX_TAKEAWAYS_PER_SOURCE = 2

interface DueNudge {
  jobId: string
  stage: number
  title: string
  slug: string | null
  takeaways: string[]
  dueAt: number
}

export async function runNudges(opts: { dry?: boolean } = {}): Promise<TaskResult> {
  const { data: jobs, error } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, source_title, takeaways, surfaced_entities, created_at")
    .eq("status", "done")
  if (error) throw new Error(`nudges: could not load jobs: ${error.message}`)

  const { data: sent, error: sentErr } = await supabase
    .from("gnosis_nudges")
    .select("job_id, stage")
  if (sentErr) throw new Error(`nudges: could not load sent log: ${sentErr.message}`)
  const already = new Set((sent ?? []).map((r) => `${r.job_id}:${r.stage}`))

  const now = Date.now()
  const due: (DueNudge & { closeStages: number[] })[] = []
  for (const j of jobs ?? []) {
    const takeaways = Array.isArray(j.takeaways) ? (j.takeaways as string[]).filter(Boolean) : []
    if (!takeaways.length) continue
    const title = j.source_title ?? "Untitled"
    if (/\be2e\b|\btest note\b/i.test(title)) continue // pipeline fixtures aren't reading
    const created = Date.parse(j.created_at)

    // All stages currently due (past their date, unsent, not forfeited).
    // Deliver only the HIGHEST one and close the rest with it — when the
    // 30-day mark has passed, the missed 2- and 7-day nudges are moot, and
    // catch-up mode must not re-show one source day after day.
    const dueStages: number[] = []
    for (let s = 0; s < STAGES.length; s++) {
      const dueAt = created + STAGES[s] * 86_400_000
      if (dueAt > now) break
      if (already.has(`${j.id}:${s + 1}`)) continue
      if (now - dueAt > CATCHUP_DAYS * 86_400_000) {
        dueStages.push(s + 1) // forfeited — close silently, never deliver
        continue
      }
      dueStages.push(s + 1)
    }
    const deliverable = dueStages.filter((s) => {
      const dueAt = created + STAGES[s - 1] * 86_400_000
      return now - dueAt <= CATCHUP_DAYS * 86_400_000
    })
    if (!deliverable.length) continue
    const stage = deliverable[deliverable.length - 1]
    due.push({
      jobId: j.id,
      stage,
      title,
      slug: (j.surfaced_entities as { suggestedSlug?: string } | null)?.suggestedSlug ?? null,
      takeaways,
      dueAt: created + STAGES[stage - 1] * 86_400_000,
      closeStages: dueStages.filter((s) => s <= stage),
    })
  }

  if (!due.length) return { digests: [], filed: [] } // quiet day; no message, no noise

  due.sort((a, b) => a.dueAt - b.dueAt)
  const picks = due.slice(0, MAX_SOURCES_PER_DAY)

  const lines: string[] = [`🪽 **Hermes** — recall (${isoDate(new Date())})`]
  for (const p of picks) {
    // Rotate which takeaways appear as the stages advance, so the 30-day
    // nudge doesn't repeat the 2-day nudge's bullets verbatim.
    const offset = ((p.stage - 1) * MAX_TAKEAWAYS_PER_SOURCE) % p.takeaways.length
    const chosen = [...p.takeaways.slice(offset), ...p.takeaways.slice(0, offset)].slice(
      0,
      MAX_TAKEAWAYS_PER_SOURCE,
    )
    lines.push(``, `**${p.title}** _(read ${STAGES[p.stage - 1]}+ days ago)_`)
    for (const t of chosen) lines.push(`- ${t}`)
    if (p.slug) lines.push(`https://gnosis.progrowth.services/sources/${p.slug}`)
  }

  if (!opts.dry) {
    // Record the delivered stage AND every earlier due stage it superseded,
    // so tomorrow's run doesn't re-nudge the same source at a lower rung.
    const rows = picks.flatMap((p) => p.closeStages.map((stage) => ({ job_id: p.jobId, stage })))
    const { error: insErr } = await supabase.from("gnosis_nudges").insert(rows)
    if (insErr) throw new Error(`nudges: could not record sends: ${insErr.message}`)
    await recordRun("nudges", isoDate(new Date()), null, {
      sent: picks.map((p) => ({ job: p.jobId, stage: p.stage })),
      due_backlog: due.length - picks.length,
    })
  }
  return { digests: [lines.join("\n")], filed: [] }
}
