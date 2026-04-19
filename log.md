# Log

Append-only chronological record. See `CLAUDE.md` §6 for format.

Entry prefix convention: `## [YYYY-MM-DD HH:MM] {ingest|query|lint} | <title>`

Parse last 5 entries: `grep "^## \[" log.md | tail -5`.

---

## [2026-04-19 11:15] init | Gnosis scaffolded

- Created directory structure (raw/, wiki/, index.md, log.md, CLAUDE.md, README.md).
- Schema-lite, minimal tooling, unified personal knowledge vault.
- Ready to ingest first source.

## [2026-04-19 11:40] ingest | GEO: How to Dominate AI Search (Chen et al., 2025)

- First real ingest. 27-page arXiv paper (2509.08919v1) on Generative Engine Optimization.
- User directed: tag ProGrowth context + lean on engine-specific behavior pages.
- Wrote 14 wiki pages: 1 source + 5 engine entities (ChatGPT, Claude, Perplexity, Gemini, Google Search) + 8 concepts (GEO, earned-media bias, Brand/Earned/Social taxonomy, justification attributes, API-able brand, big brand bias, E-E-A-T, citation network mapping).
- Tags applied: [ai-search, geo, progrowth, seo-strategy, ai-visibility] to anchor future ProGrowth-context ingests.
- No contradictions flagged (first source — nothing to contradict yet).
- Index.md populated with all 14 rows across Sources / Entities / Concepts sections.

## [2026-04-19 12:10] ingest | New Front Door to the Internet (McKinsey, Oct 2025)

