---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - geo-how-to-dominate-ai-search
tags: [geo, ai-search, taxonomy, progrowth]
aliases: [media-type-classification, source-type-taxonomy, bes-taxonomy]
---

# Brand / Earned / Social Taxonomy

Three-tier classification scheme used throughout [[geo-how-to-dominate-ai-search]] to categorize every cited domain surfaced by a search engine. The taxonomy is the measurement lens that makes [[earned-media-bias]] visible.

## The three categories

- **Brand** — official manufacturer or retailer websites that directly provide products or services. Examples: `apple.com`, `toyota.com`, `chase.com`, `wellsfargo.com`, `ford.com`, `bankofamerica.com`.
- **Earned** — independent, third-party editorial, review, or comparison sites with no direct commercial relationship to the product. Examples: `nerdwallet.com`, `forbes.com`, `techradar.com`, `tomsguide.com`, `consumerreports.org`, `caranddriver.com`, `bankrate.com`, `rtings.com`, `wikipedia.org`.
- **Social** — community-driven or user-generated platforms where content comes from end users rather than institutional editorial processes. Examples: `reddit.com`, `quora.com`, `youtube.com`, `facebook.com`.

## How classification was done in the study

- Domains extracted from every citation.
- A rule-based list of known social platforms handled obvious cases.
- A GPT-4o classification prompt handled ambiguous domains, labeling each as Brand / Social / Earned (or Unknown).
- De-duplication within each answer before aggregation.

## Study caveat (honest limitation)

The taxonomy is explicitly acknowledged as a **constructed framework**, not objective truth:

> *"The line between an 'Earned' media outlet and a 'Brand' blog can sometimes be blurry."* — §7

Alternative taxonomies (News Media / Professional Review / User Review / E-commerce / Corporate) would yield different percentages. The paper argues the **relative trends between engines are more robust than the absolute figures**.

## Why this taxonomy matters for GEO

- Operational clarity: teams can classify their marketing surface area into these three buckets and measure their mix.
- Budget allocation: the three categories correspond to three distinct investment pipelines (owned content, PR/earned media, community marketing).
- Diagnostic: if a brand has 80% Brand-owned content and 10% Earned media coverage, [[earned-media-bias]] in AI engines predicts catastrophic AI search visibility regardless of content quality.

## ProGrowth relevance

Useful as the default source-type framework for `overviews.progrowth.services` tooling and for client reporting. Prescribes a concrete three-bucket investment model for GEO strategy presentations.

## Sources citing this page

- [[geo-how-to-dominate-ai-search]] — the taxonomy is used throughout the paper's methodology

## Links

- [[earned-media-bias]] — the finding that uses this taxonomy
- [[generative-engine-optimization]] — the strategic framework built on these categories
- [[big-brand-bias]] — a distinct bias detected via this same taxonomy
