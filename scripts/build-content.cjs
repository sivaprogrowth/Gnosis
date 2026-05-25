#!/usr/bin/env node
/*
 * build-content.cjs — Build-time content pipeline for gnosis-main.
 *
 * Populates content/ from the canonical Gnosis vault, strips ProGrowth-private
 * sections, and overlays hand-maintained files from content_overrides/. Runs
 * before generate-dataview.cjs and Quartz build.
 *
 * Replaces the old "edit wiki/ → run sync-wiki.sh → commit content/ → push"
 * flow with "edit wiki/ → `npm run build` reads it live."
 *
 * Vault source resolution (two paths):
 *   1. Local — `$WIKI_SRC` (or `~/Projects/gnosis/wiki/`) exists on disk →
 *      use it directly. The normal local-dev path.
 *   2. Fallback — clone the vault from GitHub (`$VAULT_REPO_URL`@`$VAULT_REPO_BRANCH`,
 *      defaults to sivaprogrowth/Gnosis@wiki-archive) into a temp dir and use
 *      its `wiki/` subdirectory. This is what runs on Vercel auto-builds.
 *      Honors `$VAULT_REPO_TOKEN` or `$GITHUB_TOKEN` for private-repo auth.
 *
 * Inputs:
 *   $WIKI_SRC          (default: ~/Projects/gnosis/wiki/)
 *   $VAULT_REPO_URL    (default: https://github.com/sivaprogrowth/Gnosis.git)
 *   $VAULT_REPO_BRANCH (default: wiki-archive)
 *   $VAULT_REPO_TOKEN  (optional — for private vault repos)
 *   $GITHUB_TOKEN      (optional — falls back to this if VAULT_REPO_TOKEN unset)
 *   content_overrides/ (hand-maintained files merged on top: index.md, chat.md)
 *
 * Output:
 *   content/{sources,entities,concepts,people,companies,projects,inspiration,queries}/*.md
 *   content/{index.md,chat.md}  (from content_overrides/)
 */

const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")
const os = require("node:os")

const ROOT = path.resolve(__dirname, "..")
const DEFAULT_WIKI_SRC = path.join(os.homedir(), "Projects/gnosis/wiki")
const DEFAULT_VAULT_REPO_URL = "https://github.com/sivaprogrowth/Gnosis.git"
const DEFAULT_VAULT_REPO_BRANCH = "wiki-archive"
const CONTENT_DIR = path.join(ROOT, "content")
const OVERRIDES_DIR = path.join(ROOT, "content_overrides")
const STRIPPER = path.join(__dirname, "strip-progrowth-sections.sh")

// Track temp dirs we created so we can clean up on exit.
const tempDirsToCleanup = []

// Subfolders copied from the canonical vault. Order matches sync-wiki.sh.
const VAULT_SUBFOLDERS = [
  "sources",
  "entities",
  "concepts",
  "people",
  "companies",
  "projects",
  "inspiration",
  "queries",
]

// Top-level files in content/ that are *not* part of the synced subfolders.
// Preserved across runs so per-build artifacts (dashboard.md from
// generate-dataview.cjs) and hand-maintained overrides survive a re-run.
const PRESERVE_FILES = new Set([".gitkeep", "dashboard.md"])

// -------- helpers --------

function log(msg) {
  process.stdout.write(`→ ${msg}\n`)
}

function fail(msg) {
  process.stderr.write(`ERROR: ${msg}\n`)
  process.exit(1)
}

/**
 * Resolve the path to the vault's wiki/ directory. Two strategies, tried in order:
 *
 *   1. Local — $WIKI_SRC (or default ~/Projects/gnosis/wiki) exists on disk → return it.
 *   2. Fallback — shallow-clone the vault from GitHub and return the cloned wiki/ path.
 *
 * Strategy 2 is what runs on Vercel auto-builds (the local path won't exist on Vercel).
 */
function resolveWikiSrc() {
  const localPath = path.resolve(process.env.WIKI_SRC || DEFAULT_WIKI_SRC)
  if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
    log(`  Source: ${localPath} (local)`)
    return localPath
  }

  const repoUrl = process.env.VAULT_REPO_URL || DEFAULT_VAULT_REPO_URL
  const branch = process.env.VAULT_REPO_BRANCH || DEFAULT_VAULT_REPO_BRANCH
  const token = process.env.VAULT_REPO_TOKEN || process.env.GITHUB_TOKEN

  // Inject token into HTTPS URL for private-repo auth, if provided.
  let cloneUrl = repoUrl
  if (token && repoUrl.startsWith("https://github.com/")) {
    cloneUrl = repoUrl.replace("https://github.com/", `https://x-access-token:${token}@github.com/`)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gnosis-vault-"))
  tempDirsToCleanup.push(tmpDir)

  log(`  Source: ${localPath} — not found; falling back to GitHub clone`)
  log(`  Cloning ${repoUrl}#${branch} → ${tmpDir} (shallow, single-branch)...`)
  try {
    execFileSync(
      "git",
      [
        "clone",
        "--depth=1",
        "--single-branch",
        "--branch", branch,
        cloneUrl,
        tmpDir,
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    )
  } catch (e) {
    fail(
      `Failed to clone vault repo (${repoUrl}#${branch}): ${e.message}\n` +
        `  If the repo is private, set $VAULT_REPO_TOKEN to a GitHub PAT with read access.`,
    )
  }

  const wikiInClone = path.join(tmpDir, "wiki")
  if (!fs.existsSync(wikiInClone) || !fs.statSync(wikiInClone).isDirectory()) {
    fail(`Cloned repo (${repoUrl}#${branch}) does not contain a wiki/ subdirectory at top level.`)
  }
  log(`  Cloned vault — using ${path.relative(ROOT, wikiInClone)}/`)
  return wikiInClone
}

// Best-effort cleanup of any temp dirs we created.
function cleanupTempDirs() {
  for (const dir of tempDirsToCleanup) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (_) {
      // ignore — cleanup is best-effort
    }
  }
}
process.on("exit", cleanupTempDirs)
process.on("SIGINT", () => {
  cleanupTempDirs()
  process.exit(130)
})

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
  }
}

