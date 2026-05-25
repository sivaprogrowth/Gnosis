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
├── Now.md          # current week's work + 12-week-year theme (hand-maintained, updated Sundays)
├── Home.md         # OPTIONAL: Obsidian Bases dashboard at vault root (embeds bases/*.base)
├── bases/          # Obsidian Bases views (.base files) — replaces the legacy Dataview blocks
├── .obsidian/      # LOCAL ONLY (gitignored): per-machine vault config
├── raw/            # IMMUTABLE source documents — you only read
│   ├── articles/   #   web articles (.md from Web Clipper or fetched)
│   ├── pdfs/       #   papers, reports, books
│   ├── notes/      #   user's journal entries / freeform notes
│   └── assets/     #   images from articles
├── wiki/           # LLM-owned markdown — you write
│   ├── sources/      # one summary page per raw source
│   ├── entities/     # AI engines, tools, products (abstract reference nouns)
│   ├── concepts/     # ideas, frameworks, theories
│   ├── people/       # individuals in Siva's network (mapped in relation to him)
│   ├── companies/    # organizations, institutions, universities, scholarships
│   ├── projects/     # active initiatives (ProGrowth-owned + personal)
│   ├── inspiration/  # tweets, screenshots, design refs (Farzapedia pattern)
│   └── queries/      # filed answers to non-trivial questions
├── slides/         # Marp-authored slide decks sourced from wiki content
│   ├── _template.md  #   starting point for a new deck
│   └── dist/         #   export output (gitignored) — PDF / HTML / PPTX
└── scripts/        # helper scripts for vault-side workflows
    └── build-slides.sh  # wraps `npx @marp-team/marp-cli` to export decks
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

`Home.md`'s embedded `bases/inbox.base` view surfaces the inbox backlog in Obsidian so the user can see when a drain is due.

#### Cadence

The default rhythm is:

- **Weekly drain — Sunday**, anchored to the existing Weekly Review ritual in `~/Documents/Weekly Reviews/`.
- **Mid-week backstop — ≥ 5 items in inbox** triggers an earlier drain regardless of day. This prevents pre-sprint clipping bursts from overflowing.
- **On-demand — before any client meeting or strategy session that needs the knowledge.** The wiki only earns its keep if the information is current when you need it.

This cadence is a default, not a hard rule. Skip a week without guilt; run twice in a day if a research burst warrants it. The forcing function is Sunday plus the ≥5 backstop — not a deadline.

### 4.4 Slide deck generation

When the user asks for slides on a topic (e.g., "give me a 10-slide deck on Mirage PMF for a client meeting"):

1. **Read the relevant wiki pages** first. A deck sourced from the wiki should cite the wiki — not re-derive claims.
2. **Author the deck** at `slides/<kebab-slug>.md` using `slides/_template.md` as the starting point. Use Marp slide separators (`---` on its own line) between slides.
3. **Citations** — use full URLs in slides that will leave the laptop (`[earned-media bias](https://gnosis-main.vercel.app/concepts/earned-media-bias)`). Obsidian-style `[[wiki-links]]` don't resolve in exported PDFs.
4. **Structure** — prefer one claim per slide. Use tables, short bullet lists, one-sentence headlines. No paragraphs longer than 2 lines.
5. **Export** — run `bash scripts/build-slides.sh <deck-slug>` to produce `slides/dist/<slug>.{pdf,html,pptx}`. The `dist/` folder is gitignored; regenerate on demand.
6. **Don't log slide generation** in `log.md` — decks are derived artifacts, not wiki state. Logging them clutters the ingest/query history.

### 4.5 Lint

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

### 4.6 Drain the Readwise inbox (book ingest)

When the user says "drain Readwise" (or "drain the Readwise inbox"):

1. **List books** — call the Readwise MCP (`mcp__readwise__*`) to enumerate books. Diff against `raw/notes/readwise-state.json` `books_processed[].id` to find books with no entry. Sort by most recent activity. (For state outside a Claude session, `scripts/readwise-state.py` prints the same pending count.)
2. **Summarize each in one line** — title, author, highlight count, date added. Optionally pull 2–3 representative highlights to ground the recommendation. Example: *"The Creative Act — Rick Rubin (138 highlights, added 2024-03-12) — taste-as-craft and the silent practice of choosing what's true."*
3. **Recommend a triage class for each** — one of:
   - **A) Full book ingest** — the §4.1 9-step workflow, scaled for books. Recommend when the book introduces named frameworks, has heavy marginalia, or sits adjacent to active project work. Note expected page touch count.
   - **B) Skim ingest** — book source page only with the strongest 5–10 highlights inline; no concept-page promotion. Recommend for narrative non-fiction with thin conceptual payload, or rereads where the wiki already covers the framework.
   - **C) Queue** — record-only; revisit on a later drain. No wiki writes.
   - **D) Dismiss** — record-only so it stops surfacing; no wiki writes.
