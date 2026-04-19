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

// ---- markdown-ish rendering (matches widget behavior) ----

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderInline(s: string): string {
  let out = escapeHtml(s)
  // [[slug]] → citation anchor
  out = out.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_m, slug, label) => {
    const cleanSlug = String(slug).replace(/^\//, "")
    const href = "/" + cleanSlug
    const text = label || cleanSlug.split("/").pop()
    return `<a href="${href}" class="gnosis-chat-page-citation" data-slug="${escapeHtml(cleanSlug)}">${escapeHtml(String(text))}</a>`
  })
  out = out.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_m, text, url) => {
    const safeUrl = String(url).replace(/"/g, "%22")
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${text}</a>`
  })
  out = out.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/`([^`]+?)`/g, "<code>$1</code>")
  out = out.replace(/(^|[\s(])\*([^\s*][^*]*?)\*(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>")
  return out
}

function renderMarkdown(s: string): string {
  const blocks = s.split(/\n\n+/)
  return blocks
    .map((block) => {
      const lines = block.split("\n")
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines
          .map((l) => l.replace(/^\s*[-*]\s+/, ""))
          .map((l) => `<li>${renderInline(l)}</li>`)
          .join("")
        return `<ul>${items}</ul>`
      }
      if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
        const items = lines
          .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
          .map((l) => `<li>${renderInline(l)}</li>`)
          .join("")
        return `<ol>${items}</ol>`
      }
      return `<p>${renderInline(lines.join(" "))}</p>`
    })
    .join("")
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
