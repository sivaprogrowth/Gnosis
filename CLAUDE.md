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
├── Home.md         # OPTIONAL: Obsidian Dataview dashboard at vault root
├── .obsidian/      # LOCAL ONLY (gitignored): per-machine vault config
├── raw/            # IMMUTABLE source documents — you only read
│   ├── articles/   #   web articles (.md from Web Clipper or fetched)
│   ├── pdfs/       #   papers, reports, books
│   ├── notes/      #   user's journal entries / freeform notes
│   └── assets/     #   images from articles
└── wiki/           # LLM-owned markdown — you write
    ├── sources/      # one summary page per raw source
    ├── entities/     # AI engines, tools, products (abstract reference nouns)
    ├── concepts/     # ideas, frameworks, theories
    ├── people/       # individuals in Siva's network (mapped in relation to him)
    ├── companies/    # organizations, institutions, universities, scholarships
    ├── projects/     # active initiatives (ProGrowth-owned + personal)
    ├── inspiration/  # tweets, screenshots, design refs (Farzapedia pattern)
    └── queries/      # filed answers to non-trivial questions
```

**Type-to-folder routing** (for step 4.1.4 and 4.1.5 below):

- A **person** → `wiki/people/<kebab-case-name>.md`
- A **company / institution / university / scholarship** → `wiki/companies/<kebab-case-name>.md`
- An **AI engine / tool / product** (ChatGPT, Perplexity, Semrush AIVI) → `wiki/entities/<slug>.md`
- A **concept / framework / theory** → `wiki/concepts/<slug>.md`
- A **source** (PDF, article, web tool snapshot) → `wiki/sources/<slug>.md`
- An **active project** → `wiki/projects/<slug>.md`
- A **visual or textual inspiration** (tweet, screenshot) → `wiki/inspiration/<slug>.md`

When a single concrete noun could fit multiple folders, prefer the folder that best describes *why this entry exists in the wiki*. Example: Semrush the company goes in `companies/` but the AIVI product they ship goes in `entities/`.

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
5. **Update or create referenced pages** — for each entity, concept, person, company, or project mentioned:
   - If a page exists in any `wiki/*/` folder, *update* it: add the new claim, update `sources:` frontmatter, refresh `updated:` date, append to the `## Sources citing this page` section.
   - If no page exists, create one using the type-to-folder routing in §3. Lead with a one-paragraph summary, then the specific claims this source makes.
   - **Compounding over breadth** — only create a dedicated page for a mentioned entity if the wiki already has, or plausibly soon will have, *another* page that would cite it. A one-line mention of "Infosys" on Siva's LinkedIn does not justify an `infosys.md` page if nothing else in the wiki relates to Infosys. Keep such mentions inline.
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

### 4.3 Drain the article inbox

When the user says "drain the article inbox" (or "drain the inbox"):

1. **Scan** `raw/articles/*.md` (skip `README.md` and `_template.md`) and find every file whose YAML frontmatter contains `tags: [..., inbox, ...]` or `tags:\n  - inbox`.
2. **Summarize each in one line** — what the article argues, not what it's "about". Include the source domain and a 3-5 word hook of the key claim. Example: *"Emergence Capital (emcap.com) — coins 'Mirage PMF' for AINS companies where revenue growth masks lack of real AI leverage."*
3. **Recommend a triage class for each** — one of:
   - **A) Full ingest** — the 9-step §4.1 workflow. Recommend when the article introduces named concepts, adjacent to existing wiki topics, high-signal for the user's work. Note expected page touch count (e.g., "~10 pages").
   - **B) Skim ingest** — source page only + inline links to existing concepts, no new concept pages. Recommend when the article rehashes known material with minor additions.
   - **C) Queue** — change tag from `inbox` to `queued`. Not today, but worth keeping teed up.
   - **D) Dismiss** — change tag from `inbox` to `dismissed`. Keep the raw file, but don't ingest.
4. **Wait for the user** to pick per article. Don't batch-ingest without explicit instructions.
5. **Execute each chosen action**. For A/B: run the full (or trimmed) ingest workflow, replace the `inbox` tag with `ingested` on the raw file. For C/D: update the tag only; no wiki changes.
6. **Summarize in chat** what happened: N fully ingested, M skimmed, K queued, J dismissed.
7. **Append one log entry** covering the batch (not one per article).

The tag transitions are your state machine:

```
inbox → ingested   (A or B)
inbox → queued     (C — stays in raw/articles/ as backlog)
inbox → dismissed  (D — raw file kept, no wiki action)
```

`Home.md`'s `LIST FROM #inbox` Dataview query surfaces the backlog count in Obsidian so the user can see when a drain is due.

### 4.4 Lint

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

### 5.1 Frontmatter — required fields (every page)

```yaml
---
type: source | entity | concept | person | company | project | inspiration | query
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - raw/articles/example-slug.md
  - raw/pdfs/some-paper.pdf
tags: [optional-tag, another-tag]
---
```

The `sources:` list accepts either **raw paths** (`raw/pdfs/foo.pdf`) or **slug pointers** (`geo-how-to-dominate-ai-search`). Both work. Prefer raw paths when the source is a concrete file; slug pointers are acceptable when citing another wiki page's source record.

### 5.2 Frontmatter — type-specific fields

Fields beyond the required set are typed per folder. Only include ones that add value; don't fill them all in to look complete.

- **person** — `role`, `company: "[[progrowth]]"`, `based-in`, `linkedin`, `email`, `relationship-to-siva`
- **company** — `website`, `headquartered`, `founded-by: "[[person-slug]]"`
- **source** — `authors`, `published`, `venue`, `url`
- **project** — `status`, `url`, `repos: [github.com/...]`
- **concept / entity** — `aliases: [alt-term-1, alt-term-2]` so search can find the page by synonyms

**Wiki-links inside frontmatter** (`company: "[[progrowth]]"`) render clickably in Obsidian's Properties panel. They are strings to Quartz (non-breaking). Safe to use.

### 5.3 Required body sections

Every non-source page ends with:

```markdown
## Sources citing this page

- [[source-or-page-slug]] — what it adds to this page

## Links

- [[related-page-1]] — why it's related
- [[related-page-2]] — why it's related
```

The **Sources citing this page** section is a *backlink tracker* you maintain as new sources touch the page. It's the audit trail for where the page's claims come from. The **Links** section is outbound — related wiki pages regardless of whether they cited this one.

### 5.4 Query page structure

Query pages (`wiki/queries/<slug>.md`) follow this shape:

```markdown
# <the question, phrased as a sentence>

## The question
One paragraph on why it's worth filing.

## The findings (or "The two findings" / "The evidence")
Present the source material with `[[page]]` citations.

## The reconciliation / answer / synthesis
The value-adding part — what the scattered claims mean together.

## Practical implications (optional)
Where the answer should change behavior — clients, product, ops.

## Links
Standard closing section.
```

Filename: phrase the question as a noun clause — `how-chen-and-mckinsey-disagree-on-big-brand-bias.md`, not `big-brand-bias-question.md`.

### 5.5 Privacy convention — ProGrowth sections

When a page contains tactical, client-specific, or otherwise non-public content, wrap it in an H2 section whose heading starts with `## ` and contains the word `ProGrowth`:

```markdown
## ProGrowth relevance
Tactical notes that should not appear on the public site.

## ProGrowth playbook for this client
<private content>
```

The `scripts/sync-wiki.sh` pipeline (see §9) strips these H2 blocks wholesale when syncing to the public site. **Anything outside such a section is considered public.** If you're unsure whether a claim should be public, put it under a `## ProGrowth …` heading and the sync will keep it private.

Do not use the word "ProGrowth" as plain body text and then expect it to be stripped — the heuristic is H2-heading-based, not word-based.

### 5.6 Naming rules

- Filenames: `kebab-case.md`.
- People: full common name (`phani-sama.md`, `daniel-kahneman.md`).
- Companies: common short name (`bits-pilani.md`, `redbus.md`). Well-known abbreviations (`lse.md`, `iim-kozhikode.md`) are fine when more recognizable than the full name.
- Concepts: the phrase you'd search for (`earned-media-bias.md`, not `emb-concept.md`).
- Sources: match the raw filename slug where reasonable.
- Query pages: noun-clause question (`how-ai-changes-b2b-marketing.md`).

### 5.7 Wiki-links

Use `[[page-name]]` syntax (Obsidian-compatible). Paths are relative to `wiki/` root; Obsidian resolves across subfolders. Aliased form `[[page-slug|display text]]` is supported. If you use a wiki-link pointing to a page that does not yet exist, either (a) create the page, or (b) drop the link — do not leave broken wiki-links in place.

## 6. `log.md` Format

Append-only. Every entry:

```
## [YYYY-MM-DD HH:MM] {ingest|query|lint} | <title>

- One to three bullet lines describing what happened.
- Touched pages, key decisions, contradictions surfaced, etc.
```

The `## [YYYY-MM-DD HH:MM]` prefix must be consistent so `grep "^## \[" log.md | tail -N` works.

## 7. `index.md` Format

Four top-level sections: **Sources**, **Entities**, **Concepts**, **Queries**. Maintain them in that order.

Row format inside any section:

```markdown
| [[page-slug]] | One-line summary. | YYYY-MM-DD |
```

Alphabetize within each section. Keep summaries tight (<80 chars).

**Sub-tabling is allowed inside Entities.** When the entity count grows past ~10, break the Entities section into H3 sub-tables by concrete noun kind — e.g., `### People`, `### Companies and institutions`, `### AI engines and search products`, `### Projects`, `### Inspiration`. This keeps navigation manageable while staying inside the four-top-section schema. Do not sub-table Sources, Concepts, or Queries — they stay flat.

## 8. Failure Modes to Avoid

- **Do not retrieve-and-summarize at query time** — if a concept deserves its own page, make one; don't regenerate synthesis each query.
- **Do not duplicate pages** — always check the index before creating. If similar exists, update.
- **Do not silently overwrite contradicting claims** — preserve both with sources, flag in `## Contradictions`.
- **Do not skip the log** — every ingest, non-trivial query, and lint gets an entry.
- **Do not touch `raw/`** — not even to rename or reorganize. If the user asks you to reorganize raw sources, confirm explicitly first.
- **Do not invent sources** — every claim in the wiki must be traceable to a raw file via `sources:` frontmatter.
- **Do not edit auto-generated widget blocks.** The public-site generator injects blocks delimited by `<!-- GNOSIS:WIDGET:TOP:START -->…<!-- GNOSIS:WIDGET:TOP:END -->`, `<!-- GNOSIS:WIDGET:BOTTOM:* -->`, and `<!-- GNOSIS:TABLECHART:* -->` into pages under `~/Projects/gnosis-main/content/`. Those blocks are regenerated on every build. Never edit the canonical page to "fix" a generated block — edit the generator in `~/Projects/gnosis-main/scripts/generate-dataview.cjs` instead.
- **Do not leak private content outside a `## ProGrowth …` H2 section.** The sync strip is heading-based, not word-based. Tactical notes mentioned in passing body prose will reach the public site.
- **Do not stub-expand.** Creating a dedicated page for every name mentioned in a source produces a graph of orphans. Only promote a mention to a page when a second page in the wiki would credibly cite it (§4.1 step 5).

## 9. Publication Pipeline (read-only context)

The canonical wiki at `~/Projects/gnosis/` is the source of truth. A public projection lives at `~/Projects/gnosis-main/` (deployed to `gnosis-main.vercel.app`). You normally do not touch the projection — it regenerates itself:

1. `scripts/sync-wiki.sh` in `~/Projects/gnosis-main/` copies every `wiki/<folder>/*.md` into `content/<folder>/` and strips any `## ... ProGrowth ...` H2 section.
2. `scripts/generate-dataview.cjs` reads the synced content, regenerates `content/dashboard.md` and `content/{people,companies,sources,concepts}/index.md` with live tables + inline SVG charts, and injects per-page widget blocks (stats strip, table auto-charts, Gnosis-context bottom widget).
3. Vercel's `buildCommand` runs the generator then `npx quartz build`, publishing to `gnosis-main.vercel.app`.
4. A `/chat` route and `/api/ask` serverless function (6-stage retrieval pipeline) also live in the projection; they read the same `content/` files. `content/chat.md` and `content/index.md` are hand-maintained in the projection and **preserved** by `sync-wiki.sh`'s clear step.

For a typical ingest workflow this means: edit canonical → run `bash ~/Projects/gnosis-main/scripts/sync-wiki.sh` → run `vercel --prod --yes` from `~/Projects/gnosis-main/`. The canonical wiki is untouched by the projection.

If you ever need to *change how the public site looks* (dashboard composition, widget content, chart styles), edit the generator, not the canonical pages.

## 10. Operating Modes

**Interactive (default).** On ingest, discuss key takeaways with the user before writing. Wait for direction on emphasis. Ask clarifying questions.

**Compact ("just do it").** If the user says something like "just do what's required", "trim the unnecessary ones", or "don't over-explain", drop the discussion step and produce the minimum-viable set of pages. Use your best judgment on which entities earn dedicated pages under the compounding rule. Still produce the log entry.

The mode is set per-task by the user's phrasing, not by a global setting. Switch back to interactive on the next ingest unless the user carries the compact instruction forward.
