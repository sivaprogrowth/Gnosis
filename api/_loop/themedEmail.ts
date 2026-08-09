/**
 * themedEmail.ts — Sunday-evening themed connection email.
 *
 * Modelled on Readwise's "Themed Connections" Saturday email: one theme,
 * a one-line summary, then quote blocks with attribution — but drawn from the
 * GNOSIS ARTICLE CORPUS, not Readwise books. The primary material every week
 * is the wiki's ingested source pages (their TL;DR / Key claims / Key
 * passages — the Key passages are verbatim quotes from the original
 * articles), plus whatever the loop filed this week (synthesis brief,
 * resurface pages) to bias the theme toward what this week's reading was
 * pulling on. Previously sent themes are passed in so consecutive Sundays
 * don't repeat a theme.
 *
 * Sends via the same Brevo SMTP transport as the login OTP (verified sender
 * "Gnosis" <siva@progrowth.services>).
 */

import nodemailer from "nodemailer"
import { getFileContent } from "../_ingest/githubPush.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { loopLLM } from "./llm.js"
import { isoWeekLabel } from "./wiki.js"
import { recordRun, lastRun } from "./state.js"
import type { TaskResult } from "./synthesis.js"

const TO_EMAIL = "siva@progrowth.services"
const SITE = "https://gnosis.progrowth.services"

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER || "",
    pass: process.env.BREVO_SMTP_PASS || "",
  },
})

const SYSTEM = `You are composing the weekly "Themed Connection" email for Gnosis, the user's personal wiki of INGESTED ARTICLES. Your job: find ONE non-obvious theme that runs across SEVERAL different articles in the corpus, then curate 4-6 quotes that develop it.

You receive:
- THE ARTICLE CORPUS: every source page's TL;DR, Key claims, and Key passages. The Key passages are verbatim quotes from the original articles — your quote pool.
- THIS WEEK'S LOOP OUTPUT (when present): the synthesis brief and resurface pages filed this morning. When present, let them steer the theme toward what this week's reading collided on.
- PREVIOUSLY SENT THEMES: do not repeat these or near-synonyms of them.

What makes a GOOD theme (in order of preference):
1. A tension — two articles that disagree, or an idea one article celebrates and another undercuts. Name the friction in the summary.
2. A cross-domain thread — the same conceptual move appearing in articles from unrelated domains (e.g. an AI-labor-market paper and a startup essay both arguing that scale advantages are inverting).
3. A build — several articles that each add a layer to one idea.
A BAD theme restates one article's own thesis with quotes only from that article, or picks something so broad ("AI is changing work") that any quote fits. Quotes must span at least 3 DIFFERENT articles.

Return STRICT JSON (no markdown fence, no commentary):
{
  "emoji": "one emoji fitting the theme",
  "title": "Theme Name In Title Case, 2-5 words",
  "summary": "one-to-two sentences: what this theme examines and where the articles pull against each other. MUST start with a lowercase verb (examines/traces/asks/follows...) because it renders after 'This week's theme, X,' — e.g. 'examines how brand behaves when the buyer is a model; Graham argues..., the agent research finds...'",
  "quotes": [
    {
      "quote": "verbatim quote from a Key passages section (trim with … if over ~70 words)",
      "source": "Article title",
      "author": "Author or publication, or null",
      "slug": "the article's slug exactly as given, e.g. sources/foo",
      "hook": "one line connecting THIS quote to the theme's argument — what it adds or contradicts; when a resurface page supplied a why-this-matters line for the user's current work, prefer that"
    }
  ]
}

Rules: quotes verbatim — punctuation belongs to the original; never quote a TL;DR bullet as if it were article text (Key passages only). 4-6 quotes across ≥3 articles, ordered so they build an argument, tension first when there is one. Use only slugs present in the corpus. Every hook must say something specific; delete a quote before writing a generic hook for it.`

interface ThemeJson {
  emoji: string
  title: string
  summary: string
  quotes: Array<{
    quote: string
    source: string
    author: string | null
    slug: string | null
    hook: string | null
  }>
}

