---
type: home
tags: [home, dashboard]
---

# Gnosis — Home

Personal LLM wiki. Every table below is a **live Bases view** (Obsidian core feature) embedded from `bases/*.base`; each rebuilds from the current vault when you open this page.

> If you see raw `![[bases/...]]` syntax instead of tables, you are outside Obsidian or the Bases core plugin is off. The public Quartz site never shows these views.

## Inbox

Two capture paths feed the wiki. **Clippings/** comes from the Obsidian Web Clipper and is drained by the server cron at 05:00 and 15:00 UTC. **raw/articles/** comes from `bash scripts/acquire.sh <url>` (Defuddle → Knap) or hand-saved files and is drained by hand in a Claude session with **"drain the article inbox"** (`CLAUDE.md` §4.3, Sundays or at ≥ 5 items).

![[bases/inbox.base#Waiting — clippings]]

![[bases/inbox.base#Waiting — raw/articles]]

Last fifteen clippings the server ingested:

![[bases/inbox.base#Recently ingested]]

## This week

![[bases/recently-updated.base#Touched this week]]

Latest §4.7 synthesis briefs:

![[bases/weekly-briefs.base]]

## Wiki health

The Bases half of the §4.5 lint. Undefined `[[links]]` and index drift still need `python3 scripts/lint-wiki.py`.

![[bases/lint.base#Stubs — ≤1 source and <120 words]]

![[bases/lint.base#Stale — well-cited but untouched 180+ days]]

![[bases/lint.base#Sources missing author or date]]

## Quick stats

Pages grouped by type, with estimated word totals:

![[bases/pages-by-type.base]]

## Sources, most recently published first

![[bases/sources.base#Sources]]

## Concepts

Hand-written concepts ranked by how many sources cite them. The 3,000+ one-idea newsletter pages have their own section below.

![[bases/concepts.base#Most cited]]

## People in Siva's network

![[bases/people.base#People]]

## Companies and institutions

![[bases/companies.base#Companies]]

## AI engines and search products

![[bases/entities.base]]

## Newsletter ideas (Farnam Street, James Clear)

![[bases/newsletter-ideas.base#Newest first]]

## Siva's orbit — anything tagged siva / progrowth / founder

![[bases/sivas-orbit.base]]

## India / Telangana cluster — cross-type

![[bases/india-cluster.base]]

## Companies grouped by tag

![[bases/companies-by-tag.base]]

## Tags ranked by usage

![[bases/tag-cloud.base]]

## Orphans — pages with no inbound links

Candidates for cross-referencing. This view walks every backlink in the vault, so it is the slowest table on the page and sits last on purpose.

![[bases/orphans.base]]

## Navigation

- [[wiki/index|wiki/index.md]] — the canonical index the LLM maintains (plain markdown, no Dataview)
- [[log|log.md]] — chronological activity log
- [[CLAUDE|CLAUDE.md]] — the schema the LLM follows
- `bases/` — every view on this page, one file each; open a `.base` directly to switch views or edit filters
- `raw/` — immutable source documents (PDFs, articles, notes) — browse in the Explorer
