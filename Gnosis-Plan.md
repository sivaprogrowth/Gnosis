# Gnosis — Architecture & Plan

**Status:** finalized 2026-04-19. Ready for Phase 0 implementation.
**Supersedes:** the pre-pivot version of this document (Claude-Code-runtime design).

---

## 1. Purpose

Gnosis is a personal knowledge system that captures not just what you consumed, but *why it mattered to you*. An LLM-backed agent ingests sources (articles, PDFs, notes, images, films) and maintains a persistent, cross-linked markdown vault where your emotional and aesthetic reactions are first-class data alongside the content itself. When you later ask a question — "design a landing page inspired by recent saves" — the agent retrieves from your own taste-annotated corpus instead of the internet, and connections you drew at ingest time surface automatically.

Core inspiration: Karpathy's LLM-wiki pattern — *compile, don't rediscover*. Knowledge compounds on ingest; retrieval reads a pre-structured graph instead of re-deriving connections from scratch.

## 2. USP — what makes Gnosis different

| Tool | What it stores | What it misses |
|---|---|---|
| Pinterest | Images | Why you saved them |
| Obsidian | Text notes | Images + your reaction |
| Readwise | Highlights | Connections + aesthetics |
| Notion | Structured docs | Emotion + serendipity |
| **Gnosis** | **Sources + your reaction + emotion/aesthetic tags + cross-links** | — |

Two commitments make this specific:
1. **Reaction layer is mandatory.** Every source, regardless of medium, gets a "why did you save this" pass at ingest. Dictated by you, transcribed by the agent.
2. **Emotion is a first-class retrieval dimension.** Every page carries structured emotion/mood/aesthetic tags. Queries are parsed for emotional intent. Matching happens on this axis alongside topic.

## 3. Scope — local-first MVP

- Single machine, local filesystem.
- Markdown + YAML frontmatter as the only canonical store. Git as transaction log.
- CLI only. No web UI, no mobile, no cloud, no DB, no vector store.
- Interactive flow. Human in the loop for every ingest. No cron.
- Images are first-class from day one (not deferred).

Everything else is explicitly deferred. See §13.

## 4. Provider strategy — hybrid

Anthropic and OpenAI split along each provider's strengths.

| Stage | Provider | Model | Why |
|---|---|---|---|
| Ingest agent loop | Anthropic | `claude-opus-4-7` | Tool-use + extended thinking; best for multi-turn agentic work |
| Reaction pass (text) | Anthropic | `claude-sonnet-4-6` | Conversational, cheaper |
| Vision pass (image caption + style tags) | OpenAI | `gpt-4o` | Good multimodal + structured output |
| Emotion extraction | OpenAI | `gpt-4o-mini` | JSON schema / structured outputs are best-in-class |
| Query understanding (Stage 1) | OpenAI | `gpt-4o-mini` | Structured outputs, fast, cheap |
| Re-rank (Stage 3) | OpenAI | `gpt-4o-mini` | Fast small-model classification |
| Synthesis (Stage 5) | Anthropic | `claude-opus-4-7` | Long-context reasoning, extended thinking |
| Embeddings (deferred) | OpenAI | `text-embedding-3-large` | Added when vault scales |

**Provider abstraction:** a `providers/` module with `anthropic_client.py` and `openai_client.py`, both exposing a common interface (`chat`, `tools`, `structured`). Call sites pick the provider by stage, not by availability.

**Prompt caching:** the system prompt (schema) + `index.md` are sent on most calls. Anthropic prompt caching is enabled on these stable prefixes. OpenAI equivalent used where available.

## 5. Storage layer

### Directory layout

```
<vault-root>/                       # configurable, defaults to ~/gnosis-vault
├── raw/                            # IMMUTABLE — agent reads, never writes
│   ├── articles/                   #   web articles (hash-named)
│   ├── pdfs/                       #   papers, books
│   ├── notes/                      #   personal notes / journal
│   └── assets/                     #   images, films, other media (hash-named)
├── wiki/                           # AGENT-OWNED
│   ├── sources/                    #   one page per raw source (text or image)
│   ├── entities/                   #   people, companies, products, works
│   ├── concepts/                   #   ideas, frameworks, aesthetics
│   └── queries/                    #   filed-back query answers
├── index.md                        # content catalog — maintained by agent
└── log.md                          # append-only history
```

Code lives separately — vault is data only, not code.

### Page format (canonical)