4. **Wait for the user** to pick per book. Don't batch-ingest without explicit instructions.
5. **Execute each chosen action:**
   - **A) Full ingest:** call Readwise to pull all highlights for the book. Write `wiki/sources/book-<slug>.md` with frontmatter (`type: source`, `subtype: book`, `authors:`, `published:`, `isbn:` if known, `readwise_book_id:`), a one-paragraph abstract, **highlights grouped by chapter/location** with the user's marginalia preserved verbatim as block quotes, distilled key claims, and `[[wiki-links]]` to surfaced entities / concepts / people. Then run the §4.1 step-5 cross-reference pass on referenced pages. **Compounding rule applies** — only promote a mentioned author / framework to its own page if another wiki page would plausibly cite it.
   - **A) Standout-highlight inspiration pages:** during the drain, flag 1–3 highlights per book as inspiration-worthy (use sparingly — this is the Farzapedia pattern, not a quote dump). For each flagged highlight, create `wiki/inspiration/<slug>.md` with the verbatim quote, attribution back to the `book-<slug>.md` page, and a `## Links` section. Do not paraphrase the user's marginalia — preserve voice.
   - **B) Skim ingest:** write only `wiki/sources/book-<slug>.md` with the top 5–10 highlights and a thin abstract. Do not create or update concept/entity pages.
   - **C) Queue / D) Dismiss:** record-only; no wiki writes.
6. **Update `index.md`** — add the new book source page row, plus any new entity/concept/inspiration pages created in A.
7. **Append one log entry** covering the batch (not one per book), e.g. `## [2026-05-25 14:30] ingest | drained Readwise — 2 full, 1 skim, 3 queued, 1 dismissed`.
8. **Record in `readwise-state.json`** — append an entry to `books_processed` for **every** book touched (A, B, C, *and* D) so dedupe holds across all four paths:
   ```json
   {"id": <readwise_book_id>, "slug": "<book-slug>", "drained": "<iso8601>", "class": "A" | "B" | "C" | "D"}
   ```

The state transitions are your state machine — kept in `readwise-state.json` instead of file tags because the source-of-truth lives in Readwise, not the local filesystem:

```
unprocessed → drained (class A)   book source page + concept pages + optional inspiration pages
unprocessed → drained (class B)   book source page only
unprocessed → drained (class C)   record only; revisit later
unprocessed → drained (class D)   record only; never re-surface
```

A second "drain Readwise" run will skip every book whose `id` already appears in `books_processed[]`, regardless of class.

#### Cadence

There's no fixed rhythm — books finish irregularly. Reasonable triggers:

- **A book just hit "finished" in Readwise** — drain while the highlights are still warm.
- **Monthly sweep alongside the Sunday Weekly Review** — catch anything that synced quietly.
- **Before drafting an output that should cite a recently-read book** — pairs with §4.9.

Skip months without guilt; the dedupe in `books_processed[]` means a backlog drains cleanly whenever you return to it.

### 4.7 Weekly synthesis brief

When the user says "weekly synthesis" / "synthesis brief" / runs the Sunday Weekly Review:

1. **Pull the week's highlights** — call the Readwise MCP with `highlighted_at_gt=<7 days ago>` (and/or `updated_gt`) to collect every highlight created or annotated in the last seven days, across **both books and Reader articles**. Use `response_fields` including `text`, `note`, `book_title`, `book_author`, `book_category`, `highlighted_at`.
2. **Cluster by theme** — group the highlights into 3–6 clusters using your own judgement. **Do not pre-define categories.** Let the clusters fall out of what the user actually marked this week — they're a more honest signal than any predetermined taxonomy. One-sentence label per cluster.
3. **Hunt for collisions** — *this is the unique-to-this-MCP move; run it every week as a standing instruction, not as a one-off.* Explicitly look for three kinds of friction:
   - **Direct contradictions** — two highlights from the last 7 days that disagree on the same claim. Quote both, name the disagreement.
   - **Cross-domain rhymes** — a marketing / business / craft highlight from this week that rhymes with a Vedic, philosophical, or older-tradition framework you've highlighted previously. (Use Readwise full-text search across older highlights *and* check `wiki/concepts/` for matching pages.) **This is the standing instruction** — the agent looks for this every week, even when nothing nominally connects the two domains. The collision-hunt earns its keep here: highlights are inert one-document-at-a-time, but a Storr observation about *theory of control* may rhyme with a passage in *The Bhagavad Gita* on detachment, and that rhyme is the brief's most valuable output.
   - **Wiki-impact strengthens / undermines** — a highlight from this week that strengthens or undermines a claim already in `wiki/concepts/`. List the concept page, list the claim, list the highlight, and state the direction.
