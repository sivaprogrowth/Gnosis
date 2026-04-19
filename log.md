# Log

Append-only chronological record. See `CLAUDE.md` §6 for format.

Entry prefix convention: `## [YYYY-MM-DD HH:MM] {ingest|query|lint} | <title>`

Parse last 5 entries: `grep "^## \[" log.md | tail -5`.

---

## [2026-04-19 11:15] init | Gnosis scaffolded

- Created directory structure (raw/, wiki/, index.md, log.md, CLAUDE.md, README.md).
- Schema-lite, minimal tooling, unified personal knowledge vault.
- Ready to ingest first source.
