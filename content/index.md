---
title: Gnosis
---

# Gnosis — A Personal LLM Wiki

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#94a3b8"></span>other</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>29</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>0</strong><span style="opacity:.7">backlinks</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->






A personal knowledge base where an LLM acts as a disciplined wiki maintainer. Drop in sources — articles, PDFs, notes — and the LLM reads them, summarizes, cross-references, and integrates them into a living wiki. Knowledge **compounds** on every source instead of being re-derived on every query.

> *"The tedious part of a knowledge base is not the reading or thinking — it's the bookkeeping. Humans abandon wikis because maintenance grows faster than value. LLMs don't."*

➡ **[Open the Dashboard](dashboard)** — live tables and charts computed from page frontmatter on every build.

## What's in this wiki

Three AI-search sources ingested so far, producing 19 cross-linked pages:

- **Sources** — three-layer summary of each raw document.
- **Entities** — AI engines (ChatGPT, Claude, Perplexity, Gemini, Google AI Overview), tools, organizations.
- **Concepts** — the frameworks, findings, and ideas that the sources surface. Where the synthesis lives.

Click the **graph** in the right sidebar to see how pages connect.

## Try the chat

Ask the wiki directly. The assistant answers using only what's in these pages, and cites every claim back to a specific page you can click.

**Good demo questions to try:**

- *"What's the difference between ChatGPT and Claude in AI search behavior?"*
- *"Why doesn't my brand-owned content show up in AI search?"*
- *"Show me the contradiction between Chen et al. and McKinsey on big brand bias."*
- *"Give me a 5-bullet summary of the Generative Engine Optimization framework."*

Open the chat widget (bottom-right of any page) to begin.

## Browse the wiki

### Sources
- [[sources/geo-how-to-dominate-ai-search|GEO: How to Dominate AI Search]] — Chen et al. (U of Toronto, Sep 2025). The foundational academic paper.
- [[sources/new-front-door-to-the-internet|New Front Door to the Internet]] — McKinsey (Oct 2025). Business-oriented companion with the $750B projection.
- [[sources/semrush-ai-visibility-index|Semrush AI Visibility Index]] — interactive tool snapshot (April 2026).

### Key concepts
- [[concepts/generative-engine-optimization|Generative Engine Optimization (GEO)]] — the central framework.
- [[concepts/earned-media-bias|Earned-Media Bias]] — the core empirical finding.
- [[concepts/big-brand-bias|Big Brand Bias]] — with a reconciled contradiction inline.
- [[concepts/justification-attributes|Justification Attributes]] — content tactics.
- [[concepts/api-able-brand|The API-able Brand]] — technical tactics.

### Engines
- [[entities/chatgpt|ChatGPT]], [[entities/claude|Claude]], [[entities/perplexity|Perplexity]], [[entities/gemini|Gemini]], [[entities/google-ai-overview|Google AI Overview]], [[entities/google-search|Google Search]] — all with engine-specific behavior from the sources.

### Siva's network (LinkedIn-ingested, Apr 2026)

- [[people/siva-cotipalli|Siva Cotipalli]] — owner of this wiki; Founder of ProGrowth.
- [[people/phani-sama|Phani Sama]] — founder of redBus; Siva's contact. Shared [[companies/bits-pilani|BITS Pilani]] + [[companies/chevening-scholarship|Chevening]] + [[companies/government-of-telangana|Telangana govt]] overlap.
- Companies: [[companies/redbus|redBus]], [[companies/t-works|T-Works]], [[companies/kakatiya-sandbox|Kakatiya Sandbox]], [[companies/deshpande-skilling|Deshpande Skilling]], [[companies/cityfalcon|CityFALCON]], [[companies/reverie-language-technologies|Reverie]], [[companies/ntwist|NTWIST]], [[companies/dhanax|dhanaX]], [[companies/yogyabano|YogyaBano]], and more under `companies/` in the sidebar.

## How this works

- Sources live at `raw/` in the canonical wiki (not published here).
- Pages at `wiki/` are written and maintained entirely by the LLM, following the schema in `CLAUDE.md`.
- Every claim on every page cites a specific source via `[[page-slug]]` wiki-links.
- The chat below uses the same wiki content as its context — same answers a human would find by browsing.

Built with [Quartz](https://quartz.jzhao.xyz). Powered by Claude.
