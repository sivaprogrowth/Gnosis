---
type: query
created: 2026-05-25
updated: 2026-05-25
sources:
  - readwise://highlights/resurface/ai-overview-tool/2026-05-25
tags: [resurface, query, ai-overview-tool, multi-tenant, saas-architecture]
work_context: ai-overview-tool
---

# Resurface — aioverviews multi-tenant migration (2026-05-25)

**Work context:** `[[ai-overview-tool]]` — Phase 1 multi-tenant migration committed (`89ac640`), Supabase migration not yet applied. Phase 2 (LLM prompt generator + cron fan-out) and Phase 3 (`/clients/new` UX) follow.

**Why these six:** the migration is half a positioning decision and half an architecture decision. The hooks below force the positioning side to surface alongside the SQL — easy to forget when the immediate task is `supabase db push`. Source: `mcp__readwise__readwise_search_highlights` vector-similarity pass, re-ranked for applicability per `CLAUDE.md` §4.8.

> "what's called 'multi-tenant' software. Once we had superfast Internet backbones, people realized you could zip bits from a server located thousands of miles just as quickly as you could from a server down the hall." — Jeff Lawson, *Ask Your Developer*
> **Why this matters for the migration:** The canonical history of "multi-tenant" — useful framing when explaining the architectural choice to a client/partner who hasn't lived through SaaS's transition. Anchors *why* you're doing this work, not just what.

> "A technology platform has the potential for extreme growth across multiple ecosystems. The downside of positioning yourself as a platform though could be that customers buy solutions, and might see a platform as incomplete, more than they need, complex or fear they are getting 'locked in.'" — Stijn Hendrikse & Mike Northfield, *T2d3*
> **Why this matters for the migration:** The `/clients/new` UX (Phase 3) needs to defuse exactly this — sell the platform as a series of jobs done, not as platform-ness. Each agency onboarded should feel they're buying *their own* AI-visibility dashboard, not signing up for a platform.

> "You should launch your product today, even if you're not ready, because you'll learn so much faster. You only learn when you have real users and real feedback." — Uri Levine, *Fall in Love With the Problem, Not the Solution*
> **Why this matters for the migration:** Phase 1 is committed. **Apply the Supabase migration today** rather than perfecting Phase 2 first. Real client feedback on the multi-tenant flow will redirect Phase 2/3 better than any internal review will.

> "There are two ways an entrepreneur can fail: one, launch a product that nobody desires; two, launch a product that people desire but it has no significant advantage over established competitors." — Paras Chopra, *The Book of Clarity*
> **Why this matters for the migration:** AI-visibility tooling is the established category ([[semrush-ai-visibility-index|Semrush AIVI]] exists). Failure mode #1 is already off the table. Phase 2 (LLM prompt generator + cron fan-out) and Phase 3 (`/clients/new`) must each advance the *significant-advantage* axis — multi-client management, niche-vertical query shapes — not just achieve feature parity. Connects to [[mirage-pmf]] — revenue from multi-tenant onboarding isn't itself PMF; AI leverage per delivery-hour is.

> "I suggest at least an annual refresh. Include customer success, sales, and marketing teams in the conversation. As your company grows (and if you create multiple differentiated product offerings), you might consider creating different subset ICPs." — T2d3
> **Why this matters for the migration:** Multi-tenant explicitly means multiple ICPs (one per agency client's clients). The `/clients/new` flow should let agencies define their own ICP per-tenant, not bake yours in. Probably the single highest-leverage Phase 3 design decision.

> "Failure in both of these traps is not deliberately positioning the product." — April Dunford, *Obviously Awesome*
> **Why this matters for the migration:** The wiki page `wiki/projects/ai-overview-tool.md` still says "Pre-launch" (created 2026-04-19, stale). Going multi-tenant *is* a positioning shift — from "ProGrowth's internal tool" to "white-label-ish AI-visibility platform for fractional agencies." Update the project page's positioning section as part of this migration, not after.

## Links

- [[ai-overview-tool]] — the project this resurface anchors to
- [[mirage-pmf]] — failure mode the Chopra hook gestures at
- [[semrush-ai-visibility-index]] — the established-category benchmark to differentiate from
