---
type: concept
created: 2026-04-19
updated: 2026-04-19
sources:
  - raw/articles/2026-04-19-The AI-Native Services Playbook.md
tags: [ains, metrics, product-management, kpi, progrowth, diagnostic]
aliases: [north-star-metric, ains-north-star, ai-leverage-metric]
---

# North Star Product Metric (for AINS)

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

## Links

- [[ai-native-services]] — the category this metric is specific to
- [[mirage-pmf]] — the failure mode this metric diagnoses
- [[ai-native-services-playbook]] — the source
- [[outcome-based-pricing]] — a related structural move that forces honest margins
- [[progrowth]] — the wiki's canonical AINS that should pick one
- [[citation-network-mapping]] — the analogous "ongoing-instrumentation" concept in the AI-search domain