4. **File the brief as a query page** at `wiki/queries/synthesis-<YYYY-Www>.md` (e.g. `synthesis-2026-W21.md`, ISO-week format). Structure:
   ```
   ## Clusters this week
   <3-6 one-sentence cluster labels, each with 2-4 representative highlights as block quotes>

   ## Collisions and tensions
   <every collision found in step 3 — direct contradictions, cross-domain rhymes, and wiki-impact items>

   ## What this week added to the wiki
   <links to existing wiki/concepts/*.md that this week's highlights strengthen or extend>

   ## What this week contradicted
   <links to existing wiki/concepts/*.md that this week's highlights weaken or qualify>
   ```
   If a section is empty for the week, write `_none._` — don't omit the section. The 4-section shape is the contract; week-to-week variance lives in the content.
5. **Offer to fan out** — for each item in **Collisions and tensions** or **What this week contradicted**, offer to update the relevant `wiki/concepts/*.md` page with a `## Contradictions` section per §8. Don't auto-write; ask per item.
6. **Record in `readwise-state.json`** — append to `synthesis_briefs`:
   ```json
   {"week_iso": "2026-W21", "filed_to": "wiki/queries/synthesis-2026-W21.md", "created": "<iso8601>"}
   ```
7. **Append one log entry** — `## [YYYY-MM-DD HH:MM] query | weekly synthesis brief — N highlights across M clusters, K collisions`.

**Why this earns the MCP's keep.** Highlights are inert one-document-at-a-time. Daily Review surfaces them randomly. The cluster pass plus the standing collision-hunt is the single feature that turns a passive highlight store into a synthesis loop — *the agent does the connection-making the user wouldn't notice unaided.* If a brief produces zero collisions, write `_none found this week._` and move on; the absence is data. If a brief produces a collision the user wouldn't have caught reading the highlights individually, the workflow has paid for itself.

#### Cadence

- **Sunday Weekly Review** is the default. Run it as part of the existing ritual.
- Skip weeks with fewer than 5 new highlights — there's not enough material to cluster honestly. Note the skip in the next brief's intro line so the longitudinal signal stays clean.
- **Don't backfill.** A synthesis brief is about *this week's reading*, not catch-up; if you missed three weeks, run one brief over the last 7 days and let the older highlights surface naturally via the §4.8 resurface workflow.

### 4.8 Resurface for current work

When the user says one of:

- **"resurface for `<work-context>`"** — e.g. *"resurface for the KOG positioning piece"*, *"resurface for the marketri overtake plan"*. The work is named explicitly.
- **"what should I revisit for this week's work"** / **"resurface for this week"** — the agent reads `Now.md` and runs the workflow **once per active item** listed there.

This workflow replaces Readwise Daily Review's spaced-repetition / random surfacing with **context-triggered relevance** — the highlight you should see today is the one that's about *this week's actual work*, not the one the SR algorithm happened to schedule.

1. **Read the work context** — either explicit (from the prompt) or pulled from `Now.md`'s "This week" list. For each item: if a `wiki/projects/<slug>.md` page exists, read it too so the resurface is anchored to the project's known shape (active client, stage, blockers).
   - **Guard:** if `Now.md`'s `updated:` frontmatter is more than 14 days behind today, stop and ask the user to refresh it before running. Resurfacing against stale context produces stale results.
2. **Hybrid Readwise query** — call `mcp__readwise__readwise_search_highlights` with all three signals (the MCP supports both vector search and field-targeted full-text queries in one call):
   - **vector_search_term** — the work's topic in the user's words.
   - **full_text_queries** — `field_name: highlight_tags` for tag overlap, `field_name: document_author` for known-relevant authors, `field_name: highlight_plaintext` for must-have terms.
3. **Re-rank the top ~20 candidates against the specific work context.** Return **5–8 most-applicable** — explicitly not most-recent, not most-highlighted, not most-vector-similar. Most-applicable means: would quoting this highlight *change* what the user is currently writing / building / pitching? If yes, keep it. If it just feels related, drop it.
4. **Present each highlight as:**
   ```
   > "<verbatim quote>" — <author>, <book>
   **Why this matters for <work>:** <one line — what specifically changes if you act on this>
   ```
   Where the "why this matters" line is the work the agent earns — not a generic gloss. If a highlight maps to an existing `wiki/concepts/*.md` page, drop the `[[wiki-link]]` into the hook so the connection compounds.
