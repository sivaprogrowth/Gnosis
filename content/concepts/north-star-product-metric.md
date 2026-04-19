---
type: concept
created: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
sources:
  - raw/articles/2026-04-19-The AI-Native Services Playbook.md
tags:
  - ains
  - metrics
  - product-management
  - kpi
  - diagnostic
aliases:
  - north-star-metric
  - ains-north-star
  - ai-leverage-metric
---

# North Star Product Metric (for AINS)

<!-- GNOSIS:WIDGET:TOP:START -->
<div style="display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;padding:.6rem .85rem;margin:.5rem 0 1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:10px;background:var(--light,#f8fafc)"><span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;font-weight:600"><span style="display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#22c55e"></span>concept</span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🔗</span><strong>6</strong><span style="opacity:.7">outbound</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📥</span><strong>5</strong><span style="opacity:.7">backlinks</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">📚</span><strong>1</strong><span style="opacity:.7">sources</span></span><span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;color:currentColor;opacity:.85"><span style="opacity:.7">🕓</span><strong></strong><span style="opacity:.7">updated Sun Apr 19</span></span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap"><span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">ains</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">metrics</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">product-management</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">kpi</span> <span style="background:var(--lightgray,#e2e8f0);color:currentColor;padding:.1rem .45rem;border-radius:999px;font-size:.75rem">diagnostic</span></span></div>
<!-- GNOSIS:WIDGET:TOP:END -->


> The single number that captures how much of the work AI is actually doing.

Every [[ai-native-services|AINS]] company needs one — per Emergence Capital's [[ai-native-services-playbook|Spring 2026 playbook]] §VIII. Its absence is a diagnostic for [[mirage-pmf]]: without a north-star product metric, there's no honest way to tell whether AI is genuinely driving the business or whether revenue growth is just hidden human labor.

This is distinct from a "company north star" (e.g. revenue, monthly active users). The **product** north star is the one metric that, improving, forces AI leverage to improve with it.

## Design criteria

A good AINS north-star product metric:

1. **Captures AI leverage directly.** It should move when AI handles more of the work and stay flat when only humans work harder.
2. **Has a clear target direction.** Usually approaches zero (human time per unit) or infinity (units per human-hour). Not a range.
3. **Maps to unit economics.** As the metric improves, gross margin should expand. If it can improve without margin improving, the wrong metric was chosen.
4. **Is scoped to the delivery workflow the AI is actually trying to automate.** A metric averaged across the whole company hides where AI is and isn't landing.
5. **Is visible in team rituals.** Board meetings, product reviews, engineering planning — the metric shows up where decisions get made.

## Canonical examples from the playbook

- **Crosby Legal's "HURT" (Human Review Time)** — minutes of human labor required per document *after* the AI processes it, holding quality constant. Target direction: zero. As HURT approaches zero, margins approach software margins.
- **Generic: Revenue per Employee (ARR/FTE)** — the universal lagging indicator. Every AINS company should report it and benchmark against legacy service providers in their category. If ARR/FTE isn't meaningfully higher than the legacy incumbent, the AI isn't pulling its weight. (Technically a company metric, but works as a north star when the company is in the "prove AI leverage" phase.)
- **Per-customer margin breakdown** — understanding which customers are on the path to AI leverage and which are stuck in labor-intensive delivery. Not a single metric, but a lens that prevents averaging from hiding problems.

## Leading vs lagging

The playbook distinguishes:

- **Leading indicators** (is AI actually doing the work? — e.g. Crosby's HURT, AI-handled-task percentage, automated-review rate)
- **Lagging indicators** (is it showing up in the business? — e.g. ARR/FTE, per-customer margin, gross margin trend)

A healthy AINS operation uses *both* — leading to steer weekly product and delivery decisions, lagging to confirm the steering is working in the financials.

## Per-vertical suggestions

The specific metric must be chosen per business, but the playbook and category experience suggest patterns:

| Vertical | Candidate North Star |
|---|---|
| Legal workflow | Human Review Time per document (HURT) |
| Customer service | Automated-resolution rate (tickets closed without human escalation) |
| Insurance claims | Median AI-adjudication rate; human-touch minutes per claim |
| Fund administration | Transactions processed per FTE per month |
| Marketing ops (fractional) | Campaigns shipped per delivery-FTE per month; content pieces per human-author-hour |
| Revenue cycle management | Claims processed end-to-end without human review |
| Software migration | Lines migrated per engineer-hour (vs traditional) |

## Why this matters in Siva's world

[[progrowth]] is an [[ai-native-services|AINS]] company without (yet) a declared north-star product metric. Candidates worth testing:

- **Campaigns shipped per delivery-FTE per month** — captures throughput AI leverage directly
- **Content pieces per human-author-hour** — AI-assisted content production leverage
- **Client-health-score improvement per delivery-hour** — outcome-leverage rather than throughput-leverage

Choosing one makes the [[mirage-pmf]] diagnostic actionable. Without one, ProGrowth can claim AI-native positioning externally but can't tell internally whether the claim is true.

## Sources citing this page

- [[ai-native-services-playbook]] — where the framework is defined (Spring 2026, §VIII Metrics)

<!-- GNOSIS:WIDGET:BOTTOM:START -->
## Gnosis context

### Related by shared tags

<svg width="520" height="170" viewBox="0 0 520 170" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Bar chart"><g><text x="0" y="22" font-size=".85rem" fill="currentColor">Mirage PMF</text><rect x="220" y="5" width="240.0" height="26" rx="4" fill="#22c55e"><title>Mirage PMF: 2</title></rect><text x="466" y="22" font-size=".85rem" fill="currentColor" opacity=".75">2</text></g><g><text x="0" y="54" font-size=".85rem" fill="currentColor">ProGrowth</text><rect x="220" y="37" width="120.0" height="26" rx="4" fill="#14b8a6"><title>ProGrowth: 1</title></rect><text x="346" y="54" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g><g><text x="0" y="86" font-size=".85rem" fill="currentColor">AI-Native Services (AINS)</text><rect x="220" y="69" width="120.0" height="26" rx="4" fill="#22c55e"><title>AI-Native Services (AINS): 1</title></rect><text x="346" y="86" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g><g><text x="0" y="118" font-size=".85rem" fill="currentColor">Outcome-Based Pricing</text><rect x="220" y="101" width="120.0" height="26" rx="4" fill="#22c55e"><title>Outcome-Based Pricing: 1</title></rect><text x="346" y="118" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g><g><text x="0" y="150" font-size=".85rem" fill="currentColor">The AI-Native Services Playbook (Emergence Capital, Spring 2026)</text><rect x="220" y="133" width="120.0" height="26" rx="4" fill="#6366f1"><title>The AI-Native Services Playbook (Emergence Capital, Spring 2026): 1</title></rect><text x="346" y="150" font-size=".85rem" fill="currentColor" opacity=".75">1</text></g></svg>

*X-axis: number of tags this page shares with each related page.*
<!-- GNOSIS:WIDGET:BOTTOM:END -->

## Links

- [[ai-native-services]] — the category this metric is specific to
- [[mirage-pmf]] — the failure mode this metric diagnoses
- [[ai-native-services-playbook]] — the source
- [[outcome-based-pricing]] — a related structural move that forces honest margins
- [[progrowth]] — the wiki's canonical AINS that should pick one
- [[citation-network-mapping]] — the analogous "ongoing-instrumentation" concept in the AI-search domain
