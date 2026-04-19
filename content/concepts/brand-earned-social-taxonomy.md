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
  - taxonomy
aliases:
  - media-type-classification
  - source-type-taxonomy
  - bes-taxonomy
---

# Brand / Earned / Social Taxonomy

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#22c55e"></span>concept</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>6</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>6</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>2</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">geo</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ai-search</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">taxonomy</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


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

<!-- GNOSIS:WIDGET:BOTTOM:START -->
## Gnosis context

### Related by shared tags

<svg width="520" height="266" viewBox="0 0 520 266" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Bar chart"><g><text x="0" y="22" font-size=".85rem" fill="currentColor">AI Search Decision Journey</text><rect x="220" y="5" width="240.0" height="26" rx="4" fill="#22c55e"><title>AI Search Decision Journey: 2</title></rect><text x="466" y="22" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="54" font-size=".85rem" fill="currentColor">The API-able Brand</text><rect x="220" y="37" width="240.0" height="26" rx="4" fill="#22c55e"><title>The API-able Brand: 2</title></rect><text x="466" y="54" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="86" font-size=".85rem" fill="currentColor">Big Brand Bias</text><rect x="220" y="69" width="240.0" height="26" rx="4" fill="#22c55e"><title>Big Brand Bias: 2</title></rect><text x="466" y="86" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="118" font-size=".85rem" fill="currentColor">Brand Strength ≠ AI Visibility Gap</text><rect x="220" y="101" width="240.0" height="26" rx="4" fill="#22c55e"><title>Brand Strength ≠ AI Visibility Gap: 2</title></rect><text x="466" y="118" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="150" font-size=".85rem" fill="currentColor">Citation Network Mapping</text><rect x="220" y="133" width="240.0" height="26" rx="4" fill="#22c55e"><title>Citation Network Mapping: 2</title></rect><text x="466" y="150" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="182" font-size=".85rem" fill="currentColor">Earned-Media Bias (in AI Search)</text><rect x="220" y="165" width="240.0" height="26" rx="4" fill="#22c55e"><title>Earned-Media Bias (in AI Search): 2</title></rect><text x="466" y="182" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="214" font-size=".85rem" fill="currentColor">Generative Engine Optimization (GEO)</text><rect x="220" y="197" width="240.0" height="26" rx="4" fill="#22c55e"><title>Generative Engine Optimization (GEO): 2</title></rect><text x="466" y="214" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="246" font-size=".85rem" fill="currentColor">Justification Attributes</text><rect x="220" y="229" width="240.0" height="26" rx="4" fill="#22c55e"><title>Justification Attributes: 2</title></rect><text x="466" y="246" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g></svg>

*X-axis: number of tags this page shares with each related page.*
<!-- GNOSIS:WIDGET:BOTTOM:END -->

## Links

- [[earned-media-bias]] — the finding that uses this taxonomy
- [[generative-engine-optimization]] — the strategic framework built on these categories
- [[big-brand-bias]] — a distinct bias detected via this same taxonomy
- [[google-ai-overview]] — engine where McKinsey's 6-category taxonomy is most actionable
