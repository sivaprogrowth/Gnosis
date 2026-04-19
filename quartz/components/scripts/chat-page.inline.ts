/**
 * Gnosis /chat page — client-side interactivity.
 *
 * Reads the same SSE stream as the widget (/api/ask) but also consumes the
 * `data: {"meta": {...}}` frames emitted by the retrieval pipeline to populate
 * the left sidebar (parsed query chips + retrieved page cards).
 *
 * Contract:
 *   data: {"text": "..."}                       → append streamed chunk
 *   data: {"meta": {"stage":"parsed",  "data":...}}   → render parsed query
 *   data: {"meta": {"stage":"candidates","data":[...]}} → logged only (optional display)
 *   data: {"meta": {"stage":"top_k",   "data":[...]}}  → render retrieved cards
 *   data: {"done":true,...}                     → finalize message
 *   data: [DONE]                                → terminal sentinel
 *
 * History persists in localStorage under `gnosis.chat.messages`.
 */

// Mark this file as an ES module so top-level declarations don't collide with
// the sibling global script `chat.inline.ts` when tsc compiles them together.
export {}

type Msg = { role: "user" | "assistant"; content: string }

type ParsedMeta = {
  topic: string
  intent: string
  entities: string[]
  emotion: string[]
  emotion_controlled: string[]
  aesthetic: string[]
  time_scope: string
}

type TopKItem = {
  slug: string
  type: string
  title: string
  why_selected: string
}

const STORAGE_KEY = "gnosis.chat.messages"
const MAX_HISTORY = 40

const STATE: { messages: Msg[]; inFlight: boolean } = {
  messages: [],
  inFlight: false,
}

// ---- storage ----

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m: any) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
  } catch {
    return []
  }
}

function saveHistory(msgs: Msg[]): void {
  try {
    const trimmed = msgs.slice(-MAX_HISTORY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // storage full or disabled — silently skip
  }
}

// ---- markdown rendering ----
//
// A small but reasonably complete renderer. Supports:
//   - ATX headings (# … ######)
//   - Fenced code blocks (```lang … ```)
//   - Blockquotes (recursive)
//   - Horizontal rules (---, ***, ___)
//   - Unordered lists (-, *, +) and ordered lists (1. 2. …) with flat items
//   - GFM pipe tables (optional alignment ignored)
//   - Paragraphs with soft line breaks → <br>
//   - Inline: [[wiki-link]], [text](url), `code`, **bold**, *italic*, __bold__,
//     _italic_, ~~strike~~
//
// Everything is HTML-escaped before markdown tags are substituted, so
// assistant content can't inject scripts.

const INLINE_CODE_PLACEHOLDER = "\uE000" // private-use area; very unlikely to collide

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderInline(src: string): string {
  // 1. Pull out inline code spans first so their contents aren't mangled by
  //    bold/italic/link rules. Restored verbatim at the end.
  const codeSpans: string[] = []
  let text = src.replace(/`+([^`][^`]*?[^`]|[^`])`+/g, (_m, inner) => {
    codeSpans.push(`<code>${escapeHtml(String(inner))}</code>`)
    return INLINE_CODE_PLACEHOLDER + (codeSpans.length - 1) + INLINE_CODE_PLACEHOLDER
  })

  // 2. Escape the rest.
  text = escapeHtml(text)

  // 3. Wiki-links: [[slug]] or [[slug|label]]
  text = text.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_m, slug, label) => {
    const cleanSlug = String(slug).replace(/^\//, "")
    const visible = label || cleanSlug.split("/").pop() || cleanSlug
    return `<a href="/${cleanSlug}" class="gnosis-chat-page-citation" data-slug="${cleanSlug}">${visible}</a>`
  })

  // 4. Standard markdown links [text](url "title"?)
  text = text.replace(
    /\[([^\]]+?)\]\(([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
    (_m, linkText, url) => {
      const safeUrl = String(url).replace(/"/g, "%22")
      const external = /^(https?:)?\/\//.test(url)
      const attrs = external ? ' target="_blank" rel="noopener"' : ""
      return `<a href="${safeUrl}"${attrs}>${linkText}</a>`
    },
  )

  // 5. Bare autolinks <http://…>
  text = text.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_m, url) => {
    return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
  })

  // 6. Strikethrough ~~…~~
  text = text.replace(/~~(.+?)~~/g, "<del>$1</del>")

  // 7. Bold: **…** and __…__  (before italic, since ** contains *)
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>")

  // 8. Italic: *…* and _…_  (avoid matching mid-word)
  text = text.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?=[^*\w]|$)/g, "$1<em>$2</em>")
  text = text.replace(/(^|[^_\w])_(?!\s)([^_\n]+?)(?<!\s)_(?=[^_\w]|$)/g, "$1<em>$2</em>")

  // 9. Soft line breaks within a paragraph → <br>
  text = text.replace(/\n/g, "<br>")

  // 10. Restore code spans.
  text = text.replace(
    new RegExp(`${INLINE_CODE_PLACEHOLDER}(\\d+)${INLINE_CODE_PLACEHOLDER}`, "g"),
    (_m, idx) => codeSpans[Number(idx)],
  )

  return text
}