5. **Honest empty result is acceptable.** If nothing crosses the applicability threshold, write: *"No highlights crossed the applicability threshold for `<work>`. The Readwise library doesn't have material this work can borrow from yet."* This is data — it tells the user where to read next. Fabricating relevance is the failure mode to avoid.
6. **Offer to file the curated set** as `wiki/queries/resurface-<work-slug>-<YYYY-MM-DD>.md`. Ask before writing — many resurfaces are operational (consumed once, then discarded). File when the curation itself is worth keeping (e.g., the user accepts ≥4 of the 5–8 hooks; the resurface is for a project that recurs; the user explicitly says "file this"). When filing, write the same five-item-per-highlight block plus a one-paragraph framing intro tying the set to the work.
7. **Record in `readwise-state.json`** — append to `resurface_log`:
   ```json
   {"work_context": "<slug>", "highlights_offered": [<readwise_highlight_ids>], "created": "<iso8601>"}
   ```
   Even when no file is created, the log entry tracks that the resurface was run. Lets the §4.11 reading-pattern mirror see which work items are pulling on the library.
8. **No log entry** for the resurface itself unless a query page was filed. Resurface-without-file is operational; `log.md` is for state-changing events.

**Why this beats Readwise Daily Review.** Daily Review optimizes for **retention** via spaced repetition — it's good for memorizing material. Resurfacing for current work optimizes for **application** — it pulls the right page out of your library at the moment you can use it. The two solve different problems; both can run, but the resurfacing pass is what makes the highlight library *load-bearing* for the work, rather than a museum.

**When `Now.md` drives the workflow** (the "for this week's work" trigger), present results **one work item at a time** with a brief pause between items. A user reviewing 3 items × 6 hooks each is reading 18 highlights — too many to absorb in one block. Chunking by item lets the user act on cluster A's hooks before seeing cluster B.

#### Cadence

- **Ad-hoc** when starting a new piece of work — say "resurface for `<this thing I'm about to do>`" *before* you start drafting / building.
- **Sunday-tied** when running the §4.7 weekly synthesis — the synthesis identifies *what came in*; this workflow surfaces *what's already there that you should re-use*. Natural pairing.
- **Not daily** — daily resurfacing crosses back into the noise pattern Daily Review already occupies. The whole point is that the workflow is *triggered*, not scheduled.

### 4.9 Draft from highlights

When the user says **"draft `<output-type>` on `<topic>` from highlights"** — e.g. *"draft a LinkedIn post on Mirage PMF from highlights"*, *"draft the opening of the fractional-marketing pillar on niche discipline from highlights"*, *"draft a cold-email opener for the KOG sequence from highlights"*.

**The point of this workflow is not "AI writing assistance."** It is the inverse: the output must carry the highlights and the user's marginalia rather than generic filler. This is the workflow that earns the "human-tone, not AI-generated" bar ProGrowth content holds itself to.

1. **Identify the output shape.** Parse the trigger for `<output-type>` (LinkedIn post / blog section / cold-email opener / pitch slide / one-page memo / talk outline / etc.) and `<topic>`. Output types have different length and structure conventions:
   - **LinkedIn post** — 120–300 words; one core claim; 1 quoted highlight max; conversational voice.
   - **Blog section** — 400–900 words; 2–4 highlights woven in; sub-headings if useful.
   - **Cold-email opener** — 40–80 words; *referenced* highlight (not quoted at length); see §4.8 resurface candidates for the KOG outreach as a worked example.
   - **Pitch slide / one-page memo** — bulleted; 1–2 highlights as supporting quotes with attribution.
   - **Talk outline** — claim-skeleton + 3–5 supporting highlights to load into the talk.
   If the trigger is ambiguous, ask once for the output shape, then proceed.
2. **Gather raw material.** Call `mcp__readwise__readwise_search_highlights` with `vector_search_term` matching the topic, plus `full_text_queries` if the topic has a known author or named-framework anchor. Request `response_fields` including `text`, `note`, `book_title`, `book_author`, `highlight_tags`. **The `note` field is the load-bearing signal** — that's the marginalia, the "why I marked this." Pull ~20 candidates, then re-rank for applicability to the *specific* output (most-applicable, not most-similar — same rule as §4.8 step 3).
3. **Cross-reference into the wiki.** For each surviving candidate highlight, scan `wiki/concepts/*.md` and `wiki/sources/*.md` for matching pages. Note any concept pages the topic touches — the draft should `[[wiki-link]]` to them when the connection is real. This is the compounding move: outputs cite the wiki, the wiki accumulates outputs in its "Sources citing this page" list, the next draft on a related topic finds the prior draft via that backlink.
4. **Draft with the hard voice rule.** **Preserve the user's voice; quote real highlights.** Specifically:
   - **Quote 2–4 highlights verbatim** (LinkedIn-post outputs may use only 1) with attribution. Verbatim means *exactly the text from Readwise* — apostrophe and dash style is the user's, not yours. The §4.6 lesson holds: never paraphrase a quote under an author's name.
   - **Marginalia is connective tissue, not paraphrase fodder.** If a highlight has a `note` attached, the note is the user's reading of it. Lift the note's language directly into the draft as the linking sentence between highlights — *do not rewrite it.* Quote the marginalia inline if the voice is strong enough (`"<your own note>" — Siva's reading of the passage`).
   - **No generic-filler sentences.** Sentences like "in today's fast-moving landscape," "more than ever," "the question we need to ask is" — anything that could appear in any AI-generated draft on any topic — get stripped. If the sentence isn't doing work specific to this topic and these highlights, it doesn't ship.
   - **Embed `[[wiki-links]]` where the draft cites a concept the wiki already covers.** Don't strip them at the end; let the output carry the graph.
