/**
 * githubPush.ts — commit multiple files to sivaprogrowth/Gnosis@wiki-archive
 * in a single atomic commit, from inside a Vercel function.
 *
 * Auth: $GITHUB_TOKEN env var. Personal PAT scoped to repo Contents:RW per
 * the Q.1 decision (own personal handle, no dedicated bot account).
 *
 * Why blobs+tree+commit instead of the simpler "create/update file" endpoint:
 * the simple endpoint does one file per request and 4 files would mean 4
 * commits in the history. Blobs+tree gives us one commit for an entire ingest
 * (source page + N entity pages + index update) which keeps wiki-archive
 * history clean and easy to revert.
 *
 * Author/committer is tagged "siva (via gnosis)" so blame still distinguishes
 * web-pipeline commits from hand edits, even on a personal PAT.
 */

import { Octokit } from "@octokit/rest"

const REPO_OWNER = "sivaprogrowth"
const REPO_NAME = "Gnosis"
const BRANCH = "wiki-archive"
const AUTHOR_NAME = "siva (via gnosis)"
const AUTHOR_EMAIL = "siva@progrowth.services"

export interface FileToCommit {
  /** path relative to repo root, e.g. "wiki/sources/article-title.md" */
  path: string
  /** UTF-8 content */
  content: string
}

export interface CommitResult {
  sha: string
  commitUrl: string
  files: Array<{ path: string; blobUrl: string }>
}

function octokit(): Octokit {
  const auth = process.env.GITHUB_TOKEN
  if (!auth) throw new Error("GITHUB_TOKEN is not set on the server")
  return new Octokit({ auth })
}

/**
 * Commit `files` to wiki-archive as a single commit with `message`.
 * Returns the new commit SHA + web URLs for the commit and each blob.
 */
export async function commitFiles(files: FileToCommit[], message: string): Promise<CommitResult> {
  if (files.length === 0) throw new Error("commitFiles called with zero files")

  const gh = octokit()

  // 1. Latest commit on the branch
  const { data: ref } = await gh.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
  })
  const parentSha = ref.object.sha

  const { data: parentCommit } = await gh.git.getCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    commit_sha: parentSha,
  })
  const baseTreeSha = parentCommit.tree.sha

  // 2. Create a blob for each file (parallel)
  const blobs = await Promise.all(
    files.map(async (f) => {
      const { data } = await gh.git.createBlob({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        content: f.content,
        encoding: "utf-8",
      })
      return { path: f.path, sha: data.sha }
    }),
  )

  // 3. Build a new tree on top of the base tree with our blobs
  const { data: newTree } = await gh.git.createTree({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    base_tree: baseTreeSha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    })),
  })

  // 4. Create the commit
  const { data: newCommit } = await gh.git.createCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    message,
    tree: newTree.sha,
    parents: [parentSha],
    author: {
      name: AUTHOR_NAME,
      email: AUTHOR_EMAIL,
      date: new Date().toISOString(),
    },
    committer: {
      name: AUTHOR_NAME,
      email: AUTHOR_EMAIL,
      date: new Date().toISOString(),
    },
  })

  // 5. Move the branch ref to the new commit
  await gh.git.updateRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha,
    force: false,
  })

  return {
    sha: newCommit.sha,
    commitUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${newCommit.sha}`,
    files: blobs.map((b) => ({
      path: b.path,
      blobUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${BRANCH}/${b.path}`,
    })),
  }
}

export interface RepoFileSummary {
  name: string
  path: string
  sha: string
  size: number
}

/**
 * List files immediately under a directory on wiki-archive. Returns the
 * shallow contents — does not recurse into subdirectories. Used by the
 * daily clippings cron to find new Clippings/*.md files.
 */
export async function listFilesInDirectory(dirPath: string): Promise<RepoFileSummary[]> {
  const gh = octokit()
  try {
    const { data } = await gh.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: dirPath,
      ref: BRANCH,
    })
    if (!Array.isArray(data)) return []
    return data
      .filter((entry) => entry.type === "file")
      .map((entry) => ({
        name: entry.name,
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
      }))
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) return []
    throw err
  }
}

/**
 * Fetch the current text content of a file on wiki-archive. Returns null
 * if the path doesn't exist (404). Throws on other errors so the caller
 * can decide whether to retry.
 */
export async function getFileContent(path: string): Promise<string | null> {
  const gh = octokit()
  try {
    const { data } = await gh.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
    })
    if (Array.isArray(data) || data.type !== "file") return null
    // GitHub's getContent returns base64 with embedded newlines
    return Buffer.from(data.content, "base64").toString("utf8")
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status === 404) return null
    throw err
  }
}