// ---- block-level parsing helpers ----

const BLOCK_FENCE = /^```(\w*)\s*$/
const BLOCK_FENCE_END = /^```\s*$/
const BLOCK_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const BLOCK_HR = /^\s*(?:-\s*){3,}$|^\s*(?:\*\s*){3,}$|^\s*(?:_\s*){3,}$/
const BLOCK_BLOCKQUOTE = /^\s*>\s?/
const LIST_UNORDERED = /^(\s*)[-*+]\s+(.*)$/
const LIST_ORDERED = /^(\s*)\d+\.\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?(?:\s*\|\s*:?-+:?)+\s*\|?\s*$/

function isListLine(line: string): boolean {
  return LIST_UNORDERED.test(line) || LIST_ORDERED.test(line)
}

function renderList(lines: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul"
  const items: string[] = []
  let buf: string[] = []

  const flush = () => {
    if (buf.length) {
      items.push(`<li>${renderInline(buf.join("\n").trim())}</li>`)
      buf = []
    }
  }

  const stripper = ordered ? LIST_ORDERED : LIST_UNORDERED

  for (const line of lines) {
    const m = line.match(stripper)
    if (m) {
      flush()
      buf.push(m[2])
    } else if (line.trim()) {
      // continuation line (possibly indented)
      buf.push(line.trim())
    } else {
      // blank line inside a list — preserve as paragraph break within item
      buf.push("")
    }
  }
  flush()
  return `<${tag}>${items.join("")}</${tag}>`
}

function renderTable(lines: string[]): string {
  const parseRow = (line: string): string[] => {
    const trimmed = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "")
    return trimmed.split("|").map((c) => c.trim())
  }
  const header = parseRow(lines[0])
  const body = lines.slice(1).map(parseRow)
  const thead =
    "<thead><tr>" + header.map((c) => `<th>${renderInline(c)}</th>`).join("") + "</tr></thead>"
  const tbody =
    "<tbody>" +
    body
      .map((r) => "<tr>" + r.map((c) => `<td>${renderInline(c)}</td>`).join("") + "</tr>")
      .join("") +
    "</tbody>"
  return `<table>${thead}${tbody}</table>`
}

