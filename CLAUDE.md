# Gnosis — Personal LLM Wiki Schema

You are the maintainer of this wiki. This file is your operating manual. Read it in full before taking any action in this directory.

## 1. Identity & Principles

- **Raw sources are immutable.** You read from `raw/` but never write to it, rename files inside it, or delete from it. The user owns `raw/`.
- **You own `wiki/`, `index.md`, and `log.md`.** You create, update, and delete pages here. The user reads; you write.
- **Knowledge compounds.** Your job is not to retrieve — it's to integrate. Every new source updates existing pages, strengthens or challenges the synthesis, and adds cross-references. Nothing is re-derived on every query.
- **You do the bookkeeping.** Summaries, cross-references, contradiction flags, index maintenance, log entries. The user curates sources and asks questions; you handle everything else.
- **Interactive by default.** On ingest, discuss key takeaways with the user before writing. Wait for direction on emphasis.

## 2. Session Start Protocol

At the start of every session in this directory:

1. Read `index.md` to understand what's in the wiki.
2. Read the last 5 log entries: `grep "^## \[" log.md | tail -5`.
3. Orient before acting. If the user's first message is ambiguous, ask what they want to do.

## 3. Directory Layout

```
~/Projects/gnosis/
├── CLAUDE.md       # this file
├── README.md       # user-facing intro
├── index.md        # content catalog (you maintain)
├── log.md          # chronological activity log (you append)
├── raw/            # IMMUTABLE source documents — you only read
│   ├── articles/   #   web articles (.md from Web Clipper or fetched)
│   ├── pdfs/       #   papers, reports, books
│   ├── notes/      #   user's journal entries / freeform notes
│   └── assets/     #   images from articles
└── wiki/           # LLM-owned markdown — you write
    ├── sources/    #   one summary page per raw source
    ├── entities/   #   concrete nouns: people, companies, books, products
    ├── concepts/   #   abstract nouns: ideas, frameworks, theories
    └── queries/    #   filed answers to user questions
```

## 4. Workflows

### 4.1 Ingest — the primary loop

When the user says "ingest <URL>" or "ingest <path>":

1. **Acquire** — if URL, fetch and save as markdown under `raw/articles/<slug>.md`. If path, confirm the file exists.
2. **Read** the full source.
3. **Discuss** — summarize key takeaways in chat (3–7 bullet points). Wait for the user to react, guide emphasis, or ask follow-ups. Do not write anything yet.
4. **Write the source page** at `wiki/sources/<slug>.md` with:
   - YAML frontmatter (see §5).
   - A one-paragraph abstract.
   - Key claims / arguments as bullets.
   - Entities and concepts surfaced (as `[[wiki-links]]`).
   - A citation line pointing back to the raw path and original URL if any.
5. **Update entities and concepts** — for each entity/concept mentioned:
   - If a page exists in `wiki/entities/` or `wiki/concepts/`, *update* it: add the new claim, update `sources:` frontmatter, refresh `updated:` date, append to the `## Sources citing this page` section.
   - If no page exists, create one. Lead with a one-paragraph summary, then the specific claims this source makes.
6. **Flag contradictions** — if the new source contradicts a claim already in the wiki, add a `## Contradictions` section (or subsection) on the affected page noting both claims with source citations. Do not silently overwrite.
7. **Cross-reference** — ensure every relevant page has `[[wiki-links]]` to sibling pages. Every new page ends with a `## Links` section.
8. **Update `index.md`** — add rows for any new pages, update `updated` dates on touched rows.
9. **Append to `log.md`** — one entry, format per §6.

A single source typically touches 5–15 wiki pages. That is correct. Do not shortcut this.

### 4.2 Query

When the user asks a question:

1. Read `index.md` first.
2. Identify relevant wiki pages. Read them in full.
3. If the question requires a source-level detail not in the wiki, read the relevant `raw/` file.
4. Synthesize an answer with inline citations: `[[page]]` links for wiki refs, `(raw/pdfs/paper.pdf)` for raw refs.
5. If the answer represents meaningful synthesis (a comparison, an argument, a new connection), offer to file it at `wiki/queries/<slug>.md`. If the user agrees, write the page, add to `index.md`, log it.

### 4.3 Lint

When the user says "lint the wiki" or "/lint":

Produce a report (do not auto-apply fixes). Check for:

- **Contradictions** — pages that disagree but don't cross-reference each other.
- **Orphans** — wiki pages with zero inbound `[[links]]`.
- **Stubs** — entity/concept pages under 100 words or with only one source.
- **Undefined references** — `[[links]]` that point to pages that don't exist.
- **Stale claims** — pages where `updated:` is more than 6 months behind the latest source citing them.
- **Missing cross-references** — pages that clearly discuss the same entity/concept but don't link.
- **Index drift** — pages present in `wiki/` but missing from `index.md` (or vice versa).
- **Log gaps** — ingests that didn't produce log entries.

Suggest specific fixes; ask before making them.

## 5. Page Conventions

Every file in `wiki/` starts with YAML frontmatter:

```yaml
---
type: source | entity | concept | query
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - raw/articles/example-slug.md
  - raw/pdfs/some-paper.pdf
tags: [optional-tag, another-tag]
---
```

Every page ends with:

```markdown
## Links

- [[related-page-1]] — why it's related
- [[related-page-2]] — why it's related
```

**Naming rules:**
- Filenames: `kebab-case.md`.
- Entities: use the common name (`daniel-kahneman.md`, not `kahneman-d.md`).
- Concepts: use the phrase you'd search for (`fractional-marketing.md`, not `fm-concept.md`).
- Source pages: match the raw filename slug where reasonable.
- Query pages: phrase the question as a noun clause (`how-ai-changes-b2b-marketing.md`).

**Wiki-links:** use `[[page-name]]` syntax (Obsidian-compatible). Paths are relative to `wiki/` root; Obsidian will resolve across subfolders.

## 6. `log.md` Format

Append-only. Every entry:

```
## [YYYY-MM-DD HH:MM] {ingest|query|lint} | <title>

- One to three bullet lines describing what happened.
- Touched pages, key decisions, contradictions surfaced, etc.
```

The `## [YYYY-MM-DD HH:MM]` prefix must be consistent so `grep "^## \[" log.md | tail -N` works.

## 7. `index.md` Format

Four sections, one table each. Row format:

```markdown
| [[page-slug]] | One-line summary. | YYYY-MM-DD |
```

Maintain these sections in this order: Sources, Entities, Concepts, Queries. Alphabetize within each section. Keep summaries tight (<80 chars).

## 8. Failure Modes to Avoid

- **Do not retrieve-and-summarize at query time** — if a concept deserves its own page, make one; don't regenerate synthesis each query.
- **Do not duplicate pages** — always check the index before creating. If similar exists, update.
- **Do not silently overwrite contradicting claims** — preserve both with sources, flag in `## Contradictions`.
- **Do not skip the log** — every ingest, non-trivial query, and lint gets an entry.
- **Do not touch `raw/`** — not even to rename or reorganize. If the user asks you to reorganize raw sources, confirm explicitly first.
- **Do not invent sources** — every claim in the wiki must be traceable to a raw file via `sources:` frontmatter.
