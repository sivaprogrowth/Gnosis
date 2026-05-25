/**
 * extractPdf.ts — turn a PDF buffer into markdown for the synthesize step.
 *
 * Uses `unpdf` (pure JS, no native bindings, works in Vercel serverless).
 * jsdom-style libraries would have crashed at function init time the same way
 * jsdom did for fetchUrl; unpdf was chosen specifically because it ships a
 * pre-built PDFium-free path.
 *
 * Scope: text extraction only. Scanned PDFs that need OCR are explicitly
 * out-of-scope for v1 — we surface a clear error rather than silently
 * returning an empty document.
 */

import { extractText, getDocumentProxy, getMeta } from "unpdf"

export interface ExtractedPdf {
  /** Plain text concatenated across pages. Light markdown formatting. */
  markdown: string
  /** From PDF /Info Title, falling back to the filename without extension */
  title: string
  /** From PDF /Info Author, if present */
  author: string | null
  pageCount: number
  wordCount: number
}

const MIN_TEXT_CHARS = 200 // Below this we treat the PDF as scanned / image-only

export async function extractPdf(
  bytes: Uint8Array,
  filename: string,
): Promise<ExtractedPdf> {
  if (bytes.byteLength === 0) {
    throw new Error("Empty PDF buffer")
  }

  // unpdf wants a PDFJS document — get one from the raw bytes
  let pdf
  try {
    pdf = await getDocumentProxy(bytes)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Could not parse PDF: ${msg}`)
  }

  const meta = await getMeta(pdf).catch(() => ({ info: {} as Record<string, unknown> }))
  const info = (meta.info ?? {}) as Record<string, unknown>
  const metaTitle = typeof info.Title === "string" ? info.Title.trim() : ""
  const metaAuthor = typeof info.Author === "string" ? info.Author.trim() : ""

  // extractText with mergePages: true gives one continuous string; with false
  // it returns string[] per page so we can rebuild light heading structure.
  const { totalPages, text: pages } = await extractText(pdf, { mergePages: false })

  const pageCount = totalPages
  const blocks: string[] = []
  for (let i = 0; i < pages.length; i++) {
    const pageText = (pages[i] || "").replace(/[ \t]+/g, " ").trim()
    if (!pageText) continue
    // Mark page boundaries so the LLM can preserve location context if useful
    blocks.push(`<!-- page ${i + 1} -->\n\n${pageText}`)
  }
  const raw = blocks.join("\n\n").trim()
  if (raw.length < MIN_TEXT_CHARS) {
    throw new Error(
      `PDF appears to be scanned or image-only (extracted only ${raw.length} chars across ${pageCount} pages). OCR is out of scope for v1.`,
    )
  }

  // Heuristic light formatting: collapse repeated blank lines, preserve
  // paragraph breaks. Don't try anything cleverer — the synth step handles
  // the actual structuring.
  const markdown = raw.replace(/\n{3,}/g, "\n\n")
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  const fileBaseName = filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim()
  const title = metaTitle || fileBaseName || "Untitled PDF"

  return {
    markdown,
    title,
    author: metaAuthor || null,
    pageCount,
    wordCount,
  }
}
