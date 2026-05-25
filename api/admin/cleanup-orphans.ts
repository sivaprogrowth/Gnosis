/**
 * POST /api/admin/cleanup-orphans — one-shot endpoint to delete the
 * 10 orphan entity pages left behind by the duplicate AI Agent Playbook
 * ingest. The orphan paths are hardcoded so this endpoint can only delete
 * those specific files; it's not a generic file-delete RPC.
 *
 * Auth-gated by the session cookie (same as the other ingest endpoints).
 *
 * TO BE DELETED after one successful run. Recorded in commit history so
 * it can be reverted if anyone wonders where these files went.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { deleteFiles, triggerVercelRebuild } from "../_ingest/githubPush.js"

const ORPHAN_PATHS = [
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
  if (req.method !== "POST") {
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

  try {
    const result = await deleteFiles(
      ORPHAN_PATHS,
      `Cleanup: remove orphan entity pages from duplicate AI Agent Playbook ingest

The first ingest (commit 41be41c5) created 10 entity stub pages. The second
ingest (commit 1124da3c) overwrote the source page but left these entity
pages orphaned — no source references them. Removing.`,
    )
    triggerVercelRebuild("orphan cleanup").catch((e) =>
      console.warn(`[admin/cleanup-orphans] rebuild trigger failed:`, e instanceof Error ? e.message : e),
    )
    res.status(200).json({
      ok: true,
      deleted: ORPHAN_PATHS.length,
      commit: { sha: result.sha, url: result.commitUrl, files: result.files },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[admin/cleanup-orphans] error:", msg)
    res.status(500).json({ error: msg })
  }
}
