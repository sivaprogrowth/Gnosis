---
type: project
created: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
sources:
  - semrush-ai-visibility-index
tags:
  - project
  - demo
  - active
status: Live (April 2026 hackathon POC)
url: 'https://gnosis-site.vercel.app'
repos:
  - 'https://github.com/sivaprogrowth/gnosis-site'
  - 'https://github.com/abhinavagarwal31/Gnosis'
---

# Gnosis (Hackathon POC)

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#eab308"></span>project</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>9</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>2</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>1</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">project</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">demo</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">active</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


The meta-entry: this wiki itself, along with its public demo surface at `gnosis-site.vercel.app`, built as a hackathon demonstration of the **LLM-maintained personal wiki** pattern applied to a fractional-marketing operator's knowledge base.

## What it is

- A markdown-first knowledge base where an LLM ([[claude]] via Claude Code) acts as the wiki maintainer.
- A public browsable wiki (via [Quartz](https://quartz.jzhao.xyz)) showing the current state of the knowledge.
- A chat interface (`/api/ask`, streaming SSE) that bundles the wiki into a cached prompt and answers questions with inline citations.

## What it demonstrates

1. **Compounding beats retrieval.** Three sources have been ingested ([[geo-how-to-dominate-ai-search]], [[new-front-door-to-the-internet]], [[semrush-ai-visibility-index]]). On ingest #2, existing concept pages were *updated* rather than duplicated — and a contradiction between Chen et al. and McKinsey on [[big-brand-bias]] was flagged and reconciled inline.
2. **Cross-domain synthesis.** The wiki spans concepts, engine-specific entities, sources, people, companies, projects, and inspiration — the agent can pull across categories to answer questions that require combining them.
3. **Agent-native structure.** [[claude]] finds what it needs via `index.md` → drill-in. No vector DB, no embedding pipeline. The filesystem IS the retrieval layer.
4. **Generative use cases beyond Q&A.** Per [[farzapedia-pattern]], the wiki can be used to generate content (LinkedIn posts, cold emails, proposals) in [[siva-cotipalli|Siva's]] voice.

## Architecture

- Canonical wiki: `~/Projects/gnosis/` — the source of truth.
- Public projection: `~/Projects/gnosis-site/` — Quartz site + `/api/ask` serverless function.
- Build-time sync: `scripts/sync-wiki.sh` copies `wiki/*` into `content/`, strips any `## ... ProGrowth ...` sections so tactical internal notes don't leak.
- Chat context: Claude [[claude]] Sonnet 4.6 with prompt caching on the full wiki bundle (~40KB → 10% cost after first query).
- Deploy: Vercel, `gnosis-site.vercel.app` production.

## Built on

- [[claude]] Sonnet 4.6 (chat API)
- Quartz v4.5.2 (Obsidian-style static-site generator)
- Vercel (hosting + serverless functions)
- [[farzapedia-pattern]] (the conceptual inspiration)

## Sources citing this page

- [[siva-cotipalli]] — founder, builder
- [[progrowth]] — the parent company

<!-- GNOSIS:WIDGET:BOTTOM:START -->
## Gnosis context

### Pages referencing this one

- [ProGrowth](../companies/progrowth) (company)
- [Siva Cotipalli](../people/siva-cotipalli) (person)
<!-- GNOSIS:WIDGET:BOTTOM:END -->

## Links

- [[siva-cotipalli]] — the operator behind it
- [[progrowth]] — the company it represents
- [[farzapedia-pattern]] — the inspiration
- [[ai-overview-tool]] — sibling project (both productize different slices)
- [[claude]] — the agent that maintains it