function renderMarkdown(src: string): string {
  // Normalize line endings; split into lines.
  const lines = src.replace(/\r\n?/g, "\n").split("\n")
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines at block boundaries.
    if (!line.trim()) {
      i++
      continue
    }

    // Fenced code block.
    const fence = line.match(BLOCK_FENCE)
    if (fence) {
      const lang = fence[1]
      const codeLines: string[] = []
      i++
      while (i < lines.length && !BLOCK_FENCE_END.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // consume closing ```
      const classAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ""
      out.push(`<pre><code${classAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`)
      continue
    }

    // ATX heading.
    const heading = line.match(BLOCK_HEADING)
    if (heading) {
      const level = heading[1].length
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule.
    if (BLOCK_HR.test(line)) {
      out.push("<hr>")
      i++
      continue
    }

    // Blockquote (greedy: consume all `> …` lines, render contents recursively).
    if (BLOCK_BLOCKQUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && (BLOCK_BLOCKQUOTE.test(lines[i]) || !lines[i].trim())) {
        if (!lines[i].trim()) {
          // blank line ends the blockquote unless followed by another `> `
          const next = lines[i + 1]
          if (!next || !BLOCK_BLOCKQUOTE.test(next)) break
          quoted.push("")
        } else {
          quoted.push(lines[i].replace(BLOCK_BLOCKQUOTE, ""))
        }
        i++
      }
      out.push(`<blockquote>${renderMarkdown(quoted.join("\n"))}</blockquote>`)
      continue
    }

    // GFM table — current line has `|` AND next line is a separator row.
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const tableLines: string[] = [line]
      i += 2 // header + separator consumed
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        tableLines.push(lines[i])
        i++
      }
      out.push(renderTable(tableLines))
      continue
    }

    // List block (unordered or ordered). Keep taking list/continuation lines
    // until a clearly-non-list line (or blank line that isn't followed by a
    // list line) breaks the block.
    if (isListLine(line)) {
      const ordered = LIST_ORDERED.test(line)
      const listLines: string[] = [line]
      i++
      while (i < lines.length) {
        const cur = lines[i]
        if (isListLine(cur)) {
          // Stop if a different list type appears (nested-list parsing is out
          // of scope for the MVP renderer; the other type becomes its own block).
          if (ordered !== LIST_ORDERED.test(cur)) break
          listLines.push(cur)
          i++
        } else if (cur.trim() && /^\s+\S/.test(cur)) {
          // indented continuation of the current item
          listLines.push(cur)
          i++
        } else if (!cur.trim()) {
          // blank: peek ahead — if next non-blank is a same-kind list line,
          // include the blank; otherwise break.
          const next = lines[i + 1]
          if (next && isListLine(next) && ordered === LIST_ORDERED.test(next)) {
            listLines.push("")
            i++
          } else {
            break
          }
        } else {
          break
        }
      }
      out.push(renderList(listLines, ordered))
      continue
    }

    // Paragraph: collect until blank line or a new block start.
    const paraLines: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
      paraLines.push(lines[i])
      i++
    }
    out.push(`<p>${renderInline(paraLines.join("\n"))}</p>`)
  }

  return out.join("")
}

function isBlockStart(lines: string[], i: number): boolean {
  const line = lines[i]
  if (BLOCK_FENCE.test(line)) return true
  if (BLOCK_HEADING.test(line)) return true
  if (BLOCK_HR.test(line)) return true
  if (BLOCK_BLOCKQUOTE.test(line)) return true
  if (isListLine(line)) return true
  if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
    return true
  }
  return false
}

// ---- DOM helpers ----

function $(sel: string, root: Document | Element = document): HTMLElement | null {
  return root.querySelector(sel) as HTMLElement | null
}

function ensureEmptyStateHidden(): void {
  const empty = $("#gnosis-chat-page-empty")
  if (empty) empty.style.display = "none"
}

function addUserMessage(content: string): HTMLElement {
  const list = $("#gnosis-chat-page-messages")
  if (!list) throw new Error("messages container not found")
  ensureEmptyStateHidden()

  const wrap = document.createElement("div")
  wrap.className = "gnosis-chat-page-msg gnosis-chat-page-msg-user"
  const bubble = document.createElement("div")
  bubble.className = "gnosis-chat-page-bubble"
  bubble.textContent = content
  wrap.appendChild(bubble)
  list.appendChild(wrap)
  list.scrollTop = list.scrollHeight
  return bubble
}

