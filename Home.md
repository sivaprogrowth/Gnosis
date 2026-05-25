---
type: home
tags: [home, dashboard]
---

# Gnosis — Home

Personal LLM wiki. This page uses **live Bases views** (Obsidian core feature) — embedded `.base` files in `bases/` rebuild every time you open them from the current state of the vault.

> If you see raw `![[bases/...]]` syntax instead of rendered tables, you're viewing the file outside Obsidian or the Bases core plugin is disabled. Open in Obsidian with the Bases core plugin enabled.

## Inbox status

Articles clipped via the Obsidian Web Clipper awaiting ingest. Default drain cadence: **Sunday** (part of the Weekly Review). Mid-week backstop: **≥ 5 items** triggers an earlier drain. See `CLAUDE.md` §4.3.

![[bases/inbox.base]]

To drain: open a Claude session in `~/Projects/gnosis/` and say **"drain the article inbox"**.

## Quick stats

Total pages by type:

![[bases/pages-by-type.base]]

## People in Siva's network

![[bases/people.base]]

## Companies and institutions

![[bases/companies.base]]

## Sources, most recently ingested first

![[bases/sources.base]]

## Concepts, by inbound-link density

![[bases/concepts.base]]

## AI engines and search products

![[bases/entities.base]]

## Recently updated across the whole vault

![[bases/recently-updated.base]]

## Orphans — pages with no inbound links

Candidates for better cross-referencing.

![[bases/orphans.base]]

## Siva's orbit — anything tagged siva / progrowth / founder

![[bases/sivas-orbit.base]]

## Companies grouped by primary tag

![[bases/companies-by-tag.base]]

## India / Telangana cluster — cross-type

Reveals who's geographically / institutionally clustered.

![[bases/india-cluster.base]]

## Tag-cloud-ish: tags ranked by usage

![[bases/tag-cloud.base]]

## Navigation

- [[wiki/index|wiki/index.md]] — the canonical index the LLM maintains (plain markdown, no Dataview)
- [[log|log.md]] — chronological activity log
- [[CLAUDE|CLAUDE.md]] — the schema the LLM follows
- `raw/` — immutable source documents (PDFs, articles, notes) — browse in the Explorer
