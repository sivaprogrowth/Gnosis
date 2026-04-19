# Gnosis — Personal LLM Wiki

## Context

You want a personal knowledge base where Claude Code acts as a disciplined wiki maintainer — reading sources you drop in, extracting key info, writing summaries, updating entity/concept pages, flagging contradictions, maintaining cross-references. Knowledge *compounds* on every source instead of being re-derived on every query (the RAG failure mode).

**Scope decisions locked in:**
- **One unified vault** at `~/Projects/gnosis` covering all personal knowledge.
- **Mixed / schema-lite** — structure emerges from what you actually feed it. No upfront ontology.
- **Minimal tooling** — plain markdown + git. Obsidian-optional (open the dir as a vault anytime). No qmd/Dataview/Marp on day one.
- **Ingest types:** web articles (URL paste or Obsidian Web Clipper), PDFs, personal notes/journal entries.

You curate sources and ask questions. Claude does all bookkeeping.

## Directory layout

```
~/Projects/gnosis/
├── CLAUDE.md              # The schema — rules Claude follows (THE key file)
├── README.md              # One-paragraph description + how to start a session
├── .gitignore             # ignore raw/assets large binaries if needed
├── index.md               # Content catalog — every wiki page listed by category
├── log.md                 # Chronological append-only: ingests, queries, lints
├── raw/                   # IMMUTABLE source documents
│   ├── articles/          #   web articles (.md from Web Clipper, or Claude-fetched)
│   ├── pdfs/              #   papers, reports, books
│   ├── notes/             #   your own journal entries / freeform notes
│   └── assets/            #   images downloaded from articles
└── wiki/                  # LLM-OWNED markdown — Claude writes, you read
    ├── sources/           #   one summary page per raw source
    ├── entities/          #   people, companies, books, products — concrete nouns
    ├── concepts/          #   ideas, frameworks, theories — abstract nouns
    └── queries/           #   answers to your questions filed back as pages
```

**Why this shape:** `raw/` is never touched by Claude except for reads. `wiki/` is where compounding happens. `index.md` + `log.md` live at root because Claude reads them first every session.

## The schema: `CLAUDE.md`

The single most important file. Claude Code auto-loads `CLAUDE.md` in the working directory, so every session in `~/Projects/gnosis` starts with the rules already in context. Contents:

1. **Identity & principles** — "You are the maintainer of this wiki. Raw sources are immutable. You own `wiki/`, `index.md`, `log.md`. You never write to `raw/`."
2. **Session start protocol** — Read `index.md` and last 5 log entries (`grep "^## \[" log.md | tail -5`) before acting.
3. **Ingest workflow** — The default is *interactive*: read the source, discuss key takeaways with me, *then* write. Steps:
   - Read the raw source in full.
   - Summarize key takeaways in chat; wait for my direction on emphasis.
   - Write `wiki/sources/<slug>.md` (summary + citation back to raw path).
   - Identify entities/concepts mentioned → create new pages in `wiki/entities/` or `wiki/concepts/`, or update existing ones.
   - Update cross-references (`[[page]]` links) on every affected page.
   - Flag contradictions with prior claims (add a `Contradictions` section or inline note).
   - Update `index.md` (new rows) and append a `log.md` entry.
4. **Query workflow** — Read `index.md` first, then relevant wiki pages. Answer with citations (`[[page]]` links + raw source path). If the answer is non-trivial, offer to file it to `wiki/queries/<slug>.md` so the exploration compounds.
5. **Lint workflow** — On `/lint` (or when I ask to health-check): find contradictions, stale claims, orphan pages, undefined concepts, missing cross-references. Return a report with suggested fixes — don't auto-apply.
6. **Page conventions:**
   - YAML frontmatter on every wiki page: `type` (source/entity/concept/query), `created`, `updated`, `sources` (list of raw paths or source slugs cited).
   - Every page ends with a `## Links` section listing related wiki pages.
   - Use `[[wiki-link]]` syntax (Obsidian-compatible) so graph view works if I open it later.
7. **Log format** — `## [YYYY-MM-DD HH:MM] {ingest|query|lint} | <title>` then 1-3 lines. Keeps `grep "^## \[" log.md` parseable.
8. **Index format** — Markdown tables per section (Sources / Entities / Concepts / Queries), one row per page: `| [[page]] | one-line summary | updated |`.
9. **Naming:** kebab-case filenames. Entities use common names (`daniel-kahneman.md`, not `kahneman-d.md`). Concepts use the phrase you'd search for (`fractional-marketing.md`).

## Initial files to create

- `CLAUDE.md` — full schema as described above.
- `README.md` — brief description + "start a Claude session in this directory and say `/ingest <path>` or just paste a URL."
- `index.md` — empty template with four section headers (Sources / Entities / Concepts / Queries) and a note that Claude maintains it.
- `log.md` — empty, with a header comment describing format.
- `.gitignore` — ignore `.DS_Store`, `raw/assets/*` optionally if large.
- Empty directories: `raw/articles/`, `raw/pdfs/`, `raw/notes/`, `raw/assets/`, `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`, `wiki/queries/` (with `.gitkeep` files).
- `git init` + initial commit.

## Operational patterns (documented in CLAUDE.md)

**Ingest (your primary loop):**
```
You: "ingest https://example.com/article" or "ingest raw/pdfs/paper.pdf"
Claude: [fetches if URL → writes to raw/articles/; reads; discusses takeaways]
You: [guide emphasis, ask follow-ups]
Claude: [writes source page + updates affected entity/concept pages + updates index.md + logs]
```

**Query:**
```
You: "what do I have on X?"
Claude: [reads index.md → reads relevant pages → synthesizes with citations]
You: "file that back as a wiki page"
Claude: [writes wiki/queries/<slug>.md + indexes + logs]
```

**Lint:**
```
You: "lint the wiki" (weekly or monthly)
Claude: [returns report: contradictions, orphans, undefined concepts, suggested questions]
```

## Verification (how to confirm it works end-to-end)

1. `cd ~/Projects/gnosis && ls -la` — directory structure present, git initialized.
2. `cat CLAUDE.md` — schema populated.
3. **Smoke test ingest #1** — paste a URL of an article you've read recently. Claude should: fetch → discuss → write summary → create 2-4 new entity/concept pages → update index.md → append log. Confirm files exist and cross-link.
4. **Smoke test ingest #2** — a second source that overlaps. Claude should *update* existing entity pages (not duplicate) and add cross-references between the two sources.
5. **Query test** — ask a question that requires synthesizing both sources. Answer should cite `[[page]]` links. Optionally file back as `wiki/queries/<slug>.md`.
6. **Obsidian check** (optional) — open `~/Projects/gnosis` as a vault in Obsidian; graph view should show connected nodes.
7. **Grep test** — `grep "^## \[" log.md` returns clean chronological entries.

## What I will NOT do in the initial build

- No qmd / MCP search integration (add later if the wiki grows past ~50 sources).
- No Dataview frontmatter tables (frontmatter is written but no reports rendered).
- No Marp slide generation.
- No podcast transcript ingest (not requested).
- No Web Clipper install/config — that's your browser-side setup, independent of this repo.
- No automated ingestion / cron — ingest is always interactive.

## Critical files

- `~/Projects/gnosis/CLAUDE.md` — schema. The file that makes this work.
- `~/Projects/gnosis/index.md` — runtime catalog.
- `~/Projects/gnosis/log.md` — history.

Everything else emerges from use.