```markdown
---
id: 01HX8K2R3M5N7P9Q0S1T2V4W5Y          # UUID, immutable
type: source | entity | concept | query
subtype: fact | take | object            # soft hint, optional
media: text | image | film | audio       # for sources
created: 2026-04-19T14:23:00Z
updated: 2026-04-19T14:23:00Z
sources: [raw/articles/a1b2c3.md]        # for sources: self; for entities/concepts: all citing
aliases: ["Kahneman", "D. Kahneman"]     # for entity pages
tags: [animation, studio-ghibli]
emotion: [nostalgia, stillness, wonder]  # open-vocab tags
emotion_controlled: [joy, anticipation]  # controlled vocab (Plutchik-based) for matching
aesthetic: [warm, hand-drawn, 80s-anime]
mood: contemplative
---

# Page title

Body: markdown with [[wiki-links]] to other pages.

## Reaction
(for sources — the user's why-I-saved-this, dictated at ingest)

## Links
- [[related-page-1]]
- [[related-page-2]]
```

### Identity

- **Filename** (kebab-case) = display name + default link target.
- **Frontmatter `id`** (UUID) = immutable identity. Survives renames.
- Links use filenames (`[[daniel-kahneman]]`) for readability. A rename-aware resolver updates links — deferred until the first big rename actually happens.

### Raw sources — content-addressed

- Filename includes a content hash: `raw/articles/a1b2c3d4.md`.
- Prevents double-ingest of the same article via different URLs.
- Original URL, fetch date, mime type preserved in frontmatter.

### Git as the transaction log

Every agent-induced change is a commit. Message format:
```
ingest: <source title>
query: <query slug>
merge: <entityA> ← <entityB>
retract: <page>
lint: <summary>
```

Human edits commit separately, distinguishable by author. Rollback, audit, "what did the agent change last week" all come free.

### Controlled emotion vocabulary

A small fixed vocabulary lives at `gnosis/schema/emotions.py`. Plutchik-inspired primaries + aesthetic axes:

- **Emotion primaries** (8): joy, trust, fear, surprise, sadness, disgust, anger, anticipation.
- **Aesthetic axes** (~20): warm/cool, bold/subtle, vintage/modern, organic/geometric, minimal/ornate, soft/hard, light/dark, etc.

Open-vocab tags captured in `emotion:` field; controlled mapping in `emotion_controlled:`. Matching at query time uses controlled vocab; display uses open vocab.

## 6. Ingest pipeline

```
          ┌──────────────────────────────────────────────┐
          │  1. Fetch / load source                      │
          │     URL → raw/articles/<hash>.md             │
          │     PDF → raw/pdfs/<hash>.md                 │
          │     Image → raw/assets/<hash>.<ext>          │
          │     Note → raw/notes/<slug>.md               │
          └──────────────────────────────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────────┐
          │  2. Content pass                             │
          │     Text: summarize key claims               │
          │     Image: vision caption + style tags       │
          │     Model: sonnet-4-6 (text) / gpt-4o (img)  │
          └──────────────────────────────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────────┐
          │  3. Reaction pass (the USP)                  │
          │     Adaptive questions based on content:     │
          │       "What made you save this?"             │
          │       "What did you underline / notice?"     │
          │       "What does this remind you of?"        │
          │       (agent suggests candidates from index) │
          │     User dictates, agent transcribes.        │
          └──────────────────────────────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────────┐
          │  4. Emotion extraction                       │
          │     Structured output from content + reaction│
          │     → emotion, emotion_controlled, aesthetic,│
          │       mood, tags                             │
          │     Model: gpt-4o-mini with JSON schema      │
          │     User can edit before commit.             │
          └──────────────────────────────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────────┐
          │  5. Cross-link pass                          │
          │     Identify entities/concepts in content.   │
          │     For each: page exists? → soft merge      │
          │                page missing? → draft new     │
          │     Add [[links]] on source page and updates │
          │     on affected entity/concept pages.        │
          └──────────────────────────────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────────┐
          │  6. Write + commit                           │
          │     Write source page, updated entities,     │
          │     concept pages. Update index.md. Append   │
          │     log entry. git commit.                   │
          └──────────────────────────────────────────────┘
```

## 7. Retrieval pipeline (6 stages)

```
┌──────────────────────────────────────────────────────────────┐
│  Stage 1 — Query understanding                               │
│    Input: natural-language question                          │
│    Output: {topic, intent, emotion, aesthetic, time_scope}   │
│    Provider: OpenAI gpt-4o-mini + JSON schema                │
├──────────────────────────────────────────────────────────────┤
│  Stage 2 — Candidate retrieval                               │
│    Lexical: grep on index.md + full-text on wiki/            │
│    Frontmatter filter: tag/emotion/aesthetic match           │
│    Output: ~20 candidates with signals + scores              │
│    Pure code. No LLM.                                        │
├──────────────────────────────────────────────────────────────┤
│  Stage 3 — Re-rank                                           │
│    LLM reads candidate frontmatter + one-line summaries      │
│    Picks top K=5-8 most relevant to full query               │
│    Provider: OpenAI gpt-4o-mini                              │
├──────────────────────────────────────────────────────────────┤
│  Stage 4 — Context assembly                                  │
│    Read top-K pages in full                                  │
│    Track citation metadata                                   │
│    Build context window                                      │
│    Pure code. No LLM.                                        │
├──────────────────────────────────────────────────────────────┤
│  Stage 5 — Synthesis                                         │
│    Generate answer with [[wiki-link]] citations              │
│    Chain-of-thought for complex queries                      │
│    Provider: Anthropic claude-opus-4-7 (extended thinking)   │
├──────────────────────────────────────────────────────────────┤
│  Stage 6 — File-back                                         │
│    If non-trivial, offer to save as wiki/queries/<slug>.md   │
│    Commit new query page to git                              │
│    This is the compounding loop.                             │
└──────────────────────────────────────────────────────────────┘
```