- Second ingest. 9-page McKinsey Growth Marketing & Sales Practice brief — executive companion to Chen et al.
- User directed trimmed scope: skip microsoft-copilot stub, skip mckinsey entity, skip e-e-a-t touch-up, skip individual engine citation-list touch-ups (no engine-specific claims to attach).
- Wrote 4 new pages: source + google-ai-overview (entity) + ai-search-decision-journey + brand-strength-ai-visibility-gap (concepts).
- Updated 5 existing pages: earned-media-bias (added McKinsey AIO vertical data + 5-10% brand-owned stat), generative-engine-optimization (added McKinsey 4-move framework + $750B projection + 16% tracking stat), citation-network-mapping (added CMO readiness-gap context), brand-earned-social-taxonomy (added McKinsey's 6-category alternative + reconciliation), big-brand-bias (added Contradictions section reconciling with sportswear SoV data).
- Compounding behavior confirmed: existing entities updated in place, not duplicated. Index.md grew from 14 to 18 rows.
- Key contradiction flagged and resolved: Chen et al.'s "Big Brand Bias" (AI favors major brands) vs McKinsey's "market share ≠ AI SoV" — reconciled as scope-different (unbranded ranking prompts vs aggregate query distribution). Captured in big-brand-bias.md Contradictions section.
- Methodology contrast captured: Chen et al.'s 3-tier Brand/Earned/Social taxonomy vs McKinsey's 6-category (affiliate blogs / UGC / news-media / brand-retailer / academic / other). "Affiliate blogs" is the largest category that doesn't cleanly fit the 3-tier scheme.

## [2026-04-19 12:35] ingest | Semrush AI Visibility Index (bit.ly shortlink → ai-visibility-index.semrush.com)

- Third ingest. A bit.ly shortlink (shared by Elena Verna in a Semrush newsletter) pointing to Semrush's public AI Visibility Index tool.
- Raw artifacts saved: raw/notes/semrush-aivi-shortlink.txt (original 22-byte URL file) and raw/articles/semrush-ai-visibility-index.md (fetched overview + methodology snapshot).
- Unlike prior ingests (static papers), this source is an interactive tool with monthly-updating data. Treated as both a source (April 2026 snapshot) and an entity (the evolving tool).
- Trimmed per user direction: skipped separate Semrush company entity, skipped separate "Google AI Mode" entity (captured as naming note on google-ai-overview instead), skipped new SoV concept page (captured inline on brand-strength-ai-visibility-gap).
- Wrote 2 new wiki pages: source (semrush-ai-visibility-index) + entity (semrush-ai-visibility-index).
- Updated 3 existing pages: citation-network-mapping (added productization section), brand-strength-ai-visibility-gap (added formal SoV definition), google-ai-overview (added AI Overview vs AI Mode vs SGE naming nuance).
- Flagged unverified claim: "LLM-search users convert 4.4× more" has no primary source on the page. Marked as needs-verification in wiki for any client-facing use.
- ProGrowth competitive positioning captured: AIVI is the closest public reference for overviews.progrowth.services; differentiation levers identified (broader engine coverage, fractional-agency integration, challenger-brand focus, niche B2B verticals).

## [2026-04-19 14:30] ingest | LinkedIn profiles — Siva Cotipalli + Phani Sama

- Paired ingest: Siva's own LinkedIn (8 pages) + Phani Sama's LinkedIn (3 pages, Siva's contact and founder of redBus).
- User directive: this is Siva's personal wiki — all contacts map in relation to him; identify all entities (companies worked, colleges attended, shared credentials).
- Raw files saved: `raw/pdfs/linkedin-siva-cotipalli.pdf`, `raw/pdfs/linkedin-phani-sama.pdf`.
- Wrote 20 new wiki pages: 2 sources + 18 entities. Enriched 1 existing page ([[siva-cotipalli]]).
  - Sources (2): [[linkedin-siva-cotipalli]], [[linkedin-phani-sama]].
  - People (1 new + 1 enriched): [[phani-sama]] (new), [[siva-cotipalli]] (full career table, education, honors, languages).
  - Shared bridges (3): [[bits-pilani]] (both alumni), [[chevening-scholarship]] (both scholars), [[government-of-telangana]] (Phani CIO + Siva home region).
  - Phani's orgs (6): [[redbus]], [[t-works]], [[kakatiya-sandbox]], [[deshpande-skilling]], [[westbridge-capital]], [[world-economic-forum]].
  - Siva's orgs (5): [[yogyabano]], [[cityfalcon]], [[reverie-language-technologies]], [[ntwist]], [[dhanax]].
  - Siva's education (2): [[iim-kozhikode]], [[lse]].
- Key graph insight captured on [[phani-sama]]: four dense shared nodes with Siva — BITS Pilani, Chevening, Telangana-govt orbit, Bengaluru ecosystem. Makes Phani a natural warm-intro candidate for ProGrowth India-market public-sector / hardware / skilling work.
- Adjacent-mission pairing flagged: [[yogyabano]] (Siva) ↔ [[deshpande-skilling]] (Phani) — both Indian skilling plays, natural conversation starter.
- Skipped dedicated pages (mentioned inline only on people pages): Infosys, Oracle India, Texas Instruments, ST Microelectronics, Indian Institute of Science, Stanford, King's College London, Swedish Institute, Goodmoney, Quicksand Design Studio / Project Sammaan, TEDIndia Fellowship. These are well-known employers/programmes with thin unique relationship to the wiki's current focus; can be promoted to pages later if activated.
- index.md restructured: Entities section now has sub-tables (People / Companies and institutions / AI engines and search products / Projects / Inspiration) — still within CLAUDE.md §7's four top-level sections, but navigable now that entity count is ~30.
- No contradictions flagged.

## [2026-04-19 16:45] query | How Chen et al. and McKinsey disagree on Big Brand Bias

- First filed query page: `wiki/queries/how-chen-and-mckinsey-disagree-on-big-brand-bias.md`.
- Synthesizes the two apparently-contradictory findings from the April 2026 AI-search source set — [[big-brand-bias]] (Chen et al., unbranded ranking prompts) vs [[brand-strength-ai-visibility-gap]] (McKinsey, aggregate prompt distribution) — and files the reconciliation (different prompt-type scopes) alongside its practical implications for challenger brands, [[progrowth]] clients, and [[ai-overview-tool]] design.
- Both parent concept pages already carry inline Contradictions sections; this query page exists as the canonical one-stop synthesis so future lookups don't have to reassemble the reconciliation from scratch.
- index.md Queries section: was empty, now has 1 row.
- Cross-refs out to: [[big-brand-bias]], [[brand-strength-ai-visibility-gap]], [[earned-media-bias]], [[brand-earned-social-taxonomy]], [[generative-engine-optimization]], [[geo-how-to-dominate-ai-search]], [[new-front-door-to-the-internet]], [[progrowth]], [[marketri]], [[ai-overview-tool]].

## [2026-04-19 17:30] schema | CLAUDE.md refined based on 5-ingest operational drift

- Schema updated to reflect how the wiki is actually run after 5 ingests, 20-page LinkedIn expansion, 1 query page, the dataview generator, and Obsidian vault setup.
- §3 directory layout: added `Home.md`, `.obsidian/`, and all 4 Farzapedia-era folders (`people/`, `companies/`, `projects/`, `inspiration/`). Added a type-to-folder routing table.
- §4.1 ingest step 5: generalized "update entities and concepts" to cover person/company/project folders too. Added the compounding-over-breadth rule (no orphan stubs for one-mention names like Infosys).
- §5 reorganized into seven sub-sections: required frontmatter, type-specific fields, required body sections (including the `## Sources citing this page` backlink convention which was undocumented), query-page structure, the `## ProGrowth ...` H2 privacy convention (heading-based strip in sync-wiki.sh — now explicit), naming rules, wiki-links.
- §7: noted that Entities may be sub-tabled (People / Companies / Engines / Projects / Inspiration) when entity count grows — matches current index.md.
- §8 failure modes: added "do not edit auto-generated widget blocks" (`<!-- GNOSIS:WIDGET:* -->` markers), "do not leak private content outside ProGrowth H2 sections", "do not stub-expand".
- New §9 Publication Pipeline: briefly documents the sync-wiki.sh → generate-dataview.cjs → Vercel flow so future-Claude knows the projection at gnosis-main exists and regenerates on every build.
- New §10 Operating Modes: captures Interactive (default) vs Compact ("just do it") modes — reflects Siva's observed pattern of trimming scope per-task.
- File grew from 158 to 271 lines. No behaviors changed; just made the implicit explicit.
