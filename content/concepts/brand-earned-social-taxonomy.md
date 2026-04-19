---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - geo-how-to-dominate-ai-search
  - new-front-door-to-the-internet
tags: [geo, ai-search, taxonomy]
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

## Contrast: McKinsey's more granular taxonomy

[[new-front-door-to-the-internet]] uses a different, **six-category taxonomy** when analyzing Google AI Overview source mix:

1. **Affiliate blogs** (dominant in CPG/e-commerce AIO output)
2. **User-generated content** (dominant in telecommunications)
3. **News and media**
4. **Brand and retailer**
5. **Academic and market research**
6. **Other** (Google, Wikipedia)

Key reconciliation challenge: **"affiliate blogs"** does not cleanly map to Chen et al.'s Brand/Earned/Social scheme. Affiliates are arguably:

- **Brand-adjacent** (monetized via commissions from brands they review → conflict of interest).
- **Earned-functional** (operate editorially; AI cites them like review sites).

Both taxonomies give the same headline signal — brand-owned content is under-represented — but the finer-grained McKinsey scheme is more actionable for tactical decisions (e.g., "where should PR budget go? affiliate-publisher outreach is a distinct category from mainstream news coverage").

**Practical recommendation**: use Chen et al.'s 3-bucket taxonomy for executive communication and cross-engine comparison; use McKinsey's 6-bucket taxonomy for tactical content-strategy budget allocation.

## Why this taxonomy matters for GEO

- Operational clarity: teams can classify their marketing surface area into these three buckets and measure their mix.
- Budget allocation: the three categories correspond to three distinct investment pipelines (owned content, PR/earned media, community marketing).
- Diagnostic: if a brand has 80% Brand-owned content and 10% Earned media coverage, [[earned-media-bias]] in AI engines predicts catastrophic AI search visibility regardless of content quality.

## Sources citing this page

- [[geo-how-to-dominate-ai-search]] — introduces the 3-tier Brand/Earned/Social taxonomy
- [[new-front-door-to-the-internet]] — uses a 6-category alternative (affiliate/UGC/news/brand/academic/other) that complements the 3-tier scheme

## Links

- [[earned-media-bias]] — the finding that uses this taxonomy
- [[generative-engine-optimization]] — the strategic framework built on these categories
- [[big-brand-bias]] — a distinct bias detected via this same taxonomy
- [[google-ai-overview]] — engine where McKinsey's 6-category taxonomy is most actionable