export async function runThemedEmail(opts: { dry?: boolean } = {}): Promise<TaskResult> {
  const now = new Date()
  const week = isoWeekLabel(now)

  // Idempotence: one themed email per ISO week.
  const prev = await lastRun("themed_email", week)
  if (prev) return { digests: [], filed: [] }

  // --- Gather this week's loop output -----------------------------------
  const synthesisPath = `wiki/queries/synthesis-${week}.md`
  const synthesis = await getFileContent(synthesisPath)

  // Resurface pages filed in the last 7 days, via the run log.
  const { supabase } = await import("../_auth/supabase.js")
  const { data: resurfaceRuns } = await supabase
    .from("gnosis_loop_runs")
    .select("filed_to")
    .eq("kind", "resurface")
    .not("filed_to", "is", null)
    .gte("created_at", new Date(now.getTime() - 7 * 86_400_000).toISOString())
  const resurfaceBodies: string[] = []
  for (const r of resurfaceRuns ?? []) {
    const body = r.filed_to ? await getFileContent(r.filed_to) : null
    if (body) resurfaceBodies.push(body)
  }

  // --- The article corpus: every ingested source page's distilled sections.
  // Key passages are verbatim article quotes — the email's quote pool.
  const index = getPageIndex()
  const articles = index.pages
    .filter((p) => p.slug.startsWith("sources/"))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      tldr: extractSection(p.body, "TL;DR"),
      claims: extractSection(p.body, "Key claims"),
      passages: extractSection(p.body, "Key passages"),
    }))
    // Pages with no distilled sections (LinkedIn profiles, hand-made stubs)
    // have nothing quotable — leave them out.
    .filter((a) => a.passages || a.claims)

  const mode: "articles" | "quiet" = articles.length >= 3 ? "articles" : "quiet"

  // Previously sent themes, so Sundays don't repeat.
  const { data: pastRuns } = await supabase
    .from("gnosis_loop_runs")
    .select("detail")
    .eq("kind", "themed_email")
    .order("created_at", { ascending: false })
    .limit(12)
  const pastThemes = (pastRuns ?? [])
    .map((r) => (r.detail as { title?: string } | null)?.title)
    .filter(Boolean) as string[]

  const material = [
    synthesis
      ? `--- THIS WEEK'S SYNTHESIS BRIEF (steer the theme toward this) ---\n${synthesis}`
      : "",
    ...resurfaceBodies.map((b, i) => `--- THIS WEEK'S RESURFACE PAGE ${i + 1} ---\n${b}`),
    `--- THE ARTICLE CORPUS (${articles.length} ingested articles) ---\n${articles
      .map(
        (a) =>
          `### [[${a.slug}]] ${a.title}\nTL;DR: ${a.tldr ?? "(none)"}\nKey claims: ${a.claims ?? "(none)"}\nKey passages:\n${a.passages ?? "(none)"}`,
      )
      .join("\n\n")}`,
    pastThemes.length
      ? `--- PREVIOUSLY SENT THEMES (do not repeat) ---\n${pastThemes.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  // --- Compose ------------------------------------------------------------
  let theme: ThemeJson | null = null
  if (mode !== "quiet") {
    const raw = await loopLLM({
      callSite: "loop:themed_email",
      system: SYSTEM,
      user: `Week: ${week}\n\n${material}\n\nReturn the JSON now.`,
      maxTokens: 3000,
    })
    try {
      theme = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) as ThemeJson
    } catch {
      throw new Error(`themed_email: model returned unparseable JSON: ${raw.slice(0, 120)}`)
    }
    if (!theme.title || !Array.isArray(theme.quotes) || theme.quotes.length === 0) {
      throw new Error("themed_email: theme JSON missing title/quotes")
    }
  }

  const dateLabel = `${String(now.getUTCMonth() + 1).padStart(2, "0")}.${String(now.getUTCDate()).padStart(2, "0")}.${String(now.getUTCFullYear()).slice(2)}`
  const subject = theme
    ? `${theme.emoji} ${theme.title}: Your Gnosis Themed Connection`
    : `Gnosis — a quiet week (${week})`
  const html = theme
    ? renderHtml(theme, dateLabel, week, synthesis !== null)
    : renderQuietHtml(dateLabel, week)

  if (opts.dry) {
    return {
      digests: [
        `🪽 **Hermes** — themed email (dry): "${subject}" — ${theme?.quotes.length ?? 0} quotes, mode=${mode}`,
      ],
      filed: [],
    }
  }

  // --- Send ---------------------------------------------------------------
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    throw new Error("themed_email: BREVO_SMTP_USER/PASS not set")
  }
  await transporter.sendMail({
    from: '"Gnosis" <siva@progrowth.services>',
    to: TO_EMAIL,
    subject,
    html,
  })
  await recordRun("themed_email", week, null, {
    mode,
    quotes: theme?.quotes.length ?? 0,
    title: theme?.title ?? null,
  })

  return {
    digests: [
      `🪽 **Hermes** — themed connection email sent: **${theme ? `${theme.emoji} ${theme.title}` : "quiet week"}** (${theme?.quotes.length ?? 0} quotes across the article corpus${synthesis ? ", steered by this week's synthesis" : ""}).`,
    ],
    filed: [],
  }
}

