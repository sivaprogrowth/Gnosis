/**
 * wiki.ts — shared helpers for loop tasks that file query pages.
 *
 * Every filed page goes into the same atomic wiki-archive commit as its log.md
 * entry (per vault CLAUDE.md: query workflows append one log line), then the
 * site rebuild is triggered. Reuses the ingest pipeline's GitHub plumbing.
 */

import { commitFiles, getFileContent, triggerVercelRebuild } from "../_ingest/githubPush.js"

/** ISO-8601 week (Thursday rule). Returns e.g. { year: 2026, week: 32 }. */
export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Shift to the Thursday of this week; its year is the ISO year.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: t.getUTCFullYear(), week }
}

export function isoWeekLabel(d: Date): string {
  const { year, week } = isoWeek(d)
  return `${year}-W${String(week).padStart(2, "0")}`
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** kebab-case slug, ASCII-only, bounded — same convention as ingest slugs. */
export function slugify(s: string, max = 60): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/, "") || "untitled"
  )
}

/**
 * Commit a query page + its log.md entry in one atomic commit, then trigger
 * the site rebuild. Returns the commit sha.
 *
 * `logLine` is the vault convention: `query | weekly synthesis brief — ...`
 * (the `## [timestamp]` prefix is added here).
 */
export async function commitQueryPage(args: {
  path: string
  content: string
  message: string
  logLine: string
}): Promise<string> {
  const now = new Date()
  const stamp = `${isoDate(now)} ${now.toISOString().slice(11, 16)}`
  const entry = `\n## [${stamp}] ${args.logLine}\n`

  const files: Array<{ path: string; content: string }> = [
    { path: args.path, content: args.content },
  ]
  const log = await getFileContent("log.md")
  if (log !== null) {
    files.push({ path: "log.md", content: log.trimEnd() + "\n" + entry })
  }

  const result = await commitFiles(files, args.message)
  triggerVercelRebuild(args.message.split("\n")[0]).catch((e) =>
    console.warn(`[loop/wiki] rebuild trigger failed:`, e instanceof Error ? e.message : e),
  )
  return result.sha
}

/** True when a path already exists on wiki-archive (idempotent re-runs). */
export async function pageExists(path: string): Promise<boolean> {
  return (await getFileContent(path)) !== null
}
