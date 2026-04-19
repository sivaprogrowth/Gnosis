---
type: inspiration
created: 2026-04-19
updated: 2026-04-19
sources:
  - raw/notes/farza-farzapedia-tweet.md
tags: [inspiration, llm-wiki, knowledge-management, design-pattern, gnosis-provenance]
aliases: [farzapedia]
url: https://x.com/FarzaTV/status/2040563939797504467
---

# Farzapedia Pattern

The design inspiration behind [[gnosis-hackathon]]. Farza (founder of Buildspace / now at Sumi) posted a thread describing his personal knowledge system: a plain-markdown wiki maintained by an LLM, covering not just "topics he reads" but **his whole world** — people, companies, projects, inspirations, creative references.

## The core idea

> **Use an LLM as a disciplined wiki maintainer, not as a chatbot.**

Traditional personal knowledge systems (Notion, Obsidian, Roam) fail on the maintenance bottleneck: cross-linking, deduplication, contradiction-flagging, and index-keeping grow linearly with the wiki size. Humans abandon wikis because the upkeep outpaces the value.

LLMs don't abandon. They can:

- Read a new source in full (vs skimming)
- Write a structured summary with cross-links to existing pages
- Update every page that the new source touches (vs creating a duplicate)
- Flag contradictions between new and existing claims
- Append an audit log so the user can retrace how the synthesis arrived

Knowledge **compounds** across ingests instead of being re-derived on every query.

## What Farza's wiki covers

Per the thread, the wiki spans:

- **People** — contacts, collaborators, inspirations, historical figures
- **Companies** — employers, competitors, vendors, prospects, portfolio companies
- **Projects** — active initiatives, past work, research threads
- **Inspiration** — tweets, screenshots, design references, quotes
- **Concepts** — mental models, frameworks, arguments

Each entity maps into the wiki *in relation to Farza himself* — his network is the spine. Queries about "who would be good to intro me to X?" or "draft me a cold email in my voice to Y" become tractable because the wiki is personal, not universal.

## What Gnosis takes from the pattern

Gnosis (this wiki) applies the Farzapedia pattern to Siva's world:

1. **Unified vault, not siloed systems.** One markdown repo covers sources, concepts, people, companies, projects — not separate tools for each.
2. **LLM-owned maintenance.** [[claude]] runs the ingest/query/lint workflows per `CLAUDE.md`; the user curates sources and asks questions.
3. **Compounding is the value.** The [[new-front-door-to-the-internet|McKinsey]] ingest updating 5 existing Chen-et-al.-derived pages, rather than creating parallel duplicates, is the pattern working.
4. **Agent-native structure.** Folder-based routing + wiki-link syntax + YAML frontmatter are legible to both humans (via Obsidian) and the LLM (via file-system retrieval). No vector DB required.
5. **Generative use cases beyond Q&A.** The wiki can be used to *write* — cold emails, LinkedIn posts, pitch decks in [[siva-cotipalli|Siva's]] voice — because the voice primer, context, and evidence all live in the same graph.

## Difference from Farza's version

- **Gnosis has a public projection** — `gnosis-main.vercel.app` with a chat interface + auto-generated dashboard + per-page widgets. Farza's is private.
- **Gnosis has an explicit privacy-strip** (`## ProGrowth ...` H2 sections → stripped on sync). Farza's is personal-only, so no strip needed.
- **Gnosis ingests [[ai-native-services|AINS]]-framework sources** (Emergence Capital, McKinsey) because it's also ProGrowth's company brain, not just a personal wiki. Farza's is pure personal.

## Why file this as `inspiration` not `source`

The thread is the *design provenance* for the Farzapedia-style expansion that introduced `people/`, `companies/`, `projects/`, `inspiration/` folders. It's not a claim-source that populates concept pages — it's the meta-reason the schema looks the way it does. `inspiration/` is the right home.

## Sources citing this page

- [[gnosis-hackathon]] — Gnosis is the concrete implementation
- [[siva-cotipalli]] — the operator who applied the pattern

## Links

- [[gnosis-hackathon]] — the project that implements the pattern
- [[siva-cotipalli]] — the wiki's owner
- [[claude]] — the LLM maintainer
- [[ai-native-services]] — the business-model lens Gnosis applies to ProGrowth's own operation
