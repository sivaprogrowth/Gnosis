/**
 * POST /api/ask — Gnosis wiki chat endpoint.
 *
 * Reads all markdown in content/ at cold start, bundles it into a cached
 * system prompt, and streams Claude's response as Server-Sent Events.
 *
 * Request body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
 * Response:     text/event-stream with `data: {"text": "..."}\n\n`
 *               and a terminal `data: [DONE]\n\n`.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const MODEL = "claude-sonnet-4-6"
const MAX_TOKENS = 1024

// ---- Wiki loading (cold-start, cached at module level) ----

function readAllMarkdown(dir: string): Array<{ path: string; body: string }> {
  const out: Array<{ path: string; body: string }> = []
  const walk = (d: string, rel = "") => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      const r = rel ? `${rel}/${name}` : name
      const s = statSync(full)
      if (s.isDirectory()) walk(full, r)
      else if (name.endsWith(".md")) {
        out.push({ path: r, body: readFileSync(full, "utf-8") })
      }
    }
  }
  walk(dir)
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

function stripFrontmatter(md: string): string {
  if (!md.startsWith("---\n")) return md
  const end = md.indexOf("\n---\n", 4)
  return end === -1 ? md : md.slice(end + 5)
}

let WIKI_BUNDLE: string | null = null

function loadWiki(): string {
  if (WIKI_BUNDLE) return WIKI_BUNDLE
  const contentDir = join(process.cwd(), "content")
  const files = readAllMarkdown(contentDir)
  const parts = files.map(
    (f) =>
      `\n\n===== PAGE: ${f.path.replace(/\.md$/, "")} =====\n\n${stripFrontmatter(f.body).trim()}`,
  )
  WIKI_BUNDLE = parts.join("\n")
  return WIKI_BUNDLE
}

// ---- System prompt ----

const SYSTEM_INSTRUCTIONS = `You are the Gnosis wiki assistant.

Your only knowledge is the wiki content provided below. Follow these rules strictly:

1. **Answer using ONLY the wiki content below.** Do not use external knowledge.
2. **Cite every claim** by referencing the page it came from. Use the format [[slug]] where slug is the page path without .md (e.g. [[entities/chatgpt]], [[concepts/earned-media-bias]]).
3. **If the answer is not in the wiki, say:** "I don't see that covered in this wiki yet." Do not speculate.
4. **Be concise.** Prefer 3–6 sentences unless asked for depth. Use bullets when listing >2 items.
5. **Cross-reference.** When an answer touches multiple pages, cite each — the value is in the connections.
6. **Preserve contradictions.** If the wiki flags a contradiction (e.g. between two sources), surface it rather than picking a side.

Here is the full wiki content:

----- WIKI START -----`

const SYSTEM_TAIL = `
----- WIKI END -----

Answer the user's question using only the above content. Cite every claim with [[slug]] links.`

// ---- Handler ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server" })
    return
  }

  const body = (req.body || {}) as { messages?: Array<{ role: string; content: string }> }
  const messages = (body.messages || []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  )
  if (messages.length === 0) {
    res.status(400).json({ error: "messages required" })
    return
  }

  const wiki = loadWiki()
  const client = new Anthropic({ apiKey })

  // SSE response
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    // @ts-expect-error node typings don't always expose flush
    res.flush?.()
  }

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: SYSTEM_INSTRUCTIONS },
        {
          type: "text",
          text: wiki,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: SYSTEM_TAIL },
      ],
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    })

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send({ text: event.delta.text })
      }
    }

    const final = await stream.finalMessage()
    send({
      done: true,
      usage: final.usage,
      stop_reason: final.stop_reason,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    send({ error: msg })
  } finally {
    res.write("data: [DONE]\n\n")
    res.end()
  }
}
