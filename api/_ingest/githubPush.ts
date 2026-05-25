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
export async function commitFiles(
  files: FileToCommit[],
  message: string,
): Promise<CommitResult> {
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