type AssistantSlot = {
  wrap: HTMLElement
  thinkingPanel: HTMLDetailsElement
  thinkingBody: HTMLElement
  thinkingSummary: HTMLElement
  bubble: HTMLElement
}

function addAssistantSlot(): AssistantSlot {
  const list = $("#gnosis-chat-page-messages")
  if (!list) throw new Error("messages container not found")
  ensureEmptyStateHidden()

  const wrap = document.createElement("div")
  wrap.className = "gnosis-chat-page-msg gnosis-chat-page-msg-assistant"

  // --- reasoning panel (hidden until first thinking chunk) ---
  const thinkingPanel = document.createElement("details")
  thinkingPanel.className = "gnosis-chat-page-thinking is-hidden"
  thinkingPanel.open = true

  const thinkingSummary = document.createElement("summary")
  thinkingSummary.className = "gnosis-chat-page-thinking-summary"
  thinkingSummary.innerHTML = `
    <span class="gnosis-chat-page-thinking-chev" aria-hidden="true">▾</span>
    <span class="gnosis-chat-page-thinking-label">Reasoning</span>
    <span class="gnosis-chat-page-thinking-dots" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
  `
  thinkingPanel.appendChild(thinkingSummary)

  const thinkingBody = document.createElement("div")
  thinkingBody.className = "gnosis-chat-page-thinking-body"
  thinkingPanel.appendChild(thinkingBody)

  // --- answer bubble with placeholder dots ---
  const bubble = document.createElement("div")
  bubble.className = "gnosis-chat-page-bubble gnosis-chat-page-streaming"
  bubble.innerHTML =
    '<span class="gnosis-chat-page-dots"><span></span><span></span><span></span></span>'

  wrap.appendChild(thinkingPanel)
  wrap.appendChild(bubble)
  list.appendChild(wrap)
  list.scrollTop = list.scrollHeight

  return { wrap, thinkingPanel, thinkingBody, thinkingSummary, bubble }
}

function addAssistantRestored(content: string): HTMLElement {
  // Restored history — no thinking panel (not persisted).
  const list = $("#gnosis-chat-page-messages")
  if (!list) throw new Error("messages container not found")
  ensureEmptyStateHidden()

  const wrap = document.createElement("div")
  wrap.className = "gnosis-chat-page-msg gnosis-chat-page-msg-assistant"
  const bubble = document.createElement("div")
  bubble.className = "gnosis-chat-page-bubble"
  bubble.innerHTML = renderMarkdown(content || "")
  wrap.appendChild(bubble)
  list.appendChild(wrap)
  list.scrollTop = list.scrollHeight
  return bubble
}

// ---- sidebar rendering ----

function renderParsed(meta: ParsedMeta): void {
  const target = $("#gnosis-chat-page-parsed-body")
  if (!target) return

  const chips: string[] = []
  chips.push(
    `<span class="gnosis-chat-page-chip gnosis-chat-page-chip-intent">${escapeHtml(meta.intent)}</span>`,
  )
  if (meta.topic) {
    chips.push(
      `<span class="gnosis-chat-page-chip gnosis-chat-page-chip-topic">${escapeHtml(meta.topic)}</span>`,
    )
  }
  for (const e of meta.entities) {
    chips.push(
      `<span class="gnosis-chat-page-chip gnosis-chat-page-chip-entity">${escapeHtml(e)}</span>`,
    )
  }
  for (const e of meta.emotion_controlled) {
    chips.push(
      `<span class="gnosis-chat-page-chip gnosis-chat-page-chip-emotion">${escapeHtml(e)}</span>`,
    )
  }
  for (const a of meta.aesthetic) {
    chips.push(
      `<span class="gnosis-chat-page-chip gnosis-chat-page-chip-aesthetic">${escapeHtml(a)}</span>`,
    )
  }

  target.innerHTML = `<div class="gnosis-chat-page-chips">${chips.join("")}</div>`
}

