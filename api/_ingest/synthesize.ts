/**
 * synthesize.ts — turn fetched markdown into:
 *   - sourcePage: the wiki source page (full markdown with frontmatter)
 *   - takeaways:  3-7 short bullets shown on the user confirm screen
 *   - surfacedEntities: candidates the compoundingFilter step decides on
 *
 * Mirrors the §4.1 ingest workflow from vault CLAUDE.md but as a single
 * structured Anthropic call. Uses Sonnet 4.6 (faster + cheaper than Opus
 * for structured extraction; the actual conceptual work happens in the
 * passages we *quote*, not in the model's own reasoning).
 *
 * Output structure is enforced via `tool_use` so we never have to parse
 * free-form JSON.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Tool } from "@anthropic-ai/sdk/resources/messages"
import { logAiUsage } from "../_lib/aiUsage.js"

const MODEL_ID = "claude-sonnet-4-6"
const MAX_TOKENS = 8000
// Sonnet 4.6 handles 200k input fine, but the *output* slows down on very
// large outputs. Cap the article body at this many chars before sending so
// the model never spends >45s on generation. ~40k chars ≈ 10k tokens of input.
const MAX_INPUT_CHARS = 40_000

export interface SynthesizedEntity {
  name: string
  /** "person" | "concept" | "framework" | "company" | "book" | "tool" */
  type: string
  /** Two-sentence reason this was surfaced and why a wiki page might cite it */
  context: string
}

export interface SynthesizeResult {
  /** Full markdown with YAML frontmatter, ready to write to wiki/sources/<slug>.md */
  sourcePage: string
  /** Short, declarative bullets for the user confirmation screen */
  takeaways: string[]
  /** Candidates for compounding filter to decide on */
  surfacedEntities: SynthesizedEntity[]
  /** Kebab-case slug for wiki/sources/<slug>.md */
  suggestedSlug: string
}

export interface ExistingPageSummary {
  slug: string
  type: string
  title: string
}

export interface SynthesizeInput {
  /** Full fetched-article markdown */
  rawMarkdown: string
  /** Title from fetchUrl */
  title: string
  /** Domain from fetchUrl, e.g. "paulgraham.com" */
  sourceDomain: string
  /** Original URL */
  sourceUrl: string
  /** Byline from fetchUrl, if any */
  byline: string | null
  /** Published time from fetchUrl, if any (ISO-ish string) */
  publishedTime: string | null
  /**
   * Existing wiki pages, passed so the LLM can use exact slugs for concepts
   * the wiki already knows about. Without this the model invents slugs
   * (e.g. [[the-brand-age]] instead of the existing [[brand-age]]),
   * producing broken links and missing Quartz backlinks.
   */
  existingPages?: ExistingPageSummary[]
}

const SYSTEM_PROMPT = `You are the synthesis pass in a personal LLM wiki ingest pipeline.

You are given a raw article (fetched from the web) and must produce:

1. A wiki source page (\`sourcePage\`) — full markdown with YAML frontmatter — that follows the vault convention:
   - Frontmatter: type=source, source_type=article, title, authors (array), published, source_url, accessed, tags (array of 2-5 short kebab-case tags)
   - ## Abstract — ONE paragraph (3-5 sentences) summarising what the article argues and why it matters
   - ## TL;DR — 2-3 declarative bullets
   - ## Key claims — 4-8 bullets, each a single declarative claim grounded in the article
   - ## Key passages — 3-6 verbatim quotes (use > blockquote) that carry the heaviest weight
   - ## Related — bullet list of [[wiki-link]] candidates (just bare names; the compounding step decides which become pages)

2. \`takeaways\` — 3-7 short, declarative bullets for a user confirmation screen. These are NOT the same as Key claims; they're shorter, punchier, and answer "should I bother ingesting this?". One line each.

3. \`surfacedEntities\` — for every person, framework, concept, company, book, or tool mentioned in the article that *could* warrant its own wiki page, include {name, type, context}. Be generous; the next pipeline step filters down to ones that meet the compounding bar.

4. \`suggestedSlug\` — kebab-case, ASCII-only, max 60 chars. Used as the filename.

**Interlinking rule — critical:**
You will receive a list of pages that ALREADY exist in the wiki. Whenever you mention any of those concepts/people/companies/tools in the source page body (Abstract, TL;DR, Key claims, Key passages, Related) AND in surfacedEntities[].name, you MUST use the existing page's exact slug as the [[wiki-link]] target. For example, if "Brand Age" already exists at \`concepts/brand-age\`, write \`[[brand-age]]\` or \`[[brand-age|the brand age]]\` — NEVER \`[[the-brand-age]]\` or \`[[Brand Age]]\`. Wrong slugs produce broken links and miss the wiki's compounding effect. If a concept is NOT in the existing list, invent a new kebab-case slug as before.

Voice: third-person, neutral. Preserve technical terms verbatim. Don't editorialise. Never invent facts; if the article doesn't give you the published date or author, leave the frontmatter value as null.`

