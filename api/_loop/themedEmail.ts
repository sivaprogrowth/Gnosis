/**
 * themedEmail.ts — Sunday-evening themed connection email.
 *
 * Modelled on Readwise's "Themed Connections" Saturday email: one theme,
 * a one-line summary, then quote blocks with attribution. Ours is drawn from
 * the week's OWN loop output — the synthesis brief and resurface pages filed
 * that morning — so the theme reflects what this week's reading actually
 * collided on, not a random sample.
 *
 * Fallback ladder (the email should arrive every Sunday, honestly labelled):
 *   1. synthesis + resurface pages filed this ISO week (the normal case);
 *   2. neither filed (skipped week) → theme the week's raw Readwise
 *      highlights directly, Readwise-style;
 *   3. no highlights either → a short "quiet week" note, no fabrication.
 *
 * Sends via the same Brevo SMTP transport as the login OTP (verified sender
 * "Gnosis" <siva@progrowth.services>).
 */

import nodemailer from "nodemailer"
import { getFileContent } from "../_ingest/githubPush.js"
import { fetchHighlights } from "./readwise.js"
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

const SYSTEM = `You are composing a weekly "Themed Connection" email for a personal knowledge system (Gnosis), in the style of Readwise's Themed Connections: pick ONE theme that runs through the provided material, then curate 3-5 quotes that develop it.

Input is the week's synthesis brief and resurface pages (or, in fallback mode, raw reading highlights). Prefer the collision/tension material — the theme is strongest where sources rub against each other.

Return STRICT JSON (no markdown fence, no commentary):
{
  "emoji": "one emoji fitting the theme",
  "title": "Theme Name In Title Case, 2-4 words",
  "summary": "one sentence: what this theme examines, in the style 'examines choosing a narrow, risky path shaped by deep values to face fear and claim lasting freedom' — no leading capital, it follows 'Today's review, X,'",
  "quotes": [
    {
      "quote": "verbatim quote or highlight text (trim with … if over ~60 words)",
      "source": "Book/Article title",
      "author": "Author name or null",
      "slug": "wiki page slug like sources/foo or concepts/bar when the quote maps to a provided [[slug]], else null",
      "hook": "one line: why this matters for the user's current work, ONLY when the input material states it (resurface hooks); else null"
    }
  ]
}

Rules: quotes verbatim — punctuation belongs to the original. 3-5 quotes, ordered so they build the theme. Use only slugs present in the input. Never fabricate a hook the material doesn't support.`

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

  let mode: "loop" | "highlights" | "quiet" = "loop"
  let material = [
    synthesis ? `--- SYNTHESIS BRIEF ---\n${synthesis}` : "",
    ...resurfaceBodies.map((b, i) => `--- RESURFACE PAGE ${i + 1} ---\n${b}`),
  ]
    .filter(Boolean)
    .join("\n\n")

  if (!material) {
    // No brief this week — theme recent highlights instead, the way Readwise
    // Themed Connections draws on the whole library rather than one week.
    const highlights = await fetchHighlights({
      since: new Date(now.getTime() - 90 * 86_400_000).toISOString(),
    })
    const recent = highlights
      .sort((a, b) => Date.parse(b.highlightedAt ?? "0") - Date.parse(a.highlightedAt ?? "0"))
      .slice(0, 80)
    if (recent.length >= 3) {
      mode = "highlights"
      material = `--- RECENT HIGHLIGHTS, LAST 90 DAYS (no synthesis brief was filed this week — find the strongest theme ACROSS these) ---\n${JSON.stringify(
        recent.map((h) => ({
          text: h.text.slice(0, 600),
          note: h.note,
          title: h.title,
          author: h.author,
        })),
        null,
        1,
      )}`
    } else {
      mode = "quiet"
    }
  }

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
    ? renderHtml(theme, dateLabel, week, mode, synthesis !== null)
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
      `🪽 **Hermes** — themed connection email sent: **${theme ? `${theme.emoji} ${theme.title}` : "quiet week"}** (${theme?.quotes.length ?? 0} quotes, from ${mode === "loop" ? "this week's synthesis/resurface" : mode === "highlights" ? "raw highlights — no brief this week" : "nothing"}).`,
    ],
    filed: [],
  }
}

// --------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function renderHtml(
  t: ThemeJson,
  dateLabel: string,
  week: string,
  mode: string,
  hasSynthesis: boolean,
): string {
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

  const sourceNote =
    mode === "highlights"
      ? `<p style="font-size:13px;color:#6b7280;">No synthesis brief was filed this week, so this theme is drawn from your recent highlights.</p>`
      : ""
  const briefLink = hasSynthesis
    ? `<p style="font-size:14px;"><a href="${SITE}/queries/synthesis-${week}" style="color:#2563eb;text-decoration:none;">Read the full synthesis brief →</a></p>`
    : ""

  return `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 2px;color:#111827;">gnosis.</p>
  <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${dateLabel}</p>

  <p style="font-size:15px;line-height:1.6;color:#1f2937;">Hey Siva, welcome to your Gnosis Themed Connection. Each Sunday evening, this email pulls one theme out of the week's synthesis and resurface work — the thread your own reading was pulling on.</p>

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
