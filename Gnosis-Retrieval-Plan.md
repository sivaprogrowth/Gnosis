# Gnosis — Retrieval Refinement & /chat Execution Plan

**Parent:** [Gnosis-Plan.md](./Gnosis-Plan.md) (architecture). This is the execution plan for the current work: replacing "stuff-everything" retrieval with the 6-stage pipeline, building a dedicated `/chat` page as the new primary UI, and removing the existing chat widget.

**Status:** draft 2026-04-19.

---

## 1. Scope

**In scope**
- Replace `api/ask.ts` monolithic call with the 6-stage retrieval pipeline (Gnosis-Plan.md §7).
- Build a new `/chat` page: full-page retrieval UI with parsed-query chips, retrieval sidebar, citation-linked synthesis, and file-back.
- Remove the existing `ChatWidget` and its assets; redirect entry points to `/chat`.
- Upgrade citations: clickable wiki-link anchors + sidebar-sync highlighting + hover preview.
- Multi-event streaming protocol (SSE typed events, see §3).

**Out of scope (this iteration)**
- Ingest agent (lives at `~/Projects/gnosis/wiki/`, separate concern).
- Emotion frontmatter backfill on existing GEO corpus — pipeline tolerates missing fields.
- Vector embeddings / SQLite side-index (deferred per Gnosis-Plan.md §14).
- Image retrieval (no images in current corpus).
- True WebSocket upgrade (see §3 — SSE handles the MVP; WS is a later migration if needed).

---

## 2. Why a dedicated /chat page (not a bigger widget)

- The 6-stage pipeline produces *signal worth showing*: parsed query intent, retrieved candidates with scores, top-K with previews, citation hover-sync. Cramming into a 360×500px bubble either hides the good parts or overloads the UI.
- The canonical USP query ("design a landing page inspired by recent saves") is a multi-turn research interaction — full-page real estate fits.
- `/chat` is shareable (URL params), stateful (localStorage threads), discoverable (prominent nav link).
- Widget's original role (page-contextual quick Q&A) is superseded: a user reading a page can click to `/chat?q=...` seeded with context.

---

## 3. Streaming protocol — SSE with typed events

### Decision

Use **multi-event SSE** (not WebSocket) for the MVP. Rationale: Vercel Serverless Functions (our current hosting) don't support long-lived WebSocket connections; migrating to Fly.io / Cloudflare Durable Objects / Vercel Fluid Compute is infrastructure work disproportionate to the gain.

Multi-event SSE gives us progressive per-stage updates (the real UX win of WS) with no infra change. We preserve an upgrade path to WS if/when client-initiated mid-query control becomes a need.

### Protocol

Server-Sent Events stream. Each frame is `event: <type>\ndata: <json>\n\n`. Types:

| Event | Payload | Emitted by |
|---|---|---|
| `parsed` | `{topic, intent, emotion[], aesthetic[], time_scope}` | Stage 1 |
| `candidates` | `[{slug, type, score, signals}]` (~20 items) | Stage 2 |
| `top_k` | `[{slug, type, title, one_liner, why_selected}]` (5–8 items) | Stage 3 |
| `chunk` | `{text}` | Stage 5 streaming tokens |
| `error` | `{message}` | any |
| `done` | `{usage, stop_reason}` | terminal |

Client connects via `EventSource`. Separate handlers per event type populate the UI panels progressively.

### Future WS migration (deferred)

When/if we need client→server mid-query control (cancel, refine, filter adjustment), migrate `/api/ask` to a WS-capable runtime. The event types above map 1:1 to WS messages — frontend refactor is minimal.

---

## 4. Retrieval pipeline phases (backend)

### R1 — In-memory page index (cold start)

- Parse all `content/**/*.md` using `gray-matter` at module load (already a dependency).
- Build typed index:
  ```ts
  type PageRecord = {
    slug: string            // e.g. "entities/chatgpt"
    type: "source" | "entity" | "concept" | "query"
    subtype?: "fact" | "take" | "object"
    title: string
    body: string
    tokens: Set<string>     // lowercased, stopworded, for lexical match
    tags: string[]
    aliases: string[]
    emotion?: string[]
    emotion_controlled?: string[]
    aesthetic?: string[]
    mood?: string
    sources?: string[]
    path: string            // filesystem path for reads
  }
  ```
