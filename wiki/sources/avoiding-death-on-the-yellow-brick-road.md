---
type: source
source_type: article
title: "Avoiding Death on the Yellow Brick Road"
authors: ["Joe Schmidt"]
published: null
source_url: "https://x.com/joeschmidtiv/status/2059642470334677472"
accessed: "2026-06-10"
tags: ["ai-application-layer", "vertical-ai", "agentic-ai", "enterprise-software", "startup-strategy"]
---

## Abstract

Joe Schmidt (a16z) argues that the AI application layer is not dead but bifurcated: the "Yellow Brick Road" describes the horizontal, model-plus-connectors path that [[companies/openai|OpenAI]] and [[companies/anthropic|Anthropic]] are actively commoditising, while "the Rest of Oz" describes complex, vertical, multi-step workflows where startups can build durable moats. The essay contends that vertical application companies can defend themselves through proprietary data flywheels, multi-vendor model routing, cost optimisation, and governance/compliance control planes that horizontal labs structurally cannot replicate. Case studies from 11x (sales) and FurtherAI (insurance) illustrate how workflow depth, guardrail specificity, and production feedback loops compound into defensible businesses. Schmidt concludes that the next generation of enterprise software will be built "off the road," owning the system of work rather than sitting as a tool on top of it.

## TL;DR

- The AI application layer is split: horizontal "Yellow Brick Road" apps are being commoditised by the labs, but complex vertical "Rest of Oz" workflows are not.
- Vertical AI companies build defensibility through data flywheels, multi-model routing, compliance control planes, and deep domain guardrails that horizontal labs cannot replicate at scale.
- The winning test: are you building a *system* customers run their work through, or a *tool* on top of a system they already have? Systems survive lab competition; tools don't.

## Key claims

- The "Yellow Brick Road" — horizontal model + off-the-shelf connectors + generic orchestration — is structurally dominated by [[companies/openai|OpenAI]] (Codex/Cowork) and [[companies/anthropic|Anthropic]] (Claude) due to model ownership, distribution, and brand halo.
- [[companies/openai|OpenAI]] and [[companies/anthropic|Anthropic]] launching billion-dollar forward-deployed joint ventures signals they cannot solve complex enterprise problems with a generic AI coworker alone.
- Vertical application companies accumulate two stacked data flywheels: across-customer pattern recognition and within-customer tribal knowledge — neither of which appears in public training data.
- Application companies can route across the entire model market (including open-source fine-tunes and competitor models) and absorb migration complexity every time a new model ships, something the labs cannot do for customers.
- Cost moats emerge from tiered model routing — frontier models for hard tasks, mid-tier for bulk, fine-tuned small models for narrow slices — producing lower per-outcome costs than any single lab's API pricing floor.
- Governance and compliance (FRCP/bar rules, HIPAA, SEC/FINRA, state insurance regulations) are industry-specific control planes that a horizontal player cannot credibly own across every vertical simultaneously.
- Roughly half of any real workflow is non-agentic deterministic software where labs hold no engineering edge; the other agentic half still requires domain-specific tuning and constraint that compounds with production exposure.
- The "system vs. tool" test — whether a customer would still need your product if a lab shipped a direct competitor — is the clearest heuristic for whether a startup is buildling off the road or on it.

## Key passages

> "The Yellow Brick Road is our shorthand for the path the labs are walking, where they're committing extraordinary resources. The reason the labs are best-suited for problems like code generation, writing, or image-creation is because these problems improve with raw model capability… Meanwhile, the rest of Oz is inhabited by more complex, often vertical problems, that aren't as simple as giving a business user a horizontal tool with access to standard tools and computer use."

> "A company that has run its agents through a hundred legal redlines, a thousand insurance underwriting cycles, or ten thousand SDR campaigns has internalized the shape of the problem in a way the next entrant cannot replicate by spinning up a fresh agent for the first time."

> "The Rest of Oz company picks the right model for each sub-task across the entire model market, not just what its parent lab ships. It also does the work nobody wants to do — re-running evals on upgrades, recalibrating prompts for the customer's edge cases, rolling out without breaking production — every time a new model lands."

> "The workflow you ship on day one is not the moat. The loop that production usage creates over time is." — Aman Gour, CEO of FurtherAI

> "The critical insight in the Oz analogy is that roughly half of any real workflow that is non-agentic carries no lab advantage. They are no better than you are at writing the deterministic software underneath the model layer." — Prabhav Jain, CEO of 11x

> "Systems own the workflow end-to-end — the data capture, the governance, the records of what got done… The tool case generates real revenue and the labs can take it because the customer isn't depending on you as the orchestration layer."

## Related

- [[concepts/agentic-ai]]
- [[companies/openai]]
- [[companies/anthropic]]
- [[concepts/implementation-wave]]
- [[concepts/outcome-based-pricing]]
- [[concepts/ai-evals]]
- [[Yellow Brick Road (AI strategy)]]
- [[Rest of Oz (vertical AI)]]
- [[System of Work]]
- [[Vertical AI Moats]]
- [[Multi-model Routing]]
- [[Agentic Workflow Governance]]
- [[11x]]
- [[FurtherAI]]
- [[Forward-deployed AI Joint Ventures]]
