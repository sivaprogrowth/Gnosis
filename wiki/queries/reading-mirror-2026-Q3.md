---
type: query
created: 2026-10-01
updated: 2026-10-01
sources:
  - readwise://highlights/2026-07-02..2026-10-01
tags: [mirror, quarterly, query, readwise, automated]
---

# Reading-pattern mirror — 2026-Q3

## Period

**2026-07-02 → 2026-10-01** · 4 sources highlighted · 154 highlights · 128 pages ingested.

Two structural facts worth noting before the categories:

- **Intake was compressed into ~30 of 91 days.** Earliest page ingest is 2026-08-09; latest is 2026-09-08. July is entirely silent, and the last three weeks of September are silent, even though the loop kept firing nudges daily through 09-30. The quarter reads as one month of heavy capture bracketed by two months of nothing.
- **~60 of 128 pages carry the same ingest date (2026-08-23).** That's a backlog dump, not a day of reading. Treat the "128 pages" number as *collected*, not necessarily *consumed* — and if that's wrong, say so, because every observation below inherits that assumption.
- **Zero highlights came from the 128 pages.** All 154 highlights live in 4 books. Articles were hoarded; books were annotated.

## Frequency map

| Category | Count (approx) |
|---|---|
| AI market structure, capex, and labs (Nvidia, neoclouds, China, antitrust, VC winter) | ~42 pages |
| AI and the shape of work (solo operators, tiny-staff companies, retraining, agents in the workplace) | ~22 pages |
| Career decline, aging, and the second curve (Brooks) | 100 highlights + ~8 pages |
| Invention, persistence, craft obsession (Dyson, Seinfeld, Carmack) | 50 highlights + ~4 pages |
| India macro & political economy (BJP, ONDC, Naidu, HUL, tax net, Indonesia comparison) | ~13 pages |
| B2B GTM mechanics (PMF levels, growth economics, Harvey, sales strategy, Terminus) | ~10 pages |
| AI consciousness, values, alignment, religion | ~8 pages |
| Health, fitness, longevity, GLP-1s | ~7 pages |
| Attention/self-management (procrastination, rumination, brain breaks, worldview) | ~6 pages |

## Goal cross-reference

From Now.md this quarter:

- **[[ai-overview-tool]]** — multi-tenant migration. Supabase migration unapplied; Phase 2 is an LLM prompt generator + cron fan-out; Phase 3 is `/clients/new` UX.
- **[[kog-bid-bonds-outreach]]** — bid bond outreach to bonded contractors. Pending: send-list confirmation, live A/B subject-line test.
- **[[progrowth-fractional-marketing-seo]]** — Phase 1 pillar content, 850–1,200 monthly search opportunity, pillar + cluster architecture.
- **[[gnosis-hackathon]]** — POC, no Now.md line this quarter.
- **12-week-year theme** — still an empty placeholder. The one field that would let every other section judge calibration is blank.

## Over-indexing

- **~42 pages on AI market structure; 0 on surety, bid bonds, construction contracting, or contractor buying behaviour.** KOG is the project closest to shipping — the build is done, the send list isn't — and the reading contributed nothing to the domain. "How Harvey Builds AI Around Domain Expertise" was the shape of the right idea applied to someone else's vertical.
- **0 pages on multi-tenant architecture, Postgres RLS, Supabase migrations, or cron/job-queue design**, while the ai-overview-tool blocker is literally an unapplied migration that will fail at runtime. The AI reading was almost entirely demand-side and commentary-side; the hard leg of this project is supply-side plumbing. You read about *what AI means* ~70 times and about *how to build the thing you are building* zero times.
- **ProGrowth got the thinnest possible support.** "Writing with AI," "How to spot AI writing," and "Punctuation matters more than you think" are adjacent to craft but not to pillar/cluster SEO, SERP intent analysis, or competitor content gap work against marketri. For a project whose weekly job was *draft the first pillar piece*, the reading supplied vibes, not scaffolding.

## Verticals stopped feeding

- **Data-driven global development** — Factfulness sits at a single highlight. Either abandoned two pages in or a residue of an earlier quarter. Nothing else this quarter corrects a worldview with base rates; the India cluster is narrative/political, not quantitative.
- **Narrative nonfiction / long-form reporting** — Keefe at 3 highlights, then nothing. No fiction at all. The two books that got worked hard (Brooks, Dyson) are both instrumental: one is a framework for managing decline, one is a case study in persistence. Nothing read purely for the texture of a story.
- **Anything technical.** Not "went quiet" — absent. One academic paper (solo business formation) in 128 pages.

Drift question: the AI-commentary firehose is self-replenishing (Economist, WSJ, NYT all push it at you daily), while surety research and Postgres docs require you to go *get* them. Did the vertical close, or did the feed just out-compete it?

## Narrowing

- **97% of highlights are in two books.** Brooks (100) and Dyson (50) account for everything; the other two sources are rounding errors. That's not shallow — that's two books read with unusual intensity. Worth naming neutrally: this is the depth half of the barbell, and the other half is 128 skimmed articles with no annotation.
- **Source set on the article side is one tier of Anglophone business press.** Economist house style dominates ("Nvidia is the central bank of AI," "What AI has in common with dogs," "Smartphones and AI are remaking rural India"), with WSJ/NYT opinion and a thin layer of First Round / newsletter content. No practitioner blogs, no vendor docs, no forums (the one exception, "Apps you can't live without on Mac?", stands out precisely because it's the only community-sourced thing in the list). Every AI take you consumed was written by a journalist, not a builder.
- Two identical entries for "Future of B2B Sales with AI" on 2026-08-20 — duplicate capture, small signal that the ingest is running faster than the reading.

## Surprising overlap

Three themes recur across reads that have no obvious connection to each other:

1. **Depreciation of accumulated expertise.** Brooks (fluid intelligence peaks early, crystallized later) × "In the Age of A.I., Major in Being Human" × "The rise of vibe lawyering" × "AI is Eating Services" × "Can America retrain workers before AI leaves them behind" × "An obituary for the Drexel generation" × the Hyrox/exercise/GLP-1 cluster. The career-decline book and the AI-disruption feed are the *same anxiety* arriving through two doors. 100 highlights in Brooks is not a casual read. Strong candidate for a concept page — something like `[[expertise-depreciation]]` or `[[second-curve]]`.
2. **The one-person firm.** "Million-Dollar Companies With Just One Employee" × "The One-Person Multinational Agency" × "AI-Native Companies Have Tiny Staffs and Fewer Bosses" × "AI and the Rise of Independent Work" × "Startup Founders Working Harder to Keep Up With Their AI Agents." Five+ reads converging on a thesis that *is* the ProGrowth fractional-marketing positioning — and as far as the wiki shows, none of it was linked back to that project page.
3. **Why big things fail to ship.** "Why do big projects go wrong?" × "How Big Things Get Done" review × "India's eye-wateringly big transport upgrade" × Naidu's techno-utopia × Dyson's 5,127 prototypes × "A goal isn't a mission." An execution-failure thesis assembled across 6 reads, sitting next to a Now.md line that says a migration is committed but not applied.

## Open question

Given ~70 pages on what AI means and zero on surety bonds, Supabase, or SERP intent — plus a quarter where the two books you actually annotated were both about expertise running out of road — **what would you have to read for the reading to have changed what shipped?**