function renderTopK(items: TopKItem[]): void {
  const list = $("#gnosis-chat-page-retrieved-list")
  const count = $("#gnosis-chat-page-retrieved-count")
  if (!list) return

  if (count) {
    count.textContent = `${items.length} page${items.length === 1 ? "" : "s"} selected for this question`
  }

  if (items.length === 0) {
    list.innerHTML = `<li class="gnosis-chat-page-placeholder">No pages retrieved — the wiki may not cover this.</li>`
    return
  }

  list.innerHTML = items
    .map(
      (t, i) => `
<li class="gnosis-chat-page-retrieved-card" data-slug="${escapeHtml(t.slug)}">
  <a href="/${escapeHtml(t.slug)}" class="gnosis-chat-page-retrieved-link">
    <div class="gnosis-chat-page-retrieved-head">
      <span class="gnosis-chat-page-retrieved-index">${i + 1}</span>
      <span class="gnosis-chat-page-retrieved-type">${escapeHtml(t.type)}</span>
    </div>
    <div class="gnosis-chat-page-retrieved-title">${escapeHtml(t.title)}</div>
    <div class="gnosis-chat-page-retrieved-why">${escapeHtml(t.why_selected)}</div>
  </a>
</li>`,
    )
    .join("")
}

function clearSidebar(): void {
  const parsed = $("#gnosis-chat-page-parsed-body")
  if (parsed) {
    parsed.innerHTML = `<p class="gnosis-chat-page-placeholder">Parsing your question…</p>`
  }
  const list = $("#gnosis-chat-page-retrieved-list")
  if (list) list.innerHTML = ""
  const count = $("#gnosis-chat-page-retrieved-count")
  if (count) count.textContent = "Selecting pages…"
}

// ---- citation ↔ sidebar hover sync ----

function attachCitationHoverSync(root: HTMLElement): void {
  root.querySelectorAll<HTMLAnchorElement>(".gnosis-chat-page-citation").forEach((a) => {
    const slug = a.dataset.slug
    if (!slug) return
    const cardSel = `.gnosis-chat-page-retrieved-card[data-slug="${CSS.escape(slug)}"]`
    a.addEventListener("mouseenter", () => {
      document.querySelectorAll(cardSel).forEach((c) => c.classList.add("is-highlighted"))
    })
    a.addEventListener("mouseleave", () => {
      document.querySelectorAll(cardSel).forEach((c) => c.classList.remove("is-highlighted"))
    })
  })
}

// ---- streaming request ----