function copyMarkdownFiles(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return 0
  fs.mkdirSync(dstDir, { recursive: true })
  let count = 0
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith(".md")) continue
    fs.copyFileSync(path.join(srcDir, entry.name), path.join(dstDir, entry.name))
    count++
  }
  return count
}

function copyOverrides(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return 0
  let count = 0
  // Walk overrides recursively so e.g. content_overrides/sources/foo.md
  // would overlay content/sources/foo.md.
  function walk(rel) {
    const absSrc = path.join(srcDir, rel)
    const absDst = path.join(dstDir, rel)
    for (const entry of fs.readdirSync(absSrc, { withFileTypes: true })) {
      const childRel = path.join(rel, entry.name)
      if (entry.isDirectory()) {
        fs.mkdirSync(path.join(dstDir, childRel), { recursive: true })
        walk(childRel)
      } else if (entry.isFile()) {
        fs.copyFileSync(path.join(srcDir, childRel), path.join(dstDir, childRel))
        count++
      }
    }
  }
  walk("")
  return count
}

// -------- main --------

function main() {
  log(`build-content.cjs — populate ${path.relative(ROOT, CONTENT_DIR)}/`)
  log(`  OVERRIDES = ${path.relative(ROOT, OVERRIDES_DIR)}/`)

  if (!fs.existsSync(STRIPPER)) {
    fail(`strip-progrowth-sections.sh not found at ${STRIPPER}`)
  }

  const WIKI_SRC = resolveWikiSrc()

  fs.mkdirSync(CONTENT_DIR, { recursive: true })

  // 1) Clear synced subfolders. Preserve top-level files in PRESERVE_FILES set.
  log(`Clearing ${path.relative(ROOT, CONTENT_DIR)}/ (preserving: ${[...PRESERVE_FILES].join(", ")})...`)
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      rmrf(path.join(CONTENT_DIR, entry.name))
    } else if (!PRESERVE_FILES.has(entry.name)) {
      // Remove stray top-level markdown that isn't a preserved artifact.
      fs.unlinkSync(path.join(CONTENT_DIR, entry.name))
    }
  }

  // 2) Copy vault subfolders into content/.
  let totalCopied = 0
  for (const sub of VAULT_SUBFOLDERS) {
    const n = copyMarkdownFiles(path.join(WIKI_SRC, sub), path.join(CONTENT_DIR, sub))
    if (n > 0) log(`  ${sub}/: ${n} files`)
    totalCopied += n
  }
  log(`Copied ${totalCopied} markdown files from vault.`)

  // 3) Run the shared stripper over content/.
  log(`Stripping ProGrowth H2 sections + frontmatter tags...`)
  execFileSync(STRIPPER, [CONTENT_DIR], { stdio: "inherit" })

  // 4) Overlay content_overrides/ on top of the stripped content.
  //    Overrides win over vault content if paths collide — that's the point.
  log(`Overlaying ${path.relative(ROOT, OVERRIDES_DIR)}/...`)
  const overlaid = copyOverrides(OVERRIDES_DIR, CONTENT_DIR)
  log(`  ${overlaid} override file(s) applied.`)

  // 5) Quick leak check (advisory, non-fatal).
  log(`Checking for residual ProGrowth mentions (advisory)...`)
  let leakFiles = 0
  function scanForLeaks(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanForLeaks(abs)
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const text = fs.readFileSync(abs, "utf8")
        if (/ProGrowth|progrowth/i.test(text)) {
          // Inline prose mentions are typically fine; flag for review.
          leakFiles++
        }
      }
    }
  }
  scanForLeaks(CONTENT_DIR)
  if (leakFiles > 0) {
    log(`  ⚠ ${leakFiles} file(s) still mention ProGrowth (inline prose — review if concerned).`)
  } else {
    log(`  (clean)`)
  }

  // Final summary
  let finalCount = 0
  function countMd(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) countMd(abs)
      else if (entry.isFile() && entry.name.endsWith(".md")) finalCount++
    }
  }
  countMd(CONTENT_DIR)
  log(`✓ ${finalCount} markdown files in ${path.relative(ROOT, CONTENT_DIR)}/ ready for build.`)
}

main()
