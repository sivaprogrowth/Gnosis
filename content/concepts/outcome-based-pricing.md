---
type: concept
created: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
sources:
  - raw/articles/2026-04-19-The AI-Native Services Playbook.md
tags:
  - ains
  - pricing
  - business-model
  - strategy
aliases:
  - outcomes-based-pricing
  - outcome-pricing
  - performance-based-pricing
---

# Outcome-Based Pricing

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#22c55e"></span>concept</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>6</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>6</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>1</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ains</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">pricing</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">business-model</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">strategy</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


A pricing model where the customer pays for **the result the provider delivers**, not for the inputs (hours, seats, API calls) used to produce it. Per Emergence Capital's [[ai-native-services-playbook|Spring 2026 playbook]] §VI, outcome-based pricing is the **natural pricing model for [[ai-native-services|AINS]]** — and AINS is "the most natural home for outcome-based pricing in the entire AI economy."

## Why AINS solves the attribution problem

Software companies have historically struggled to adopt outcome-based pricing because:

- **Attribution is hard.** How much of the value came from the software vs. the human using the software well?
- **Copilot / autopilot line is blurry.** If the human is still in the loop, who deserves the credit for the outcome?

**AINS sidesteps both.** The customer hires an AINS provider to deliver an outcome, and the provider is accountable for getting it done. No attribution gap — the service IS the outcome. This makes AINS structurally better suited to outcome-based pricing than either SaaS or traditional services firms.

## Two practical implementations

The shape of outcome-based pricing depends on the nature of the work being priced:

### Discrete, large-scope work → project-based outcome pricing

Each engagement is a well-defined project: a mainframe migration, processing a complex insurance claim, a legal filing. The outcome is clear and scope is bounded.

- Customer pays a fixed fee for the defined outcome
- Risk of cost overruns lives with the AINS provider
- Margin comes from AI leverage beating the estimate
- Example alignment: Mechanical Orchard (COBOL migration projects)

### Continuous, variable work → credits-based outcome pricing

Work is ongoing and each unit varies in complexity and value: handling a stream of customer service tickets, processing insurance submissions, running marketing campaigns of varying size.

- Customer pre-purchases credits
- Credits consumed per unit of delivered work, with credit-cost reflecting complexity
- The credit unit should map to something the customer intuitively recognizes as a unit of work (a processed claim, a resolved ticket, a shipped campaign)
- Pricing scales with customer value, not customer size

## Why it matters for margins

Labor-based pricing creates a **structural margin ceiling** for AINS companies: as AI does more of the work, the billable hours drop, and revenue drops with them — right when margins should be expanding. The company's growth and efficiency fight each other.

Outcome-based pricing inverts this. As AI takes over, cost per unit outcome falls while price stays fixed → margin expansion flows directly to the P&L. The AINS company captures the value of its own AI leverage instead of giving it to the customer as a rebate.

The playbook's practical caveat: **many AINS companies will need to start with labor-based pricing** while they're learning to deliver efficiently. That's fine. The failure mode is staying there. The company should have an explicit timeline for transitioning to outcome-based pricing as its AI matures.

## Recurring revenue overlay

Some AINS industries have natural recurring revenue (fund administration, tax prep, ongoing legal counsel). Where they don't, the playbook suggests the **Palantir pattern**:

- Deliver custom analyses / engagements (project-based)
- Leave behind the software / dashboard / report infrastructure as a recurring-revenue product
- Customer keeps paying for ongoing access to the leave-behind asset even when not actively engaging

This is directly relevant for [[progrowth]] — the [[ai-overview-tool]] is precisely this pattern: a product-layer leave-behind that ProGrowth clients keep paying for between services engagements.

## Why this matters in Siva's world

[[progrowth]] today uses primarily labor-based pricing (fractional CMO retainer, hourly overages). To escape the labor-based ceiling:

- Define outcome units that clients intuitively understand — shipped campaigns, qualified pipeline contributed, content output per month
- Price the outcome, not the hours
- Use a credits-based model for variable work; fixed-fee for discrete projects
- Keep [[ai-overview-tool]] as the Palantir-pattern leave-behind for recurring revenue between engagements

The [[mirage-pmf]] test and outcome-based pricing are connected: labor-based pricing **structurally hides** Mirage PMF because the company gets paid regardless of AI leverage. Outcome-based pricing makes AI leverage show up directly in gross margin.

## Sources citing this page

- [[ai-native-services-playbook]] — where this pricing framework is developed (Spring 2026, §VI Pricing)

<!-- GNOSIS:WIDGET:BOTTOM:START -->
## Gnosis context

### Related by shared tags

<svg width="520" height="170" viewBox="0 0 520 170" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Bar chart"><g><text x="0" y="22" font-size=".85rem" fill="currentColor">AI-Native Services (AINS)</text><rect x="220" y="5" width="240.0" height="26" rx="4" fill="#22c55e"><title>AI-Native Services (AINS): 2</title></rect><text x="466" y="22" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="54" font-size=".85rem" fill="currentColor">Mirage PMF</text><rect x="220" y="37" width="240.0" height="26" rx="4" fill="#22c55e"><title>Mirage PMF: 2</title></rect><text x="466" y="54" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="86" font-size=".85rem" fill="currentColor">The AI-Native Services Playbook (Emergence Capital, Spring 2026)</text><rect x="220" y="69" width="240.0" height="26" rx="4" fill="#6366f1"><title>The AI-Native Services Playbook (Emergence Capital, Spring 2026): 2</title></rect><text x="466" y="86" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="118" font-size=".85rem" fill="currentColor">ProGrowth</text><rect x="220" y="101" width="120.0" height="26" rx="4" fill="#14b8a6"><title>ProGrowth: 1</title></rect><text x="346" y="118" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g><g><text x="0" y="150" font-size=".85rem" fill="currentColor">North Star Product Metric (for AINS)</text><rect x="220" y="133" width="120.0" height="26" rx="4" fill="#22c55e"><title>North Star Product Metric (for AINS): 1</title></rect><text x="346" y="150" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g></svg>

*X-axis: number of tags this page shares with each related page.*
<!-- GNOSIS:WIDGET:BOTTOM:END -->

## Links

- [[ai-native-services]] — the category where this pricing model fits naturally
- [[mirage-pmf]] — the failure mode outcome-based pricing exposes
- [[north-star-product-metric]] — the internal-metric companion
- [[ai-native-services-playbook]] — the source
- [[progrowth]] — the wiki's canonical AINS pricing-evolution target
- [[ai-overview-tool]] — the "Palantir pattern" recurring-revenue leave-behind