5. **Honest empty-result rule.** If fewer than 2 highlights survive re-ranking for applicability — and the user hasn't authored marginalia on the topic — say so plainly: *"No highlights cross the applicability threshold for `<topic>`. The Readwise library doesn't have material this output can borrow from yet."* Fabricating a draft from thin material is the failure mode this rule prevents.
6. **Marginalia-absent fallback.** If candidate highlights are dense on the topic but **none have user notes attached**, the workflow degrades gracefully:
   - The act of *marking* a highlight is itself a signal (the user thought this was worth saving) — proceed with the verbatim quotes, but flag the absence: *"This draft is built from your highlights but you haven't added marginalia on this topic yet — the voice is mine inferring yours from the surrounding wiki vocabulary."*
   - Pull voice from `wiki/concepts/*.md` pages on the topic (which the user has accepted as expressing their position). The concept pages are voice-of-record when marginalia is missing.
   - This fallback is honest, not silent. Don't pretend marginalia is there when it isn't.
7. **Present the draft inline + save to file.** Save at `raw/notes/drafts/<topic-slug>-<YYYY-MM-DD>.md`. **Tracked by default** (so drafts compound across devices and the user can find them later); the user can `.gitignore` the folder if drafts should stay local-only. Frontmatter:
   ```yaml
   ---
   type: draft
   output_type: <linkedin-post | blog-section | cold-email-opener | ...>
   topic: <verbatim from trigger>
   created: <YYYY-MM-DD>
   updated: <YYYY-MM-DD>
   highlights_used: [<readwise_highlight_ids>]
   wiki_concepts_referenced: [<wiki-page-slugs>]
   ---
   ```
   Iterations on the same day update the same file in place. A genuinely-different variant gets `-v2` suffix.
8. **Record in `readwise-state.json`** — append to `outputs_drafted`:
   ```json
   {"topic": "<verbatim topic>", "draft_path": "raw/notes/drafts/<slug>.md", "created": "<iso8601>"}
   ```
9. **Log one entry per session** (not per iteration). When the user starts on a fresh topic, append `## [YYYY-MM-DD HH:MM] query | drafted <output-type> on <topic> from highlights — N quotes, M wiki concepts cited`. Iterations on the same topic in the same session don't earn new log entries.

**Why this matters.** Most "AI-assisted writing" produces drafts that are competent and generic — exactly the failure mode ProGrowth's content has to avoid. The §4.9 workflow inverts the relationship: highlights are the *evidence*, marginalia is the *voice*, the wiki is the *graph*, and the AI's job is the connective scaffolding around all three. If the draft could have been written without ever opening Readwise or the wiki, the workflow has failed at its job. The draft passes the bar when a friend reading it says *"this sounds like you read X, then Y, and then connected them in a way that's specifically yours"* — that's exactly what should be true, because it is.

#### Cadence

- **Triggered, not scheduled.** Drafts happen when a specific output is being made — a LinkedIn post, a blog section, an email, a slide. Don't run §4.9 as a daily habit; run it as a writing tool.
- **Pairs naturally with §4.8 resurface.** When working on a piece, run §4.8 first to surface relevant highlights for the *work*, then §4.9 to draft *from* those highlights. The two workflows compose — resurface prepares the material, draft produces the output.
- **Multiple drafts per topic are normal.** Running §4.9 three times in one session to iterate on a LinkedIn post is the expected pattern. Each iteration updates the same file; only the first iteration produces a log entry.

### 4.10 Triage the Reader inbox

When the user says **"triage Reader"** / **"triage the inbox"** / **"drain Reader"**:

This is the **Readwise Reader** app (read-it-later) — *not* the article inbox in `raw/articles/`. The Reader triage is **upstream** to §4.3: Class-A items in this workflow become `tags: [inbox]` files in `raw/articles/` that §4.3 picks up on the next Sunday drain.

