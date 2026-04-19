---
type: query
created: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
sources:
  - raw/pdfs/geo-how-to-dominate-ai-search.pdf
  - raw/pdfs/new-front-door-to-the-internet.pdf
tags:
  - query
  - ai-search
  - big-brand-bias
  - synthesis
  - contradiction
---

# How do Chen et al. and McKinsey disagree on "Big Brand Bias," and how is the contradiction reconciled?

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#94a3b8"></span>query</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>12</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>0</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>2</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">query</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ai-search</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">big-brand-bias</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">synthesis</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">contradiction</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


## The question

Two recent AI-search sources make claims about how AI engines treat large brands relative to small ones. Read literally, they appear to contradict. This page files the reconciliation as a standalone synthesis so the nuance isn't lost the next time the question comes up.

## The two findings

**[[geo-how-to-dominate-ai-search]] — Chen et al. (University of Toronto, Sep 2025)** ran a cola-vertical experiment: 50 unbranded prompts ("most popular cola brand", "best-selling soda worldwide") across [[chatgpt]] and [[perplexity]]. Major brands captured **62.2% of mentions combined**; niche brands, only 9.0%. Coca-Cola and Pepsi dominated. The paper formalizes this as **[[big-brand-bias]]** — AI defaults to market leaders on unbranded category queries.

**[[new-front-door-to-the-internet]] — McKinsey (Oct 2025)** audited 5 anonymized sportswear brands across AI engines and found that AI share-of-voice **does not track market share**: three brands were under-represented in AI by 30–60% vs. their market position; two were over-represented by 40–60%. Captured on [[brand-strength-ai-visibility-gap]] — **market leadership does not predict AI visibility at all**.

Read surface-level, these are in direct tension. Chen et al. says the AI leans toward leaders; McKinsey says leadership doesn't predict visibility.

## The reconciliation: different prompt distributions

The two findings measure different things:

- **Chen et al. measured *unbranded ranking prompts***. Under that specific prompt condition, the AI has no constraining context and falls back on **priors**, which favor major brands (they appear more frequently in training data and in the citation-eligible earned-media sources per [[earned-media-bias]]).
- **McKinsey measured *aggregate AI answers across a richer prompt distribution*** — including specific-use-case queries, feature comparisons, niche considerations, and buying-journey stages. Across that wider surface, the big-brand-defaulting effect washes out, and the determinants shift to **which brand has the best earned-media authority on the specific query intent**.

In short: [[big-brand-bias]] is real but **scope-limited to unbranded, ranking-style queries**. Outside that scope, brand strength stops predicting visibility.

## Why the nuance matters — the opportunity surface

The gap between the two findings isn't noise — it's the **challenger strategy surface**:

1. Query types where [[big-brand-bias]] is strong (unbranded category rankings) are hard to crack, period — challenger brands should not waste effort here.
2. Query types where the [[brand-strength-ai-visibility-gap]] is strong (use-case-specific, feature-led, niche-audience queries) are where the AI's defaulting weakens, letting earned-media authority take over. **This is where challengers win.**
3. The overlap between this finding and the [[brand-earned-social-taxonomy]] classification from Chen et al. is the specific advice: over-index on earned-media authority that covers *use-case-specific* queries, not *category-ranking* queries.

## Practical implications

- **For [[progrowth]]'s mid-market B2B clients** (per the niche-brand strategy on [[big-brand-bias]]): stop competing on "best fractional CMO" (a category-ranking prompt that defaults to incumbents like [[marketri]]) and instead dominate "best fractional CMO for a $10M SaaS rebranding under 90 days" (a use-case prompt where earned-media authority wins).
- **For challenger brands in general**: the McKinsey finding is the *good news* — AI doesn't enforce market-leader defaults across the full prompt distribution. The Chen et al. finding tells you which specific prompt shapes to avoid.
- **For [[ai-overview-tool]] design**: any brand-visibility tracker should segment query types — unbranded ranking vs. use-case-specific — because the competitive dynamics are fundamentally different.

## Status

Both parent pages ([[big-brand-bias]] and [[brand-strength-ai-visibility-gap]]) carry the reconciliation inline in their `## Contradictions` / `## Related finding` sections. This query page exists as the **canonical one-stop synthesis** for anyone asking the question directly.

## Links

- [[big-brand-bias]] — the Chen et al. finding
- [[brand-strength-ai-visibility-gap]] — the McKinsey counter-finding
- [[earned-media-bias]] — the mechanism behind both effects
- [[brand-earned-social-taxonomy]] — the classification system Chen et al. use
- [[generative-engine-optimization]] — strategic response framework
- [[geo-how-to-dominate-ai-search]] — primary source for Chen et al.
- [[new-front-door-to-the-internet]] — primary source for McKinsey
