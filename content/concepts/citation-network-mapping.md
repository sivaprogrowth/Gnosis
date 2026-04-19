---
type: concept
created: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
sources:
  - geo-how-to-dominate-ai-search
  - new-front-door-to-the-internet
tags:
  - geo
  - ai-search
  - competitive-intelligence
  - ai-visibility
aliases:
  - citation-mapping
  - ai-source-auditing
  - engine-citation-network
  - geo-diagnostic
---

# Citation Network Mapping

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#22c55e"></span>concept</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>13</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>8</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>2</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">geo</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ai-search</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">competitive-intelligence</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ai-visibility</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


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

<!-- GNOSIS:WIDGET:BOTTOM:START -->
## Gnosis context

### Related by shared tags

<svg width="520" height="266" viewBox="0 0 520 266" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Bar chart"><g><text x="0" y="22" font-size=".85rem" fill="currentColor">Earned-Media Bias (in AI Search)</text><rect x="220" y="5" width="240.0" height="26" rx="4" fill="#22c55e"><title>Earned-Media Bias (in AI Search): 3</title></rect><text x="466" y="22" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="54" font-size=".85rem" fill="currentColor">Generative Engine Optimization (GEO)</text><rect x="220" y="37" width="240.0" height="26" rx="4" fill="#22c55e"><title>Generative Engine Optimization (GEO): 3</title></rect><text x="466" y="54" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="86" font-size=".85rem" fill="currentColor">Semrush AI Visibility Index (AIVI)</text><rect x="220" y="69" width="240.0" height="26" rx="4" fill="#f97316"><title>Semrush AI Visibility Index (AIVI): 3</title></rect><text x="466" y="86" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="118" font-size=".85rem" fill="currentColor">Generative Engine Optimization: How to Dominate AI Search</text><rect x="220" y="101" width="240.0" height="26" rx="4" fill="#6366f1"><title>Generative Engine Optimization: How to Dominate AI Search: 3</title></rect><text x="466" y="118" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="150" font-size=".85rem" fill="currentColor">New Front Door to the Internet: Winning in the Age of AI Search</text><rect x="220" y="133" width="240.0" height="26" rx="4" fill="#6366f1"><title>New Front Door to the Internet: Winning in the Age of AI Search: 3</title></rect><text x="466" y="150" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="182" font-size=".85rem" fill="currentColor">Semrush AI Visibility Index (snapshot, April 2026)</text><rect x="220" y="165" width="240.0" height="26" rx="4" fill="#6366f1"><title>Semrush AI Visibility Index (snapshot, April 2026): 3</title></rect><text x="466" y="182" font-size=".85rem" fill="currentColor" opacity=".75">3</text></g><g><text x="0" y="214" font-size=".85rem" fill="currentColor">AI Search Decision Journey</text><rect x="220" y="197" width="160.0" height="26" rx="4" fill="#22c55e"><title>AI Search Decision Journey: 2</title></rect><text x="386" y="214" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="246" font-size=".85rem" fill="currentColor">The API-able Brand</text><rect x="220" y="229" width="160.0" height="26" rx="4" fill="#22c55e"><title>The API-able Brand: 2</title></rect><text x="386" y="246" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g></svg>

*X-axis: number of tags this page shares with each related page.*
<!-- GNOSIS:WIDGET:BOTTOM:END -->

## Links

- [[generative-engine-optimization]] — the operating system this pillar belongs to
- [[brand-earned-social-taxonomy]] — the classification applied during mapping
- [[earned-media-bias]] — the pattern mapping operationalizes
- [[brand-strength-ai-visibility-gap]] — the diagnostic output that quantifies a client's gap
- [[semrush-ai-visibility-index]] — reference/competitor tool to benchmark against
- [[chatgpt]], [[claude]], [[perplexity]], [[gemini]], [[google-search]], [[google-ai-overview]] — per-engine maps are needed for each
