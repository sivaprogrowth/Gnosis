---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - geo-how-to-dominate-ai-search
tags: [geo, ai-search, progrowth, seo-strategy, ai-visibility]
aliases: [earned-bias, ai-earned-preference, third-party-authority-bias]
---

# Earned-Media Bias (in AI Search)

The empirical pattern that AI search engines systematically and overwhelmingly favor **Earned** media (third-party editorial, review, and independent authority sources) over **Brand-owned** and **Social** (community/UGC) content — in stark contrast to [[google-search]]'s balanced mix. The single most consequential finding in [[geo-how-to-dominate-ai-search]].

## The empirical pattern

Share of citations classified as Earned (from [[brand-earned-social-taxonomy]]):

| Engine | Well-known brands | Niche brands |
|---|---|---|
| [[chatgpt]] | 93.5% | 95.1% |
| [[claude]] | 87.3% | 86.3% |
| [[perplexity]] | 67.4% | 74.3% |
| [[gemini]] | 63.4% | 66.4% |
| [[google-search]] (baseline) | balanced mix | balanced mix |

The pattern holds across verticals (consumer electronics, automotive, software, financial services, local services, banking), regions (US, Canada), and languages (English, Chinese, Japanese, German, French, Spanish). Paraphrasing does not disrupt it. Language translation does not disrupt it.

## Why this happens (inferred, not proven)

The paper is empirical, not mechanistic. Plausible drivers:

- AI training corpora and RAG retrieval pipelines over-index on high-PageRank editorial domains (authority signals).
- Safety/quality filters in LLMs likely deprioritize user-generated content to avoid misinformation.
- [[e-e-a-t]]-style signals are easier to verify for editorial outlets than for brand-owned claims.
- Ranking-style prompts ("best X for Y") naturally pull toward "review-site" content as a genre.

## Strategic implication

A brand must **shift focus from creating owned content to systematically earning third-party validation**. Investments rank in roughly this order of leverage:

1. Secured features/reviews/mentions in top-tier authoritative publications in the target vertical.
2. Expert collaborations and credible institutional partnerships that generate citations.
3. Backlinks from high-authority earned domains (not merely for Google ranking, but as direct inputs to AI's trust model).
4. For [[perplexity]] specifically: high-quality YouTube reviews, retail platform presence, community authority.

## Engine-level nuance

- [[chatgpt]] and [[claude]]: extreme earned bias — owned content contributes minimally.
- [[perplexity]]: still earned-dominant, but with meaningful Social (17–24%) and slightly more Brand — video reviews and retail pages work here.
- [[gemini]]: weakest version of the bias — brand-owned depth does surface.

## ProGrowth relevance

This is the empirical foundation for repositioning ProGrowth's SEO offering into a GEO offering. For clients currently over-investing in owned content and under-investing in PR/earned media, the data is a direct ROI argument for reallocation. Also directly informs the measurement model for `overviews.progrowth.services`.

## Sources citing this page

- [[geo-how-to-dominate-ai-search]] — establishes the empirical pattern

## Links

- [[generative-engine-optimization]] — the strategic response to this finding
- [[brand-earned-social-taxonomy]] — the classification producing these percentages
- [[e-e-a-t]] — the trust framework earned media is proxy for
- [[big-brand-bias]] — a related but distinct AI search bias
- [[chatgpt]], [[claude]], [[perplexity]], [[gemini]], [[google-search]] — per-engine severity
