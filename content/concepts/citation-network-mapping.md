---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - geo-how-to-dominate-ai-search
  - new-front-door-to-the-internet
tags: [geo, ai-search, competitive-intelligence, ai-visibility]
aliases: [citation-mapping, ai-source-auditing, engine-citation-network, geo-diagnostic]
---

# Citation Network Mapping

A continuous competitive-intelligence practice in which a brand audits which domains each AI search engine actually cites for queries in its core vertical — building a per-engine map of "the citation network" that answers get drawn from. The first of five pillars in the [[generative-engine-optimization]] operating system.

## Why it's necessary

Per [[geo-how-to-dominate-ai-search]] §6:

> *"The low domain overlap and differing source biases mean that a strategy that works on [[perplexity]] may fail on [[claude]]. Brands cannot afford to guess. They need a service that continuously audits, for their core topics, identifying exactly which sources each AI engine (Claude, GPT, Perplexity, Gemini) privileges. This intelligence forms the absolute foundation of strategy, answering the critical questions of which sources are most important and what content to create to reverse-engineer the evidence base of the engines themselves."*

Key empirical facts that make the practice non-optional:

- Cross-engine domain overlap in shopping queries is typically only 15–40%.
- Different engines in the same vertical draw from different "core" sets of authoritative sites.
- The citation network is **dynamic** — engines continually retrain, reweight, and adjust sourcing methodologies.

## Methodology (outline from the paper)

For each target vertical:

1. Define a representative query set — 10–100 ranking-style and consideration queries typical of your buyer.
2. Execute each query in parallel against Claude, ChatGPT, Perplexity, Gemini, and Google as a control.
3. Extract cited domains from answers + citation lists.
4. Classify each domain per [[brand-earned-social-taxonomy]] (Brand/Earned/Social).
5. Compute per-engine frequency distributions.
6. Identify the **core set** — domains cited frequently across multiple engines — and the **engine-exclusive set** — domains only one engine trusts.
7. Track distribution shifts over time (weekly/monthly snapshots).

## What the mapping reveals

- **Core set per vertical** — the handful of sources every GEO campaign must win coverage in. Example: in consumer electronics, TechRadar / Tom's Guide / RTINGS show up across Claude, GPT, and Perplexity.
- **Engine-exclusive domains** — sources that move the needle on a specific engine but are invisible on others.
- **Gaps** — categories or topics where your brand is not cited at all.
- **Competitor intelligence** — which earned-media placements are *their* wins, and which are gaps you can exploit.

## Operational cadence

- Baseline audit: comprehensive initial map across all engines and core queries.
- Weekly: monitor ranking for top-priority "shortlist" queries across engines.
- Monthly: refresh domain frequency distributions; flag shifts.
- Quarterly: deep re-audit; re-prioritize earned-media pipeline.

## Market context: the readiness gap

Per [[new-front-door-to-the-internet]] (McKinsey CMO survey, Sep 2025): **only 16% of Fortune 500 consumer brands systematically track AI search performance**. This is the readiness gap citation-network-mapping solves — and a key reason challenger brands can overperform incumbents on AI visibility (see [[brand-strength-ai-visibility-gap]]).

McKinsey's 4-move GEO framework begins with "undertake a robust diagnostic" — which is this concept, renamed for executive audiences.

## Productization: existing tools

[[semrush-ai-visibility-index]] is the clearest public example of citation-network-mapping productized — a free interactive dashboard ranking brands across AI search by Share of Voice, Brand Diversity, and Source Diversity. Its existence signals three things:

1. The practice is real and commercially viable (Semrush chose to invest).
2. The TAM is large enough for a well-resourced incumbent to build toward.
3. Current tools have coverage gaps (AIVI covers only ChatGPT + Google AI Mode) — opening differentiation windows for purpose-built alternatives.

For ProGrowth's `overviews.progrowth.services`, this is both a reference methodology and a competitor to differentiate against.

## Tooling implications

This mapping is tractable via APIs (Claude via Anthropic, ChatGPT via OpenAI with web search, Perplexity via its API, Gemini via Google AI Studio, Google via Custom Search). The paper's own methodology in §4.1 is essentially a recipe for a citation-mapping tool.

## Sources citing this page

- [[geo-how-to-dominate-ai-search]] — §6 "The Imperative for Principled GEO Methodologies and Services", pillar 1
- [[new-front-door-to-the-internet]] — McKinsey's 4-move framework, move #1 "robust diagnostic"
- [[semrush-ai-visibility-index]] — a public tool that productizes this practice

## Links

- [[generative-engine-optimization]] — the operating system this pillar belongs to
- [[brand-earned-social-taxonomy]] — the classification applied during mapping
- [[earned-media-bias]] — the pattern mapping operationalizes
- [[brand-strength-ai-visibility-gap]] — the diagnostic output that quantifies a client's gap
- [[semrush-ai-visibility-index]] — reference/competitor tool to benchmark against
- [[chatgpt]], [[claude]], [[perplexity]], [[gemini]], [[google-search]], [[google-ai-overview]] — per-engine maps are needed for each