1. **List the pile** — call `mcp__readwise__reader_list_documents` for **both** the `new` (read-later inbox, `triage_status: new`) and `feed` (RSS subscriptions) locations. Pull `id`, `title`, `url`, `source`, `word_count`, `created_at`. Count each location separately; large `feed` queues need different treatment than the smaller, more deliberate `new` location (see Cadence below).
2. **Summarize one line per item** — title, source domain, length (in minutes-to-read = `word_count / 225`), date saved. Group by location: present `new` items first, then `feed` items. Don't paginate beyond ~20 items per chunk — at higher volume, batching is mandatory or the user can't make per-item picks honestly.
3. **Recommend a triage class for each** — one of:
   - **A) Promote to `raw/articles/` for full ingest.** High-signal, adjacent to current wiki / `Now.md` work, or surfaces a named concept the wiki doesn't yet cover. Use this for items worth the §4.1 9-step ingest treatment.
   - **B) Skim now.** Surface the article's key claim (2–4 sentences) inline in chat, then archive in Reader. **Don't persist to `raw/`** — this is the "I just want to know what they said" path. Recommend for category recaps, news pieces, and item-of-the-week posts that don't introduce new claims.
   - **C) Archive.** Move the item out of `new`/`feed` but keep it in Reader. No wiki action. Recommend when the item might be useful later but isn't actionable now (reference material, future-product research).
   - **D) Delete.** Guilt-pile clearance. Item is in the inbox because past-you was optimistic, present-you doesn't believe in it anymore. The whole point of this workflow is to make this an easy, no-shame click.
4. **Wait for the user** to pick per item. **Do not batch-act.** Group decisions of the same class are fine (e.g., user says "all the Substack newsletter posts from this week → C archive") — but the class still has to be named per item or per explicit group.
5. **Execute each chosen action:**
   - **A) Promote:** call `mcp__readwise__reader_get_document_details` to fetch the full content. Write to `raw/articles/<slug>.md` with frontmatter that §4.3 will recognize:
     ```yaml
     ---
     type: article
     title: <verbatim from Reader>
     url: <original URL>
     source: <domain>
     reader_id: <Reader document id>
     saved: <YYYY-MM-DD>
     word_count: <int>
     tags: [inbox]
     ---
     ```
     Then move the Reader document to `archive` (via `mcp__readwise__reader_move_documents`) so it doesn't re-surface on the next triage. **Don't ingest the article in this workflow** — §4.3 handles the ingest on the next Sunday drain. The hand-off is the point.
   - **B) Skim:** read the article via `reader_get_document_details`, write 2–4 sentence summary inline in chat with attribution. Then call `reader_move_documents` to move to `archive`. No file written.
   - **C) Archive:** call `reader_move_documents` to move to `archive`. Done.
   - **D) Delete:** Reader's API supports removal — use `reader_move_documents` to the appropriate trash/delete location (Reader's deletion semantics vary; consult the MCP tool's current behavior). If true deletion isn't available, archiving with a `deleted` tag is the documented fallback.
6. **Summarize the batch in chat** — *"N promoted, M skimmed, K archived, J deleted. Promoted items will be picked up by the next §4.3 article drain."* Keep it terse; the per-item work is done.
7. **Append one log entry** covering the batch — `## [YYYY-MM-DD HH:MM] query | triaged Reader — N promoted, M skimmed, K archived, J deleted`.
8. **Record in `readwise-state.json`** — append to `feed_triage_runs`:
   ```json
   {"created": "<iso8601>", "promoted": <N>, "skimmed": <M>, "archived": <K>, "deleted": <J>}
   ```
   The counts are the longitudinal signal — if `promoted` is climbing while `deleted` is flat, the read-it-later filter at the *source* (what you save) is too loose. The §4.11 reading-pattern mirror reads these counts.

**Why this matters.** The failure mode of every read-it-later app is the guilt pile. Items accumulate faster than they get read; the inbox becomes a museum of optimism past. Triage on a regular cadence keeps **intake deliberate** — every item that survives a triage was actively chosen, not passively deferred. The `D` class is load-bearing: if there's no easy way to delete-without-guilt, the workflow degrades to "skim everything anyway" which is what Daily Review was supposed to fix.

**Hand-off to §4.3.** Class-A items leave Reader and enter `raw/articles/` with `tags: [inbox]`. The next Sunday article drain picks them up automatically — you don't re-decide what to do with them. This is the chain: Reader (intake) → §4.10 (triage) → `raw/articles/` (queue) → §4.3 (ingest decision) → `wiki/` (synthesis). Each step has its own job; none of them is "decide everything at once."

#### Cadence

The two locations have different rhythms:

- **`new` (inbox)** — drain whenever it exceeds ~10 items, or on the Sunday Weekly Review by default. The inbox represents *deliberate* saves (the user clipped something on purpose); over-accumulation here is the symptom of postponing decisions, not of over-subscribing.
- **`feed` (RSS)** — drain on a longer rhythm (every 2–4 weeks) because feeds accumulate by subscription, not by deliberate choice. The triage *here* is partly about un-subscribing from feeds where the D-class rate exceeds 80% — that's a signal the subscription itself is the noise, not any given item.
- **Before a synthesis brief (§4.7)** — running a triage first ensures the week's highlights are over actually-chosen material, not over noise you didn't have the patience to delete.