- Singleton `getPageIndex()` with the same cold-start caching shape as current `loadWiki()`.
- Emotion fields tolerated as undefined.
- Existing endpoint behavior unchanged.

**Acceptance:** cold-start log `[gnosis] page index loaded — N pages` visible. `/api/ask` returns identical responses to pre-change.

### R2 — Stage 2 candidate retrieval

- New module `api/_retrieval/candidates.ts`.
- Scoring signals (weighted sum, weights tunable):
  - title token overlap (w=3)
  - body token overlap (w=1, normalized)
  - tag match (w=2)
  - alias match (w=2, entity pages only)
  - emotion_controlled overlap (w=2, when both query and page have it)
  - type filter bonus (if query intent implies entity/concept/source)
- Returns top 20 candidates with per-signal breakdown for observability.
- Synthesis still receives the full wiki bundle; candidates are logged only (shadow mode).

**Acceptance:** on 5 canonical queries, the correct primary pages appear in top 5 candidates. Scores logged for eyeball-tuning.

### R3 — Stage 3 re-rank + scoped context

- Add `openai` to `package.json`. Require `OPENAI_API_KEY` in Vercel env.
- New `api/_retrieval/rerank.ts`: `gpt-4o-mini` with JSON schema returns `{top_k: [{slug, why_selected}], rejected_reasons?}`.
- Synthesis now receives only top-K=5 pages in a scoped context — not the full wiki.
- Stage 5 system prompt restructured: schema instructions + scoped pages (each page a labeled block with `[[slug]]` header and frontmatter-lite header).

**Acceptance:** per-query token cost drops ~70–80% vs. baseline. Citation precision on canonical queries unchanged or improved (manual eval on 5 queries). Top-K logged.

### R4 — Stage 1 query understanding

- New `api/_retrieval/parse.ts`: `gpt-4o-mini` + JSON schema → `{topic, intent, emotion[], emotion_controlled[], aesthetic[], time_scope}`.
- Intent taxonomy: `lookup | synthesis | comparison | exploration | refinement`.
- Emotion controlled vocab (8 Plutchik primaries + ~20 aesthetic axes) defined in `gnosis/schema/emotions.ts` (new file).
- Parse output feeds Stage 2 scoring (adds emotion_controlled overlap).
- Parse result surfaced in response metadata (Stage 2 already fed it; now exposed to client).

**Acceptance:** emitting `event: parsed` works; changing query emotion word ("calming" → "bold") measurably changes top-K on queries where corpus has emotion tags. On current GEO corpus (no emotion tags), emotion is a no-op — verify it doesn't degrade quality.

### R5 — Synthesis upgrade

- Route by parsed intent + query length:
  - `lookup` with short query → `claude-sonnet-4-6` (fast, cheap)
  - `synthesis | comparison | exploration` → `claude-opus-4-7` with extended thinking
