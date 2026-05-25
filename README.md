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

## Per-machine setup: Obsidian MCP

The vault is portable, but each machine needs the Obsidian Local REST API plugin and a matching MCP entry so Claude Code can read the **live** vault — including unsaved edits — and write through Obsidian's index. Filesystem-only access still works as a fallback (`CLAUDE.md` §11), but you lose live-buffer semantics and immediate re-indexing.

The `.obsidian/` directory is gitignored, so none of this state syncs across machines via git. Repeat these steps on every device.

### 1. Install the plugin

With the vault open in Obsidian:

`Settings → Community plugins → Browse → "Local REST API" → Install → Enable`

Then in the plugin's settings tab, toggle **"Enable Non-encrypted (HTTP) Server"** on (port `27123`). The encrypted server on `27124` works too, but the HTTP port avoids self-signed-cert friction for a localhost-only service.

### 2. Generate and store the API key

In the same settings tab, copy the **API Key**. Store it in 1Password (or another secret manager), then export it from your shell rc:

```bash
# ~/.zshrc
export OBSIDIAN_API_KEY="$(op read 'op://Private/Obsidian Local REST API/credential')"
```

Or paste the literal value if you don't use 1Password. Never commit the key.

### 3. Add the MCP entry to `~/.mcp.json`

```json
{
  "mcpServers": {
    "obsidian": {
      "type": "http",
      "url": "http://127.0.0.1:27123/mcp/",
      "headers": {
        "Authorization": "Bearer ${OBSIDIAN_API_KEY}"
      }
    }
  }
}
```

The plugin exposes MCP natively on the same port as the REST API; no separate stdio server is required. Don't hardcode the key — let Claude Code interpolate `${OBSIDIAN_API_KEY}` from the environment so the file itself stays safe to commit.

### 4. Restart Claude Code and verify

```bash
claude mcp list
# obsidian: http://127.0.0.1:27123/mcp/ (HTTP) - ✓ Connected
```

Obsidian must be running for the endpoint to be reachable. If it shows `✗`, check that the plugin is enabled, the HTTP server is on, and `$OBSIDIAN_API_KEY` is exported in the shell that launched Claude Code.

Once connected, `CLAUDE.md` §11 governs how the agent should reach for MCP tools vs. filesystem reads.
