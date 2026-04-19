---
type: project
created: 2026-04-19
updated: 2026-04-19
sources:
  - raw/articles/2026-04-19-The AI-Native Services Playbook.md
tags: [project, progrowth, ai-visibility, saas, geo, owned-product, ains-palantir-pattern]
status: Pre-launch (code complete, pending Resend domain verification + Vercel deploy)
url: https://overviews.progrowth.services
founded-by: "[[siva-cotipalli]]"
---

# AI Overview Tool

A ProGrowth-owned SaaS product that analyzes a website's AI visibility across [[chatgpt]], [[google-ai-overview]], [[perplexity]], and [[claude]]. Hosted at `overviews.progrowth.services`.

## What it does

For a given domain + query set, the tool reports:

- Which AI engines cite the domain, and at what frequency
- Which pages on the domain get cited (entry-point mapping)
- Which competitors co-occur in the same responses
- Which earned-media sources the engines pull from for those queries
- Trend over time — weekly / monthly re-scans

Hybrid data architecture: DataForSEO's **LLM Mentions API** for aggregated monthly data + live engine queries for real-time spot checks.

## Why it exists

[[progrowth]] runs [[generative-engine-optimization|GEO]] campaigns manually for clients. The AI Overview Tool productizes the diagnostic layer of that work — the recurring measurement, not the strategy. That separation is intentional per the [[ai-native-services-playbook]]'s **Palantir pattern**: deliver custom analyses as services engagements, leave behind the software / dashboard infrastructure as recurring-revenue product.

This makes the tool ProGrowth's first real product-layer asset on top of its [[ai-native-services|AINS]] services layer.

## Product-vs-services boundary

ProGrowth's services business is an AINS company (see [[progrowth]]). The AI Overview Tool is **not** AINS — it's a pure SaaS product. That boundary is deliberate:

- The **services business** sells outcomes (GEO campaigns, content shipped, visibility lifted) — Palantir-style engagement.
- The **product business** sells self-serve measurement and alerting — SaaS-style.
- Clients who graduate off services-heavy engagements stay on product subscriptions as a leave-behind.

Different unit economics, different metrics, different pricing. Mixing them on one page would conflate the two business models.

## Competitive position vs [[semrush-ai-visibility-index|Semrush AIVI]]

Semrush AIVI is the nearest public reference point — a free, monthly-updated AI-visibility dashboard. The AI Overview Tool's differentiation:

1. **Broader engine coverage** — Semrush AIVI currently covers [[chatgpt]] + [[google-ai-overview]]. AI Overview Tool also covers [[claude]], [[perplexity]], and targets [[gemini]] next.
2. **Fractional-agency integration** — AIVI is SaaS-only; the AI Overview Tool bundles into ProGrowth's services engagements so results are actionable by the team running GEO on the client's behalf.
3. **Challenger-brand focus** — AIVI benchmarks broadly across verticals; AI Overview Tool is tuned for the niche / challenger-brand query shapes where [[big-brand-bias]] weakens and [[earned-media-bias]] wins. See the reconciliation query at [[how-chen-and-mckinsey-disagree-on-big-brand-bias]].
4. **Niche B2B verticals** — credit unions, insurance agencies, professional services — underserved by AIVI's horizontal benchmark.

## Current status (April 2026)

- Code: complete, tested locally
- Auth + domain: pending Resend domain verification
- Deploy: pending Vercel production push (awaiting DNS)
- First paid clients: targeted Q2 2026 after live deployment

## Roadmap signals from the [[ai-native-services-playbook]]

Even though the AI Overview Tool is SaaS (not AINS), AINS playbook principles still apply to the ProGrowth surface that bundles it:

- **Outcome-based pricing** on the services side, credits or per-domain pricing on the product side (see [[outcome-based-pricing]])
- **North-star product metric** for the AINS services wrapped around the tool: clients' lift in AI share-of-voice per delivery-hour
- **Data flywheel** — every scan contributes to ProGrowth's cross-client benchmark dataset, which then improves the service layer's recommendations

## Sources citing this page

- [[progrowth]] — ProGrowth is the parent company
- [[gnosis-hackathon]] — the Gnosis demo cites this as a sibling project
- [[semrush-ai-visibility-index]] — the tool's nearest public reference
- [[semrush]] — parent of the reference product
- [[ai-native-services-playbook]] — frames the product-as-leave-behind pattern

## Links

- [[progrowth]] — parent company
- [[semrush-ai-visibility-index]] — closest public competitor / reference
- [[generative-engine-optimization]] — the market category
- [[citation-network-mapping]] — the underlying analytical approach
- [[ai-native-services]] — why the services/product split matters
- [[outcome-based-pricing]] — pricing model context
- [[brand-strength-ai-visibility-gap]] — core research finding the tool operationalizes
- [[big-brand-bias]] — paired research finding
- [[chatgpt]], [[claude]], [[perplexity]], [[google-ai-overview]], [[gemini]] — covered engines