- Keep prompt caching on the stable system-prompt prefix.
- Emit `event: chunk` for each text delta (preserves today's streaming shape).
- Emit terminal `event: done` with usage + stop_reason.

**Acceptance:** A/B on 5 canonical queries; Opus path rated better on ≥3/5 by user. Latency acceptable (<10s to first token on Opus path).

### R6 — Multi-event SSE protocol

- Refactor `api/ask.ts` to emit all 6 event types (§3).
- Stage 1 → emit `parsed`. Stage 2 → emit `candidates`. Stage 3 → emit `top_k`. Stage 5 → emit `chunk` × N. Finally emit `done`.
- On error at any stage → emit `error` + terminate.
- Backwards-incompatible with the current widget's consumer (which only reads `{text}` frames on `data:`). Widget is removed in F4, so no widget-era compat needed by the time R6 ships.

**Acceptance:** hitting `/api/ask` with `curl -N` shows typed events in order; `done` closes the stream cleanly.

### R7 — File-back (optional)

- `POST /api/fileback` → returns a formatted markdown string (not a file write — Vercel has no writable FS).
- Body: `{ query, answer, citations: [{slug, one_liner}], parsed }`.
- Response: `{ markdown: "---\ntype: query\n...\n---\n\n# ...\n\n..." }`.
- `/chat` page exposes a "Save as wiki page" button that fetches this and offers copy-to-clipboard or download.

**Acceptance:** produced markdown can be pasted into `~/Projects/gnosis/wiki/queries/<slug>.md` and passes the schema (frontmatter, `[[citations]]`, proper sections).

---

## 5. /chat page phases (frontend)

### F1 — Route + layout skeleton

- `content/chat.md` — new page with frontmatter flagging it as the chat route:
  ```yaml
  ---
  title: Ask Gnosis
  layout: chat
  ---
  ```
- Custom `chatPageLayout` in `quartz.layout.ts` that replaces normal content rendering with a full-width `Chat.tsx` QuartzComponent.
- `quartz/components/Chat.tsx` + `quartz/components/scripts/chat-page.inline.ts` + `quartz/components/styles/chat-page.scss`.
- Layout: header + three-column grid (left: parsed query + candidates; center: messages; right: top-K + file-back). Empty state for now.

**Acceptance:** `/chat` route renders at full width with the three-column layout; no interactivity yet; nav link added to footer.

### F2 — Wire chat to /api/ask (current contract)

- Port the streaming logic from `chat.inline.ts` into `chat-page.inline.ts`.
- Send `messages` array → consume `data: {text}` frames → render.
- Reuse `renderMarkdown` and `renderInline` (wiki-link → anchor conversion).
- URL param `?q=<encoded>` seeds first message.
- `localStorage` persistence for message history (keyed by date or thread id).

**Acceptance:** `/chat?q=what+is+GEO` shows the question prefilled and streams an answer. Messages persist across reload. Widget still exists on other pages (removed in F4).

### F3 — Retrieval internals sidebar (consumes multi-event SSE, requires R6)

- Migrate from `data:` generic frames to `event: <type>` handlers.
- Left panel:
  - **Parsed query** card — shows topic, intent, emotion chips (editable in F5).
  - **Candidates** collapsible — 20 items with score bars and type badges.
- Right panel:
  - **Retrieved (top-K)** — card per page: slug, title, one-liner from re-rank, tags, click → opens `/<slug>` in new tab.
  - **Save as wiki page** button (stubbed in F3, wired in R7).
- Citation hover: hovering `[[slug]]` in the answer highlights the matching card in the right panel; clicking scrolls to it. (Citation click still navigates to the page by default.)

**Acceptance:** query "What's the difference between ChatGPT and Claude in AI search?" shows `[[chatgpt]]` and `[[claude]]` as top_k cards. Hovering citations in the streamed answer highlights the cards. Parsed-query chips appear before synthesis starts.

### F4 — Remove the widget

- Delete: `quartz/components/ChatWidget.tsx`, `quartz/components/scripts/chat.inline.ts`, `quartz/components/styles/chat.scss`.
- Remove `Component.ChatWidget()` from `quartz.layout.ts` `sharedPageComponents.afterBody`.
- Update `content/index.md`:
  - Remove "Open the chat widget (bottom-right of any page) to begin."
  - Replace with "→ [Open the chat](/chat)" linking to the new page.
- Add "Chat" link to shared footer or header.
- Update any demo-prompt suggestions to live on the `/chat` page empty state, not the widget.

**Acceptance:** no chat widget on any page. `/chat` is the sole retrieval surface. `npm run check` passes. Build succeeds.

### F5 — Polish

- File-back button wired (R7).
- Multi-thread history in localStorage (sidebar with past queries, "new thread" button).
- Mobile responsive: on narrow screens the three columns stack (messages primary, sidebars as drawers).
- Loading states per stage (skeleton cards while Stage 1/2/3 in flight).
- Error states per stage (retry button if Stage X fails).
- Parsed-query chip editing (click emotion chip → edit → re-run query).

**Acceptance:** mobile layout passable; all error paths handled gracefully; file-back produces valid copy-to-clipboard markdown.

---

## 6. Execution order & dependencies

Dependency graph:

```
R1 ──→ R2 ──→ R3 ──→ R6 ──→ F3
        │              ↑
        │              │
        ▼              │
       R4 ─────────────┘
       R5 (parallel, any time after R3)
       R7 (parallel, wires into F5)

F1 (no backend deps) ──→ F2 ──→ F3 ──→ F4 ──→ F5
```

Suggested linear order (shippable increments):

1. **R1** — page index. Zero-risk, zero behavior change.
2. **F1** — `/chat` route skeleton. Parallelizable with R1. UI-only, no backend dep.
3. **R2** — candidate retrieval (shadow mode, logged only). Still uses full-wiki synthesis.
4. **F2** — wire `/chat` to current `/api/ask`. Works against unchanged endpoint.
5. **R3** — re-rank + scoped context. First quality + cost win ships. `/chat` and widget both benefit.
6. **R4** — query understanding (Stage 1). Parse output in response metadata (not yet per-event).
7. **R6** — multi-event SSE refactor. Breaking change; widget still reads `chunk` event as its `text` field — so prep widget or do F4 around this time.
8. **F3** — retrieval internals sidebar. Consumes multi-event SSE.
9. **F4** — remove widget.
10. **R5** — synthesis model routing / Opus path.
11. **R7** — file-back endpoint.
12. **F5** — polish.

**Shippable milestones:**
- After R1+F1: page skeleton live, no behavior change.
- After R3+F2: `/chat` page works + cost down ~75%. Widget still present, unchanged UX.
- After R6+F3+F4: full USP retrieval UI live, widget gone.
- After R5+R7+F5: feature-complete for this iteration.

---

## 7. Open decisions

1. **Streaming protocol** — SSE multi-event is my recommendation (§3). Confirm before coding R6.
2. **Citation hover UX** — sidebar-card highlight sync only, or also inline tooltip with page snippet? Snippet tooltip requires a small extra payload in `top_k` (one_liner probably covers it).
3. **Message history persistence** — localStorage only (MVP) vs. server-side threads (future). Locking in localStorage-only unless you want threads from day one.
4. **When to remove the widget** — after F3 ships (so `/chat` has full UX first) or immediately after F2 (faster cleanup, but `/chat` has widget-parity UX only, not full UX)? Defaulting to "after F3."
5. **Model routing heuristic in R5** — by parsed intent (proposed), by query length, or always Opus? Defaulting to by-intent unless Opus latency is acceptable everywhere.

---

## 8. Explicit non-goals for this iteration

- No changes to existing content pages (no frontmatter backfill).
- No Obsidian plugin, browser extension, mobile app.
- No server-side user accounts, sessions, or auth.
- No analytics beyond console logs for Stage scores.
- No automated tests for the pipeline beyond smoke tests (manual eval on canonical query list).

---

## 9. Canonical query set (for manual eval across phases)

Use these to eyeball-test every phase:

1. "What's the difference between ChatGPT and Claude in AI search behavior?" (entity comparison)
2. "Why doesn't my brand-owned content show up in AI search?" (concept explanation)
3. "Show me the contradiction between Chen et al. and McKinsey on big brand bias." (contradiction surfacing)
4. "Give me a 5-bullet summary of the Generative Engine Optimization framework." (concept summary)
5. "Which AI engine is most forgiving to niche brands?" (cross-entity synthesis)

Expected top-K for each is listed in the test doc (to be created alongside R2).

---

## 10. Success criteria (end of iteration)

- `/chat` is the sole retrieval surface; widget removed.
- 6-stage pipeline ships; per-stage events visible in the UI.
- Per-query token cost dropped ≥60% vs. baseline.
- Citation precision on canonical queries ≥ baseline (human eval).
- Answer quality subjectively ≥ baseline (human eval).
- No regression on build/deploy.
