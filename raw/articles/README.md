# raw/articles/

Web articles clipped for later ingestion into the wiki. Each file is the raw, immutable record of a source — the LLM reads these but never modifies them.

## Clipping workflow (Obsidian Web Clipper)

The Obsidian Web Clipper is a browser extension that saves web pages as markdown directly into this folder.

### 1. Install the extension

- **Chrome / Arc / Brave / Edge:** https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf
- **Firefox:** https://addons.mozilla.org/en-US/firefox/addon/web-clipper-obsidian/
- **Safari:** Mac App Store → "Obsidian Web Clipper"

(Or start from the canonical page: https://obsidian.md/clipper)

### 2. Configure the extension (one-time)

Open the extension's settings after install:

- **Vault:** `gnosis`
- **Default folder:** `raw/articles`
- **Template:** the `_template.md` in this folder — or paste its contents into the extension's template editor directly. Fields the clipper fills in: `{{title}}`, `{{url}}`, `{{date}}`, `{{author}}`, `{{domain}}`, `{{content}}`.
- **File name pattern:** `{{date}}-{{slug|kebab}}` works well; the clipper will produce things like `2026-04-19-new-front-door-to-the-internet.md`.

### 3. Clip an article

- Open an article in your browser.
- Click the Obsidian Web Clipper toolbar icon.
- Review the preview → click **Add to Obsidian**.
- The article lands in `raw/articles/` as a markdown file with the frontmatter template filled in.

### 4. Localize remote images (optional)

Clipped articles reference images via their original URL. To download those images into `raw/assets/` so the note survives link-rot:

- Open the clipped note in Obsidian.
- Press **Cmd+Shift+D** (Mac) or **Ctrl+Shift+D** (Windows / Linux).
- The Local Images Plus plugin downloads every remote image, saves it to `raw/assets/`, and rewrites the links. May take a few seconds for image-heavy articles.

For bulk mode across the whole vault, press **Cmd+Shift+Alt+D**.

### 5. Ingest into the wiki

Once clipped, the article is just another `raw/` file — ingest it like any other source:

> "Claude, ingest `raw/articles/2026-04-19-new-front-door-to-the-internet.md`"

The LLM will read the file, discuss key takeaways, and write the `wiki/sources/<slug>.md` + update any touched entity/concept pages per the schema in `CLAUDE.md` §4.1.

## Template fields

The frontmatter in `_template.md` is designed to round-trip cleanly through the ingest pipeline:

- `source_url` — the canonical URL (the ingest step uses this as the original reference)
- `clipped_at` — when the article was saved (distinguishes stale clips from fresh ones)
- `author`, `domain` — auto-filled by the clipper from the page's meta tags
- `type: article` — differentiates from PDFs and notes
- `tags: [inbox, unread]` — lets Dataview surface the un-ingested backlog on `Home.md`

## Conventions

- Don't edit clipped files after they land. If a correction is needed, add a new clip with a `-v2` suffix.
- Filename slugs are lowercase, kebab-case. No spaces.
- Non-web sources (meeting notes, conversations) go in `raw/notes/`, not here.

## Template file

See `_template.md` in this folder.