### 4.11 Reading-pattern mirror

When the user says **"reading mirror"** / **"what am I actually reading"** / runs the quarterly review.

This is the only workflow in the §4.6–§4.10 family that asks a question the user does not want to hear: *what you said you'd focus on this quarter vs. what you actually fed your brain.* The output is a **candid mirror — not a celebratory summary.** Mirrors that conclude *"great mix of reading this quarter!"* have failed their job. If the quarter's reading was genuinely well-calibrated, the mirror should still surface what *didn't* show up, what's narrowing, and what overlaps across nominally unrelated reads. A mirror that surfaces no friction is suspect.

1. **Pull the last 13 weeks of Readwise activity** — the quarterly window. Multiple calls:
   - `mcp__readwise__readwise_list_highlights` with `highlighted_at_gt = <13 weeks ago>` for every highlight in the window. Group by `book_id` to derive per-source highlight counts.
   - `mcp__readwise__reader_list_documents` with `updated_after = <13 weeks ago>` for Reader articles read (look for non-null `first_opened_at` and `last_opened_at` within the window).
   - From the accumulated `readwise-state.json`: which §4.6 book ingests, §4.10 Reader triages, §4.7 synthesis briefs, §4.8 resurfaces, §4.9 drafts happened in the window.
2. **Categorize by topic / vertical / author. Build a small frequency map** — book titles by author, articles by source domain, highlights by category. **Don't pre-define the categories** — let them emerge from the actual data. Typically 5–9 emergent categories per quarter.
3. **Cross-reference against goals.** Read the user's goal system from at least three places:
   - **Active projects:** every `wiki/projects/*.md` page that was current during the window.
   - **`Now.md`** — the 12-week-year theme line and the "This week" items that were active during the window (use git history on `Now.md` if multi-week reconstruction is needed).
   - **External goal artifacts** if the user maintains them — Harada Method goal sheets, OKRs, quarterly planning docs. Read them via Obsidian MCP if they're in the vault, or ask the user to summarize if they're elsewhere. The §4.11 spec doesn't require any *specific* goal system, but cross-reference against *some* explicit goal artifact — without that, the mirror has nothing to mirror against.
4. **Produce the candid mirror** — for each of the four surfaces below, write 1–3 specific observations. Be willing to be wrong; the mirror is the user's prompt to push back, not the agent's verdict.
   - **Over-indexing** — topics that consumed disproportionate read time relative to their goal priority. *"You read 4 books on storytelling craft this quarter but no books on the quantitative side of [active project], even though it's the harder leg of your goal."*
   - **Verticals stopped feeding** — categories you used to read that have gone silent. *"You used to read regularly on [topic] through Q1; nothing in the last 13 weeks. Intentional, or drift?"* The drift question matters because the answer determines whether the silence is **strategic narrowing** (you decided this is no longer useful) or **passive drift** (you just stopped, without ever deciding).
   - **Narrowing** — drift toward a smaller author/source set. If the previous quarter had 8 distinct authors with ≥3 highlights and this quarter has 4, name the contraction. Narrowing is *neutral* on its face — sometimes deep is right, sometimes it's an echo chamber — but the agent's job is to surface the pattern, not judge it.
   - **Surprising overlap** — themes that recurred across nominally unrelated reads. This is the quarterly counterpart to §4.7's collision-hunt — at week-scale you catch which highlights collide; at quarter-scale you catch which *themes* keep showing up across unrelated material. If the same conceptual move appeared in 3+ unrelated books or articles, it's a candidate emergent pattern worth a `wiki/concepts/` page (or strengthening an existing one).
5. **File as a query page** at `wiki/queries/reading-mirror-<YYYY>-Q<n>.md` (calendar quarter — `Q1` covers Jan-Mar, `Q2` Apr-Jun, `Q3` Jul-Sep, `Q4` Oct-Dec). If the user runs 12-week-year cycles instead of calendar quarters, allow `reading-mirror-<YYYY>-cycle-<n>.md`. Structure:
   ```
   ## Period
   <window dates, # books touched, # articles read, # highlights added>

   ## Frequency map
   <emergent categories with counts>

   ## Goal cross-reference
   <what was on the goal list this quarter, lifted from Now.md / wiki/projects/*.md / external goal artifacts>

   ## Over-indexing
   ## Verticals stopped feeding
   ## Narrowing
   ## Surprising overlap

   ## Open question
   <one question for the next quarter's reading diet — not a prescription>
   ```
