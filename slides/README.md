# slides/

Slide decks authored from wiki content. Marp-formatted markdown → PDF / HTML / PPTX exports.

## Write a deck

1. Copy `_template.md` → `<your-deck-name>.md`.
2. Edit the frontmatter (`title`, `description`).
3. Write slides separated by `---` horizontal rules.
4. Cite wiki content via inline links:
   - Local (Obsidian): `[[earned-media-bias]]`
   - Export-friendly: `[earned-media bias](https://gnosis-main.vercel.app/concepts/earned-media-bias)`
   - Use the export-friendly form in decks that will leave your laptop — `[[wiki-links]]` don't resolve in PDF.

## Export a deck

**One deck, all formats** (PDF + HTML + PPTX):

```bash
bash scripts/build-slides.sh why-fractional-marketing-must-be-ai-native
```

**One deck, one format:**

```bash
bash scripts/build-slides.sh why-fractional-marketing-must-be-ai-native pdf
```

**Every deck in `slides/`** (skips `_template.md`):

```bash
bash scripts/build-slides.sh
```

Output: `slides/dist/<deck>.{pdf,html,pptx}`

The `dist/` folder is not tracked in git — regenerate on demand.

## Preview live while editing

Marp CLI's built-in watch+serve:

```bash
npx @marp-team/marp-cli@latest --server slides/
```

Opens `http://localhost:8080` with a live-reloading deck browser. Nice for presentation rehearsal.

## Theme

All decks use the same inline theme (ProGrowth teal `#14b8a6` accents, system fonts, white background, subtle pagination). Customize in each deck's `style:` frontmatter block.

## Decks currently here

- `_template.md` — starting point for new decks
- `why-fractional-marketing-must-be-ai-native.md` — 12-slide deck for mid-market B2B prospects evaluating fractional marketing. Pulls from [[ai-native-services]], [[mirage-pmf]], [[brand-strength-ai-visibility-gap]], [[big-brand-bias]], [[progrowth]].

## Why Marp, not Obsidian plugins

Marp decks are plain markdown that renders to PDF/PPTX/HTML via a CLI. This keeps decks:

- **Portable** — no plugin lock-in; Marp is the de-facto markdown-slides standard
- **Shippable** — PDF / PPTX for clients; HTML for web
- **Diffable** — git-friendly text, not binary PowerPoint
- **Generatable** — can be written by Claude from wiki content directly

An Obsidian-integrated alternative (Advanced Slides) exists but only works inside Obsidian. Marp CLI works everywhere.