**Why this decomposition:** each stage is swappable. Stage 2 can go from grep → BM25 → vectors without touching Stages 1, 3, 5. Stage 3 dramatically improves precision and is cheap. Expensive calls (Stages 1, 5) are isolated; Stages 2, 3, 6 stay fast/cheap.

## 8. Compaction

**Entity merging**
- *Soft merge (auto):* on ingest, name-match against existing entity pages. If match: add alias to frontmatter. No files moved.
- *Hard merge (confirm first):* agent detects two pages that should be one, surfaces them with a proposed consolidation. User approves → merge content, leave redirect stub, update links.

**Concept emergence**
- Trigger: phrase/theme appears in ≥3 source pages without a dedicated concept page.
- Agent drafts `wiki/concepts/<slug>.md` and surfaces for user approval. Never auto-publishes — user owns the concept vocabulary.

**Stale-claim resolution**
- On ingest, if new source contradicts existing claim: auto-append `## Contradictions` section with both claims and citations.
- Rewriting (replacing old claim): always requires user approval. Logged as `retract:` commit.

All compaction state lives in markdown + frontmatter. No graph DB. A future graph layer reads from this.

## 9. Agent contract — autonomy bounds

| Action | Autonomy |
|---|---|
| Fetch / read raw source | Auto |
| Write source summary | Auto (after reaction pass) |
| Create new entity/concept page | Auto |
| Soft-merge (add alias) | Auto |
| Update cross-references | Auto |
| Flag contradiction | Auto |
| Commit to git | Auto |
| Hard-merge two entity pages | **Confirm** |
| Retract / rewrite a prior claim | **Confirm** |
| Publish a new concept page from emergence | **Confirm** |
| Delete any page | **Never** without confirmation |

`ask_user` is a first-class tool. LLM calls it when genuinely stuck or crossing a confirm-required boundary. Everything else runs through.

## 10. Agent loop shape

- Multi-turn tool-use loop. Max 30 turns per ingest; 15 per query.
- Streaming output — user sees the chain of thought live in CLI.
- Tools exposed: `read_file`, `write_file`, `list_dir`, `fetch_url`, `extract_pdf`, `append_log`, `git_commit`, `ask_user`.
- Extended thinking enabled for Anthropic stages (ingest, synthesis).
- OpenAI structured outputs with JSON schema for parse/emotion/re-rank.

## 11. CLI surface

```
gnosis ingest <url|path>          # interactive ingest
gnosis ingest <image-path>        # image ingest (vision + adaptive questions)
gnosis ingest --auto <url|path>   # skip the interactive reaction pass (not recommended)
gnosis query "<question>"         # retrieval pipeline
gnosis query --file-back "..."    # query + auto-save to wiki/queries
gnosis lint                       # run compaction scan, report only
gnosis lint --apply               # apply suggested compactions (with confirmations)
gnosis status                     # vault stats — source count, last ingest, etc.
```

## 12. Code layout

```
<repo-root>/
├── pyproject.toml
├── README.md
├── Gnosis-Plan.md              # this doc
├── gnosis/                     # the package
│   ├── __init__.py
│   ├── cli.py                  # typer/click entry points
│   ├── config.py               # vault path, provider keys, model IDs
│   ├── schema/
│   │   ├── pages.py            # page dataclasses, frontmatter shape
│   │   └── emotions.py         # controlled vocabulary
│   ├── providers/
│   │   ├── base.py             # common interface
│   │   ├── anthropic_client.py
│   │   └── openai_client.py
│   ├── agent/
│   │   ├── loop.py             # multi-turn tool-use loop
│   │   ├── tools.py            # tool definitions
│   │   ├── prompts.py          # system prompts (schema as code)
│   │   ├── ingest.py
│   │   ├── query.py
│   │   └── lint.py
│   ├── storage/
│   │   ├── pages.py            # read/write markdown + YAML
│   │   ├── index.py            # index.md operations
│   │   ├── log.py              # log.md append
│   │   └── git_ops.py          # commit with intent-encoded messages
│   └── retrieval/
│       ├── parse.py            # Stage 1
│       ├── candidates.py       # Stage 2
│       ├── rerank.py           # Stage 3
│       ├── assemble.py         # Stage 4
│       ├── synthesize.py       # Stage 5
│       └── fileback.py         # Stage 6
└── tests/
```