async function sendMessage(userText: string): Promise<void> {
  if (STATE.inFlight) return
  const text = userText.trim()
  if (!text) return

  STATE.inFlight = true
  STATE.messages.push({ role: "user", content: text })
  addUserMessage(text)
  clearSidebar()

  const input = $("#gnosis-chat-page-input") as HTMLTextAreaElement | null
  if (input) {
    input.value = ""
    input.style.height = "auto"
  }

  const slot = addAssistantSlot()

  let thinkingText = ""
  let answerText = ""
  let firstAnswerChunk = true
  let thinkingFinalized = false

  const revealThinking = () => {
    if (slot.thinkingPanel.classList.contains("is-hidden")) {
      slot.thinkingPanel.classList.remove("is-hidden")
    }
  }

  const finalizeThinking = () => {
    if (thinkingFinalized) return
    thinkingFinalized = true
    slot.thinkingPanel.classList.add("is-done")
    // auto-collapse once the answer starts; user can re-open.
    slot.thinkingPanel.open = false
    const label = slot.thinkingSummary.querySelector(".gnosis-chat-page-thinking-label")
    if (label) label.textContent = "Reasoning"
    const dots = slot.thinkingSummary.querySelector(".gnosis-chat-page-thinking-dots")
    if (dots) dots.remove()
  }

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: STATE.messages }),
    })
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "")
      slot.bubble.innerHTML = `<em>Error: ${escapeHtml(errText || res.statusText)}</em>`
      STATE.inFlight = false
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    const list = $("#gnosis-chat-page-messages")

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      for (const raw of lines) {
        if (!raw.startsWith("data:")) continue
        const payload = raw.slice(5).trim()
        if (!payload || payload === "[DONE]") continue
        try {
          const obj = JSON.parse(payload)
          if (typeof obj.thinking === "string") {
            revealThinking()
            thinkingText += obj.thinking
            slot.thinkingBody.textContent = thinkingText
            if (list) list.scrollTop = list.scrollHeight
          } else if (typeof obj.text === "string") {
            if (firstAnswerChunk) {
              slot.bubble.innerHTML = ""
              slot.bubble.classList.remove("gnosis-chat-page-streaming")
              firstAnswerChunk = false
              if (thinkingText) finalizeThinking()
            }
            answerText += obj.text
            slot.bubble.innerHTML = renderMarkdown(answerText)
            attachCitationHoverSync(slot.bubble)
            if (list) list.scrollTop = list.scrollHeight
          } else if (obj.meta) {
            const stage = obj.meta.stage
            const data = obj.meta.data
            if (stage === "parsed" && data) renderParsed(data as ParsedMeta)
            else if (stage === "top_k" && Array.isArray(data)) renderTopK(data as TopKItem[])
            // "candidates" stage is logged only for now.
          } else if (obj.error) {
            slot.bubble.innerHTML = `<em>Error: ${escapeHtml(obj.error)}</em>`
            slot.bubble.classList.remove("gnosis-chat-page-streaming")
          }
        } catch {
          // ignore unparseable keepalive frames
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    slot.bubble.innerHTML = `<em>Error: ${escapeHtml(msg)}</em>`
  } finally {
    slot.bubble.classList.remove("gnosis-chat-page-streaming")
    // If thinking streamed but no answer arrived, still mark thinking done.
    if (thinkingText && !thinkingFinalized) finalizeThinking()
    // Clean up the thinking panel if it never had any content.
    if (!thinkingText) slot.thinkingPanel.remove()

    if (answerText) {
      STATE.messages.push({ role: "assistant", content: answerText })
      saveHistory(STATE.messages)
    }
    STATE.inFlight = false
  }
}

// ---- restore history + URL-seeded query ----

function restore(): void {
  const stored = loadHistory()
  if (stored.length === 0) return
  STATE.messages = stored
  ensureEmptyStateHidden()
  for (const m of stored) {
    if (m.role === "user") {
      addUserMessage(m.content)
    } else {
      const bubble = addAssistantRestored(m.content)
      attachCitationHoverSync(bubble)
    }
  }
}

function seedFromUrl(): void {
  try {
    const url = new URL(window.location.href)
    const q = url.searchParams.get("q")
    if (q && !STATE.inFlight) {
      url.searchParams.delete("q")
      window.history.replaceState({}, "", url.toString())
      sendMessage(q)
    }
  } catch {
    // ignore
  }
}

// ---- wire up ----

function init(): void {
  const root = $("#gnosis-chat-page")
  if (!root) return

  // Idempotent: Quartz fires `nav` on SPA navigation and may re-run this.
  if ((root as HTMLElement).dataset.gnosisChatBound === "1") return
  ;(root as HTMLElement).dataset.gnosisChatBound = "1"

  restore()

  const form = $("#gnosis-chat-page-form") as HTMLFormElement | null
  const input = $("#gnosis-chat-page-input") as HTMLTextAreaElement | null

  form?.addEventListener("submit", (e) => {
    e.preventDefault()
    if (input) sendMessage(input.value)
  })

  input?.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent
    if (ke.key === "Enter" && !ke.shiftKey) {
      ke.preventDefault()
      if (input) sendMessage(input.value)
    }
  })

  input?.addEventListener("input", () => {
    if (!input) return
    input.style.height = "auto"
    input.style.height = Math.min(input.scrollHeight, 160) + "px"
  })

  root.querySelectorAll<HTMLButtonElement>(".gnosis-chat-page-suggestion").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt || btn.textContent || ""
      sendMessage(prompt)
    })
  })

  seedFromUrl()
}

document.addEventListener("nav", init)
init()
