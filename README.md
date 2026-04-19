# Gnosis

A personal LLM wiki. Claude Code reads sources I drop into `raw/` and incrementally builds a structured, cross-linked wiki in `wiki/`. Knowledge compounds with every source; nothing is re-derived on every query.

## How to use

Start a Claude Code session in this directory:

```bash
cd ~/Projects/gnosis
claude
```

Claude auto-loads `CLAUDE.md` — the schema that tells it how to behave as the wiki maintainer.

### Ingest a source

```
ingest https://example.com/some-article
ingest raw/pdfs/paper.pdf
ingest raw/notes/2026-04-19-thoughts.md
```

Claude fetches (if URL), reads, discusses takeaways with me, then writes a source summary, updates entity/concept pages, maintains cross-references, and logs the ingest.

### Ask a question

```
what do I have on fractional marketing?
compare Kahneman and Taleb on uncertainty
what's the best argument against X across my sources?
```

Claude reads `index.md`, then relevant wiki pages, and answers with citations. Good answers can be filed back as `wiki/queries/<slug>.md`.

### Lint

```
lint the wiki
```

Claude reports contradictions, orphans, stubs, and missing cross-references. I decide what to fix.

## Layout

```
raw/       # IMMUTABLE source documents (Claude reads only)
wiki/      # LLM-generated markdown (Claude writes)
index.md   # Catalog of every wiki page
log.md     # Chronological record of ingests, queries, lints
CLAUDE.md  # The schema — Claude's operating manual
```

## Optional: open as an Obsidian vault

`File → Open folder as vault → ~/Projects/gnosis`. Graph view reveals the shape of the knowledge base. `[[wiki-links]]` resolve automatically.