6. **End with a question, not a prescription.** Step 4's findings expose patterns; step 6 is the user's prompt to decide what (if anything) to change next quarter. The agent does not say *"you should read more X."* The agent asks *"given the over-indexing on X and silence on Y, what reading would you want to bias toward next quarter?"* The mirror is diagnostic; the prescription is the user's.
7. **Record in `readwise-state.json`** — append to `mirror_runs`:
   ```json
   {"period_iso": "2026-Q2", "filed_to": "wiki/queries/reading-mirror-2026-Q2.md", "created": "<iso8601>"}
   ```
8. **Append one log entry** — `## [YYYY-MM-DD HH:MM] query | reading-pattern mirror — <period> — N books, M articles, K highlights, J emergent categories`.

**Why this matters.** Reading is a leading indicator of work. What you fed your brain last quarter shapes what you can do this quarter; what you feed it this quarter shapes the work two quarters out. The mirror catches drift *before* it propagates into output — the narrowing you notice in Q2's reading will show up as narrowing in Q4's writing if uncaught. The §4.11 workflow exists because the user is the only person who can spot calibration mistakes in their own reading diet, and they can't spot them without the data laid out honestly.

The mirror is also the only workflow with a **truth-telling bias built into the spec** — every other workflow (§4.6–§4.10) is operationally neutral. §4.11 is explicitly tasked with surfacing uncomfortable findings. If the mirror's tone drifts toward "great quarter, well done" over time, that drift is itself a finding worth noting on the next run.

#### Cadence

- **Quarterly** (calendar quarters) is the default — anchored to the natural reflection points around Jan/Apr/Jul/Oct.
- **Pairs with the 12 Week Year review** if the user runs that cycle — the reading mirror is the input layer to the broader 12-week reflection, since reading shapes capacity.
- **Skip a quarter without guilt** if the user wasn't tracking goals or reading was minimal — but log the skip in `mirror_runs` with a one-line reason, so the longitudinal signal stays clean. The `scripts/readwise-state.py` reporter's "days since last mirror" line is the nag.
- **Don't run more often than quarterly** — the patterns the mirror catches need at least 8–13 weeks of data to be visible. Monthly mirrors collapse into noise.

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

## 11. Obsidian MCP Tool Preference

When operating inside `~/Projects/gnosis/`, prefer the Obsidian MCP tools (`mcp__obsidian__*`) over filesystem `Read`/`Grep`/`Write`/`Edit` for vault work. The MCP server reads the live Obsidian vault — it sees unsaved edits, respects the index, and triggers re-indexing on writes. Filesystem operations only see what's on disk and bypass Obsidian's awareness.

### Prefer MCP for

- **Reading a vault page** — `mcp__obsidian__vault_read` over `Read`. Returns the live buffer including unsaved changes.
- **Listing vault contents** — `mcp__obsidian__vault_list` over `ls`/`Glob`.
- **Full-text search** — `mcp__obsidian__search_simple` (substring) or `mcp__obsidian__search_query` (Dataview-style filters) over `Grep`.
- **Backlinks / inbound links** — `mcp__obsidian__search_simple` querying for `[[page-slug]]` is the canonical way; the linking pages are the backlinks. Use this when maintaining `## Sources citing this page` sections (§5.3).
- **Tag enumeration** — `mcp__obsidian__tag_list` over grepping frontmatter.
- **Writing or patching pages** — `mcp__obsidian__vault_write` / `vault_patch` / `vault_append` over `Write` / `Edit`. These trigger Obsidian's re-index immediately; raw filesystem writes don't.
- **Moving or deleting** — `mcp__obsidian__vault_move` / `vault_delete`. They preserve Obsidian's link integrity where possible.
- **Document structure before patching** — `mcp__obsidian__vault_get_document_map` to see headings/sections.
- **Opening a page in the Obsidian UI** — `mcp__obsidian__open_file` (e.g., after a lint flag, to let the user fix in-app).

### Fall back to filesystem `Read`/`Grep`/`Bash` when

- The Obsidian app isn't running and the MCP server is unreachable. Surface this to the user — don't silently degrade and don't pretend the writes hit a live vault.
- You're touching `raw/`. The user owns `raw/` (§1) and Obsidian's index is incidental there. Filesystem `Read` is the correct tool.
- You need shell-only operations: `git log`/`blame` on a page, `find` by mtime, bulk regex across hundreds of files where MCP search would be slower, or running `scripts/*.py`/`scripts/*.sh`.
- You're touching the projection at `~/Projects/gnosis-main/` — that's outside the canonical vault entirely (§9), and MCP doesn't see it.

### Never via either path

- Do not write to `raw/` (§1).
- Do not edit auto-generated widget blocks in the projection (§8). Edit the generator instead.
- Do not use MCP writes as a shortcut to bypass the §4.1 ingest workflow — the workflow (discuss → write source page → update referenced pages → cross-reference → index → log) is independent of the tool used to make the writes.