## 13. Implementation phases

### Phase 0 — Skeleton
- Python project setup (`pyproject.toml`, venv, `.env` handling).
- Install: `anthropic`, `openai`, `pydantic`, `typer`, `pyyaml`, `python-frontmatter`, `gitpython`, `httpx`, `pypdf`.
- Scaffold directory tree under `gnosis/`.
- Implement `config.py` — vault path, API keys, model IDs.
- Implement `providers/` base + both client stubs.
- Implement `storage/pages.py` (read/write frontmatter + body) + `git_ops.py`.
- CLI stub with all commands registered, all returning "not implemented."
- Vault init: `gnosis init <path>` creates the directory tree, empty index.md and log.md, git init.
- **Acceptance:** `gnosis init ~/gnosis-vault` creates a working vault; `gnosis status` reports empty vault.

### Phase 1 — Text ingest with reaction pass + emotion
- Implement `agent/loop.py` — multi-turn tool-use with Anthropic.
- Implement `agent/tools.py` — the seven tools.
- Implement `agent/ingest.py` — full text ingest workflow.
- Implement `agent/prompts.py` — system prompt encoding the schema.
- URL fetching + PDF extraction.
- Reaction pass: adaptive questions.
- Emotion extraction via OpenAI structured output.
- Cross-link pass (soft merge only).
- index.md + log.md updates + git commit.
- **Acceptance:** ingest a real article end-to-end. Source page exists with emotion frontmatter. Entity/concept pages created and cross-linked. `git log` shows the commit. `index.md` updated. Re-ingesting the same URL dedupes.

### Phase 2 — Retrieval pipeline (all 6 stages)
- Implement all six `retrieval/` modules.
- Wire up `agent/query.py` to invoke the pipeline.
- File-back as wiki/queries/ + git commit.
- **Acceptance:** ingest 3–5 diverse articles, then ask a synthesis question that crosses them. Answer cites `[[wiki-links]]`, emotion filter demonstrably affects results (ask the same topic query with different emotion framings and see different pages surface). File-back creates a valid query page.

### Phase 3 — Image ingest
- Vision pass via OpenAI gpt-4o multimodal.
- Adaptive question generation based on vision output.
- Image-specific reaction pass.
- Write image source page with full frontmatter.
- **Acceptance:** ingest a Ghibli film still and a UI screenshot. Each gets a source page with open-vocab emotion tags, controlled emotion mapping, and a dictated reaction. Query "something calming and hand-drawn" surfaces the film still.

### Phase 4 — Compaction / lint
- Hard-merge detection and confirmation flow.
- Concept-emergence scanner (N≥3 threshold).
- Contradiction scanner.
- Lint report generation.
- `--apply` mode with per-item confirmation.
- **Acceptance:** intentionally ingest two sources that reference the same person with different names; `gnosis lint` proposes a hard merge. Ingest five sources touching "deep work"; lint proposes a concept page.

## 14. Explicitly deferred

| Item | Defer until |
|---|---|
| SQLite side-index | vault > 200 pages |
| Vector embeddings | vault > 200 pages OR retrieval precision drops |
| Rename-aware link resolver | first big rename happens |
| Provider abstraction beyond Anthropic/OpenAI | second actual need |
| Web UI / TUI | after CLI is proven |
| Obsidian plugins / Dataview / Marp | user choice, orthogonal |
| Browser extension / share sheet | after first 20 ingests are clearly the bottleneck |
| Multi-device sync | explicit user need |
| Cron / scheduled ingest | never for MVP |
| Collaboration / multi-user | out of scope — different product |

## 15. Open decisions

- **Language.** Python recommended throughout this doc for ecosystem fit (markdown, vision, PDF, SDKs). TypeScript is viable if web UI is planned. **Pending user confirmation.**

## 16. Success criteria — how we know Gnosis works

After Phases 0–3 are done, two tests:

1. **The retrieval USP test.** Ingest: a Studio Ghibli documentary article, 3 YC company landing pages (screenshots), and 2 photos of 1970s Beatles merch. Ask: "design a landing page inspired by recent saves." Answer should cite pages from all three clusters and identify a shared aesthetic/emotional throughline. This is the canonical query from day one.

2. **The compounding test.** Ask the same query six months in. It should pull pages that weren't in the corpus when the first query ran — and it should do so without performance degradation or human maintenance between the two queries.

If both pass, Gnosis works. Everything else is polish.