/**
 * Delete a set of files from wiki-archive in a single commit. Used to clean
 * up orphans left behind by duplicate ingests where the source page was
 * overwritten but the entity stubs from the older run remained.
 *
 * Octokit's git/createTree accepts `sha: null` for a path to remove that
 * file from the new tree. Same atomic-commit shape as commitFiles().
 */
export async function deleteFiles(paths: string[], message: string): Promise<CommitResult> {
  if (paths.length === 0) throw new Error("deleteFiles called with zero paths")

  const gh = octokit()

  const { data: ref } = await gh.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
  })
  const parentSha = ref.object.sha
  const { data: parentCommit } = await gh.git.getCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    commit_sha: parentSha,
  })

  const { data: newTree } = await gh.git.createTree({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    base_tree: parentCommit.tree.sha,
    tree: paths.map((p) => ({
      path: p,
      mode: "100644",
      type: "blob",
      sha: null, // remove
    })),
  })

  const { data: newCommit } = await gh.git.createCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    message,
    tree: newTree.sha,
    parents: [parentSha],
    author: { name: AUTHOR_NAME, email: AUTHOR_EMAIL, date: new Date().toISOString() },
    committer: { name: AUTHOR_NAME, email: AUTHOR_EMAIL, date: new Date().toISOString() },
  })

  await gh.git.updateRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha,
    force: false,
  })

  return {
    sha: newCommit.sha,
    commitUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${newCommit.sha}`,
    files: paths.map((p) => ({
      path: p,
      blobUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${BRANCH}/${p}`,
    })),
  }
}

/**
 * Push an empty trigger commit to `main` to make Vercel rebuild and surface
 * the latest wiki-archive contents on the live site.
 *
 * The build pipeline (scripts/build-content.cjs) pulls wiki-archive at build
 * time, so a commit to wiki-archive alone doesn't trigger a rebuild — only
 * main pushes do. This is the cheapest workaround that needs no extra env
 * vars or Vercel Deploy Hook URL: reuse GITHUB_TOKEN, create an empty commit
 * on main with a clear "Auto-rebuild for ingest" message so the history is
 * grep-able and revertable.
 *
 * Read-modify-write on a shared ref, so it races: two ingests finishing close
 * together both read the same parent and the loser's updateRef is rejected as
 * a non-fast-forward. That ingest's pages then sit on wiki-archive with no
 * rebuild — committed but invisible on the live site. Hence the retry: re-read
 * the head and rebuild the empty commit on the new parent.
 */
const REBUILD_MAX_ATTEMPTS = 4

function isFastForwardConflict(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const msg = err instanceof Error ? err.message.toLowerCase() : ""
  // GitHub answers 422 "Update is not a fast forward" when we lost the race.
  return status === 422 || status === 409 || msg.includes("fast forward")
}

export async function triggerVercelRebuild(reason: string): Promise<string> {
  const gh = octokit()

  let lastErr: unknown
  for (let attempt = 1; attempt <= REBUILD_MAX_ATTEMPTS; attempt++) {
    // 1. Latest commit on main — re-read every attempt; on a retry the head
    //    has moved, which is precisely why the previous attempt failed.
    const { data: ref } = await gh.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: "heads/main",
    })
    const parentSha = ref.object.sha
    const { data: parentCommit } = await gh.git.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      commit_sha: parentSha,
    })

    // 2. Empty commit (re-use the parent's tree)
    const { data: newCommit } = await gh.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Auto-rebuild: ${reason}\n\nEmpty commit to trigger Vercel rebuild — picks up latest wiki-archive content via scripts/build-content.cjs.`,
      tree: parentCommit.tree.sha,
      parents: [parentSha],
      author: {
        name: AUTHOR_NAME,
        email: AUTHOR_EMAIL,
        date: new Date().toISOString(),
      },
      committer: {
        name: AUTHOR_NAME,
        email: AUTHOR_EMAIL,
        date: new Date().toISOString(),
      },
    })

    try {
      await gh.git.updateRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: "heads/main",
        sha: newCommit.sha,
        force: false,
      })
      return newCommit.sha
    } catch (err) {
      lastErr = err
      if (!isFastForwardConflict(err) || attempt === REBUILD_MAX_ATTEMPTS) throw err
      const backoffMs = 500 * attempt
      console.warn(
        `[githubPush] rebuild trigger lost a race on heads/main (attempt ${attempt}/${REBUILD_MAX_ATTEMPTS}); retrying in ${backoffMs}ms`,
      )
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Could not push rebuild trigger after ${REBUILD_MAX_ATTEMPTS} attempts`)
}
