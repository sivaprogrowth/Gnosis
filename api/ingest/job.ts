/**
 * GET /api/ingest/job?id=<uuid> — poll for the current state of an ingest job.
 *
 * Used by the /ingest frontend after POST to /api/ingest/url or /api/ingest/pdf
 * returns a jobId. The frontend polls every 2s.
 *
 * Response shape:
 *   {
 *     status: 'queued'|'fetching'|'discussing'|'awaiting_user'|...|'failed'|'done',
 *     progressMessage: string,
 *     sourceTitle: string|null,
 *     sourceUrl: string|null,
 *     sourceFilename: string|null,
 *     // populated once status='awaiting_user':
 *     ready?: { takeaways, promote, inline, suggestedSlug, sourceDomain },
 *     // populated once status='done':
 *     commit?: { sha, commitUrl, files }
 *     // populated when status='failed':
 *     errorMessage?: string
 *   }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"
import { deleteFiles, triggerVercelRebuild } from "../_ingest/githubPush.js"

// One-shot admin op: paths from the duplicate AI Agent Playbook ingest
// whose source page got overwritten but entity stubs remained orphaned.
// Triggered via POST { action: "cleanup-orphans" } on this endpoint so
// we don't burn a separate serverless function slot (Vercel's per-deploy
// function limit is tight on the current plan).
const AGENT_PLAYBOOK_ORPHANS = [
  "wiki/companies/saastr.md",
  "wiki/companies/intercom.md",
  "wiki/people/jason-lemkin.md",
  "wiki/concepts/forward-deployed-engineer.md",
  "wiki/concepts/hyper-segmentation.md",
  "wiki/concepts/copy-your-best-human-framework.md",
  "wiki/concepts/ai-native-organisation.md",
  "wiki/concepts/ai-sdr.md",
  "wiki/concepts/model-context-protocol.md",
  "wiki/concepts/90-10-buy-vs-build.md",
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const cookieHeader = req.headers.cookie || ""
  const sessionMatch = cookieHeader.match(/(?:^|; )session=([^;]+)/)
  const sessionToken = sessionMatch?.[1]
  const session = sessionToken ? verifySessionToken(sessionToken) : null
  if (!session) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  // POST dispatch for one-shot admin actions (orphan cleanup). We piggyback
  // on this endpoint instead of a dedicated /api/admin/* to avoid bumping
  // the deployed-function count over the plan limit. Action is hardcoded
  // so this is not a generic delete RPC.
  if (req.method === "POST") {
    const body = (req.body || {}) as { action?: unknown }
    if (body.action === "cleanup-orphans") {
      try {
        const result = await deleteFiles(
          AGENT_PLAYBOOK_ORPHANS,
          `Cleanup: remove orphan entity pages from duplicate AI Agent Playbook ingest

The first ingest (commit 41be41c5) created 10 entity stub pages. The second
ingest (commit 1124da3c) overwrote the source page but left these entity
pages orphaned — no source references them. Removing.`,
        )
        triggerVercelRebuild("orphan cleanup").catch((e) =>
          console.warn(`[ingest/job] rebuild trigger failed:`, e instanceof Error ? e.message : e),
        )
        res.status(200).json({
          ok: true,
          deleted: AGENT_PLAYBOOK_ORPHANS.length,
          commit: { sha: result.sha, url: result.commitUrl, files: result.files },
        })
        return
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[ingest/job cleanup-orphans] error:", msg)
        res.status(500).json({ error: msg })
        return
      }
    }
    res.status(400).json({ error: "Unknown POST action" })
    return
  }

  const idRaw = req.query.id
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "id query param required" })
    return
  }

  const { data, error } = await supabase
    .from("gnosis_ingest_jobs")
    .select("id, status, progress_message, source_url, source_title, source_filename, takeaways, surfaced_entities, error_message, commit_sha, committed_files, requested_by")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[ingest/job] supabase error:", error)
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  // Only the requester can see their own jobs
  if (data.requested_by !== session.email) {
    res.status(403).json({ error: "Forbidden" })
    return
  }

  const response: Record<string, unknown> = {
    jobId: data.id,
    status: data.status,
    progressMessage: data.progress_message,
    sourceTitle: data.source_title,
    sourceUrl: data.source_url,
    sourceFilename: data.source_filename,
  }

  if (data.status === "awaiting_user" && data.surfaced_entities) {
    const surfaced = data.surfaced_entities as {
      promote?: unknown[]
      inline?: unknown[]
      suggestedSlug?: string
    }
    response.ready = {
      takeaways: data.takeaways ?? [],
      promote: surfaced.promote ?? [],
      inline: surfaced.inline ?? [],
      suggestedSlug: surfaced.suggestedSlug ?? "",
      sourceDomain: data.source_url
        ? (() => {
            try {
              return new URL(data.source_url).hostname
            } catch {
              return data.source_url ?? ""
            }
          })()
        : "pdf-upload",
    }
  }

  if (data.status === "done" && data.commit_sha) {
    response.commit = {
      sha: data.commit_sha,
      commitUrl: `https://github.com/sivaprogrowth/Gnosis/commit/${data.commit_sha}`,
      files: data.committed_files ?? [],
    }
  }

  if (data.status === "failed" && data.error_message) {
    response.errorMessage = data.error_message
  }

  res.setHeader("Cache-Control", "no-store")
  res.status(200).json(response)
}