/**
 * Normalise whatever the model put in `takeaways` into a string array.
 *
 * The model intermittently returns the bullets as a single newline-delimited
 * string ("- foo\n- bar") instead of an array. The schema says `type: array`
 * with `minItems: 3`, but that's advisory: this tool isn't `strict` (Sonnet
 * 4.6 doesn't support strict tool use), and array-length constraints aren't
 * enforced even when it is. The previous code discarded any non-array, which
 * is how two ingests on 2026-08-09 committed source pages with zero takeaways
 * and pushed empty bullet lists to the life-system Learning feed — data the
 * model had actually produced. Salvage it instead of dropping it.
 */
function coerceTakeaways(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim() !== "")
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    // Sometimes it's a JSON array that just didn't get parsed as one.
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return coerceTakeaways(parsed)
      } catch {
        /* fall through to line splitting */
      }
    }
    // Otherwise it's a bullet list: strip "- ", "* ", "• ", "1. ", "2) ".
    const lines = trimmed
      .split("\n")
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)
    if (lines.length) {
      console.warn(
        `[synthesize] takeaways came back as a string; recovered ${lines.length} bullets`,
      )
      return lines
    }
  }

  console.warn(`[synthesize] takeaways unusable (got ${typeof value}); using []`)
  return []
}

export async function synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server")

  const client = new Anthropic({ apiKey })

  const truncated = input.rawMarkdown.length > MAX_INPUT_CHARS
  const body = truncated
    ? input.rawMarkdown.slice(0, MAX_INPUT_CHARS) +
      `\n\n[... article truncated at ${MAX_INPUT_CHARS} chars; full length was ${input.rawMarkdown.length}]`
    : input.rawMarkdown

  // Existing pages list for the interlinking rule. Compact format: slug — title (type).
  // Cap at ~150 pages to keep prompt size sane; if the wiki grows past that we
  // can switch to filtering by relevance/recency.
  const existingPages = input.existingPages ?? []
  const pageList = existingPages
    .slice(0, 150)
    .map((p) => `- [[${p.slug}]] — ${p.title} (${p.type})`)
    .join("\n")
  const pageListSection = pageList
    ? `--- EXISTING WIKI PAGES (use these exact slugs in [[wiki-link]] markers) ---\n\n${pageList}\n\n--- END EXISTING WIKI PAGES ---\n\n`
    : ""

  const userPrompt = `Source URL: ${input.sourceUrl}
Source domain: ${input.sourceDomain}
Fetched title: ${input.title}
Fetched byline: ${input.byline ?? "(none)"}
Fetched published: ${input.publishedTime ?? "(none)"}
Article length: ${input.rawMarkdown.length} chars${truncated ? " (truncated for synth)" : ""}

${pageListSection}--- RAW ARTICLE MARKDOWN BELOW ---

${body}

--- END RAW ARTICLE ---

Produce the structured output now via the synthesize_source tool.`

  const tool: Tool = {
    name: "synthesize_source",
    description: "Emit the structured synthesis of a fetched article for the wiki ingest pipeline.",
    input_schema: {
      type: "object",
      properties: {
        sourcePage: {
          type: "string",
          description:
            "Full markdown with YAML frontmatter, ready to write to wiki/sources/<slug>.md",
        },
        takeaways: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 7,
          description: "Short declarative bullets for the user confirmation screen.",
        },
        surfacedEntities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: {
                type: "string",
                enum: ["person", "concept", "framework", "company", "book", "tool"],
              },
              context: { type: "string" },
            },
            required: ["name", "type", "context"],
          },
        },
        suggestedSlug: {
          type: "string",
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          description: "Kebab-case ASCII slug, max 60 chars.",
        },
      },
      required: ["sourcePage", "takeaways", "surfacedEntities", "suggestedSlug"],
    },
  }

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: "synthesize_source" },
    messages: [{ role: "user", content: userPrompt }],
  })
  await logAiUsage("ingest:synthesize", MODEL_ID, response.usage)

  const block = response.content.find((b) => b.type === "tool_use")
  if (!block || block.type !== "tool_use") {
    throw new Error(
      `Synthesize call returned no tool_use block (stop_reason=${response.stop_reason})`,
    )
  }

  const result = block.input as SynthesizeResult
  if (!result.sourcePage || !result.suggestedSlug) {
    throw new Error(
      "Synthesize tool_use returned malformed result (missing sourcePage or suggestedSlug)",
    )
  }
  // Anthropic's tool_use schema enforcement is best-effort — sometimes the
  // model returns scalar or undefined where the schema says array. Normalise
  // here so downstream code can assume the shapes are correct.
  result.takeaways = coerceTakeaways(result.takeaways)
  if (!Array.isArray(result.surfacedEntities)) {
    console.warn(
      `[synthesize] surfacedEntities wasn't an array (got ${typeof result.surfacedEntities}); coercing to []`,
    )
    result.surfacedEntities = []
  }
  // Hard cap on slug length even if the model ignored the schema hint
  result.suggestedSlug = result.suggestedSlug.slice(0, 60)
  return result
}