/** Body of a `## <heading>` section, or null. */
function extractSection(body: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const m = body.match(new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`))
  const text = m?.[1]?.trim()
  return text ? text.slice(0, 2200) : null
}

// --------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function renderHtml(t: ThemeJson, dateLabel: string, week: string, hasSynthesis: boolean): string {
  const quoteBlocks = t.quotes
    .map((q) => {
      const attribution = q.author ? `${esc(q.source)} by ${esc(q.author)}` : esc(q.source)
      const link = q.slug
        ? `<a href="${SITE}/${q.slug}" style="color:#2563eb;text-decoration:none;font-size:13px;">Open in Gnosis →</a>`
        : ""
      const hook = q.hook
        ? `<p style="margin:8px 0 0;font-size:13px;color:#374151;"><strong>Why this matters:</strong> ${esc(q.hook)}</p>`
        : ""
      return `
      <div style="margin:0 0 28px;">
        <p style="margin:0 0 6px;font-weight:600;font-size:15px;color:#111827;">${attribution}</p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">${esc(q.quote)}</p>
        ${hook}
        <p style="margin:8px 0 0;">${link}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 28px;">`
    })
    .join("\n")

  const sourceNote = hasSynthesis
    ? ""
    : `<p style="font-size:13px;color:#6b7280;">No synthesis brief was filed this week, so this theme is drawn from the full article corpus.</p>`
  const briefLink = hasSynthesis
    ? `<p style="font-size:14px;"><a href="${SITE}/queries/synthesis-${week}" style="color:#2563eb;text-decoration:none;">Read the full synthesis brief →</a></p>`
    : ""

  return `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 2px;color:#111827;">gnosis.</p>
  <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${dateLabel}</p>

  <p style="font-size:15px;line-height:1.6;color:#1f2937;">Hey Siva, welcome to your Gnosis Themed Connection. Each Sunday evening, this email finds one thread running through the articles in your wiki — steered by the week's synthesis when there is one.</p>

  <p style="font-size:15px;line-height:1.6;color:#1f2937;">This week's theme, <strong>${esc(t.emoji)} ${esc(t.title)}</strong>, ${esc(t.summary)}</p>
  ${sourceNote}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 28px;">

  ${quoteBlocks}

  ${briefLink}
  <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Gnosis learning loop · themed connection · ${week}</p>
</div>`
}

function renderQuietHtml(dateLabel: string, week: string): string {
  return `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 2px;color:#111827;">gnosis.</p>
  <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${dateLabel}</p>
  <p style="font-size:15px;line-height:1.6;color:#1f2937;">Hey Siva — a quiet reading week (${week}): no synthesis was filed and fewer than a handful of highlights came in, so there's no honest theme to draw. The absence is data; next week's connection will be richer for whatever you read now.</p>
  <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Gnosis learning loop · themed connection · ${week}</p>
</div>`
}
