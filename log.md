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
