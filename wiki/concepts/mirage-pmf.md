---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - raw/articles/2026-04-19-The AI-Native Services Playbook.md
tags: [ains, product-market-fit, failure-mode, business-model, progrowth, diagnostic]
aliases: [mirage-product-market-fit, fake-pmf]
---

# Mirage PMF

> The illusion of product-market fit created by revenue growth that's powered by human labor rather than AI leverage.

A term coined in Emergence Capital's [[ai-native-services-playbook|Spring 2026 AI-Native Services Playbook]] to name the single most dangerous failure mode for [[ai-native-services|AINS]] companies: strong revenue growth and logo retention that looks like SaaS-grade PMF but is actually a well-run services firm financed with venture capital.

## The trap

In SaaS, revenue growth and strong net dollar retention are reliable PMF signals. In AINS, they are not. Both can be produced by **adding humans faster than customers** rather than by AI doing meaningful work. The company looks like a rocket ship from the outside; under the hood it's a traditional services firm that will hit the typical services margin ceiling as it scales.

Real AINS PMF requires proving the business can **scale non-linearly relative to its costs** — AI driving measurable improvements in cost, quality, or speed, ideally all three. Gross margin should expand as the business grows, not stay flat.

## Five warning signs

From the playbook — any one of these is a signal; two or more is a diagnosis:

1. **Gross margin is flat or declining** even as revenue grows. If AI were doing more of the work, margins should be expanding. Watch for founders offloading labor costs from COGS to operating expenses to artificially lift gross margin — inference costs, model API spend, and human-in-the-loop labor all belong in COGS.
2. **Revenue per Employee (ARR/FTE) isn't improving.** This is the simplest universal test of whether AI is pulling its weight. For sharper analysis, isolate service-relevant FTEs.
3. **Delivery is still human-heavy.** Team growing linearly with customer base → scaling like a traditional services firm, not an AINS.
4. **Bespoke work is expanding.** Each new customer requires significant custom engineering → not productizing.
5. **No [[north-star-product-metric]] trending in the right direction.** Every AINS company needs a single number that captures how much of the work AI is actually doing. If you can't name one or it's flat, you have Mirage PMF.

## Honest COGS as the diagnostic anchor

Mirage PMF is frequently hidden by **accounting choices**, not just operational reality. The playbook specifically calls out:

- Inference costs, model API spend → belongs in COGS, not opex
- Human-in-the-loop labor → belongs in COGS
- "Customer success" or "account management" headcount that is actually doing delivery work → belongs in COGS

Any AINS company reporting 70%+ gross margin while carrying materially human delivery operations is likely mis-allocating. Honest COGS accounting is the pre-requisite for any other AINS metric to be meaningful.

## Relationship to [[brand-strength-ai-visibility-gap]]

Both are "looks-like-X-but-isn't" failure modes:

- **Brand-Strength / AI-Visibility Gap** — market leadership does not predict AI visibility (McKinsey's sportswear finding).
- **Mirage PMF** — revenue growth does not predict AI leverage (Emergence's AINS finding).

Both are instances of the same pattern: **the conventional metric that worked in the prior era doesn't work in the AI era.** Both require new instruments to see the truth.

## Why this matters in Siva's world

[[progrowth]] is an AINS company by structure. Siva should regularly ask:

- Is ProGrowth hitting Mirage PMF? What's the gross margin trend (honestly accounted)?
- What is ProGrowth's [[north-star-product-metric]]? If the team can't name it, Mirage PMF risk is elevated.
- ARR per FTE — is it improving as new clients onboard, or is each new client just another human?
- Where does delivery still require bespoke work, and is the roadmap converting bespoke into product?

For competitive positioning against [[marketri]] and other traditional fractional-marketing firms: they don't have Mirage PMF because they're not claiming to be AI-native. Their ceiling is services-firm margins. ProGrowth's edge is real only to the extent it escapes Mirage PMF.

## Sources citing this page

- [[ai-native-services-playbook]] — where the term was coined (Spring 2026)

## Links

- [[ai-native-services]] — the category this failure mode is specific to
- [[ai-native-services-playbook]] — the source
- [[north-star-product-metric]] — the positive-case companion diagnostic
- [[outcome-based-pricing]] — one of the structural fixes that forces honest margins
- [[brand-strength-ai-visibility-gap]] — companion failure pattern in a different domain
- [[progrowth]] — the wiki's canonical AINS self-diagnosis target
