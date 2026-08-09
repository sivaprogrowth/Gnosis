/**
 * themedEmail.ts — Sunday-evening themed connection email.
 *
 * The prompt is Siva's editorial synthesis-loop spec (2026-08-09): the model
 * works an internal loop — evidence ledger → ≥6 candidate themes → scored
 * verification with a deletion test (every article must be NECESSARY, not
 * merely relevant) → repair passes → drafted essay → line-by-line audit —
 * and returns a Subject / Preheader / Email / Sources markdown document.
 * If no theme survives verification it declares INSUFFICIENT SYNTHESIS
 * rather than manufacturing one; we relay that honestly instead of emailing.
 *
 * Material: the Gnosis ARTICLE CORPUS (every source page's TL;DR / Key
 * claims / Key passages + ingestion date), with the week's synthesis brief
 * and resurface pages included when filed, and past themes passed in so
 * editions don't repeat.
 *
 * Sends via the same Brevo SMTP transport as the login OTP (verified sender
 * "Gnosis" <siva@progrowth.services>).
 */

import nodemailer from "nodemailer"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { toHtml } from "hast-util-to-html"
import { getFileContent } from "../_ingest/githubPush.js"
import { getPageIndex } from "../_retrieval/pageIndex.js"
import { supabase } from "../_auth/supabase.js"
import { loopLLM } from "./llm.js"
import { isoDate, isoWeekLabel } from "./wiki.js"
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

/**
 * Siva's synthesis-loop prompt, verbatim (2026-08-09). {{vars}} are filled at
 * run time by fillTemplate(). Do not tune wording here without asking — the
 * spec is his.
 */
const PROMPT_TEMPLATE = `## Objective

Produce one memorable weekly email that discovers and explains ONE non-obvious theme connecting several articles in Gnosis.

The email must create new understanding through synthesis. It must not read like a roundup, a list of summaries, or a restatement of one article's thesis.

## Run context

Current date: {{current_date}}
Research window: {{research_window}}
Audience: {{audience}}
Editorial voice: {{voice}}
Target length: {{target_words}}
Previous editions or themes to avoid repeating: {{previous_editions}}

You have read-only access to the Gnosis corpus.

Use only facts, arguments, and quotations that can be traced to articles in Gnosis. Never invent a quotation, source, title, author, URL, or connection.

## Definition of a strong theme

Find ONE theme using this priority order:

1. Tension
   Two or more articles disagree, expose a tradeoff, or cause an idea celebrated in one article to look incomplete in another.

2. Cross-domain pattern
   Articles from apparently unrelated fields use the same conceptual move, encounter the same constraint, or reveal the same underlying mechanism.

3. Cumulative build
   Each article contributes a distinct layer to an explanation that no single article could provide alone.

Reject a theme when:

- It is primarily the thesis of one article.
- It is so broad that almost any article could support it.
- The articles merely share a topic or keyword.
- Removing all but one article leaves the argument essentially unchanged.
- The connection depends on speculation unsupported by the sources.
- It resembles a theme recently used in a previous edition.

Bad themes include generic claims such as:

- "AI is changing work."
- "Trust is important."
- "Technology has benefits and risks."
- "We need to adapt to change."

A good theme should be expressible as a specific, contestable sentence.

## The synthesis loop

Work through the following loop internally. Do not expose scratch work, candidate lists, scores, or internal reasoning in the final response.

### Pass 1: Build an evidence ledger

Search the relevant Gnosis corpus and record, for each promising article:

- title
- author
- publication or ingestion date
- URL or Gnosis identifier
- domain
- central claim
- mechanism or causal explanation
- important tension, limit, or implication
- one or two exact quotations worth preserving

Distinguish clearly between what the source states and what you infer from it.

### Pass 2: Generate candidate themes

Generate at least six candidate themes.

Each candidate must:

- connect at least three distinct articles;
- identify what each article uniquely contributes;
- explain why the connection is surprising or useful;
- state the theme as a precise, contestable claim;
- use more than shared vocabulary as evidence.

Prefer articles from different domains when the connection remains defensible.

### Pass 3: Verify and select

Score every candidate from 0-5 on:

- Non-obviousness
- Specificity
- Strength of evidence
- Necessity of multiple articles
- Explanatory value
- Freshness relative to previous editions

A candidate is eligible only if:

- it scores at least 24/30;
- no category scores below 3;
- at least three articles materially support it;
- every major claim can be traced to evidence;
- it passes the deletion test.

Deletion test:

Remove each article from the proposed synthesis in turn. If removing an article does not weaken, complicate, or advance the argument, that article is ornamental. Replace it or remove it. The final email must still use at least three necessary articles.

Genericness test:

Ask whether the theme could describe dozens of unrelated articles without changing its wording. If yes, make the causal mechanism, contradiction, or boundary condition more specific.

### Pass 4: Repair or search again

If no candidate passes, return to the corpus and search for:

- counterexamples;
- competing explanations;
- repeated mechanisms expressed with different vocabulary;
- an article that complicates the strongest candidate;
- older articles that give the current material historical context.

Repeat candidate generation and verification up to three times.

If no defensible theme passes after three loops, do not manufacture one. Output:

INSUFFICIENT SYNTHESIS: No theme supported by at least three necessary Gnosis articles passed the evidence and specificity checks.

Then briefly state what evidence was missing.

### Pass 5: Draft the email

Build the email as an argument, not a catalogue.

Use this narrative shape:

1. Subject line
   Specific and intriguing; no clickbait; ideally under 55 characters.

2. Preheader
   Adds information rather than repeating the subject; under 100 characters.

3. Opening observation
   Begin with a concrete contradiction, surprising pattern, or question. Do not begin with "This week" or a summary of the articles.

4. Central thesis
   State the selected theme clearly within the opening section.

5. Three or four movements
   Each movement should:
   - introduce evidence from a different article;
   - explain that article's distinct contribution;
   - connect it to the preceding movement;
   - advance, complicate, or limit the central thesis.

6. Synthesis
   Explain what becomes visible only when these articles are read together.

7. Practical implication
   End with one useful question, decision rule, experiment, or change in perspective for the reader. Avoid generic inspiration.

8. Sources
   List every cited article with title, author, and Gnosis URL or identifier.

## Quotations and hooks

Use quotations from at least three different articles.

Every quotation must:

- be copied exactly from its source;
- be attributed to the correct article and author;
- contribute evidence that cannot be replaced by a generic sentence;
- advance, challenge, or sharpen the argument.

Before every quotation, write a specific hook explaining why that quotation matters at that exact point in the argument.

A hook must identify the concrete idea, mechanism, contradiction, or consequence the reader should notice.

Bad hook:

"Another article makes a similar point."

Good hook:

"The constraint appears again in medicine, but here speed does not merely reduce quality—it changes which evidence practitioners are able to notice."

If the only available hook is generic, delete the quotation.

Do not stitch together separate passages as one quotation. Mark paraphrases as paraphrases rather than placing them inside quotation marks.

## Final verification loop

Audit the completed draft line by line.

Confirm that:

- exactly one central theme governs the email;
- at least three distinct articles are necessary to the argument;
- quotes span at least three articles;
- every quotation and attribution matches the source;
- every factual claim is supported by Gnosis;
- synthesis is clearly distinguishable from source claims;
- transitions explain relationships rather than merely changing topics;
- no paragraph summarizes an article without advancing the synthesis;
- no hook is generic;
- the conclusion follows from the evidence;
- the email stays within the requested length;
- the output contains no internal notes, scores, or unverifiable claims.

If any check fails, revise the draft and run the audit again. Perform no more than two draft-revision loops.

Stop only when every verification check passes or the insufficient-synthesis condition is reached.

## Output format

Return only:

# Subject
...

# Preheader
...

# Email
...

# Sources
- [Article title] — Author — Gnosis URL or identifier`

function fillTemplate(vars: Record<string, string>): string {
  return PROMPT_TEMPLATE.replace(/\{\{(\w+)[^}]*\}\}/g, (_, key: string) => vars[key] ?? "")
}

export async function runThemedEmail(opts: { dry?: boolean } = {}): Promise<TaskResult> {
  const now = new Date()
  const week = isoWeekLabel(now)

  // Idempotence: one themed email per ISO week.
  const prev = await lastRun("themed_email", week)
  if (prev) return { digests: [], filed: [] }

  // --- This week's loop output (steers the theme when present) ------------
  const synthesis = await getFileContent(`wiki/queries/synthesis-${week}.md`)
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

  // --- The article corpus, with ingestion dates ---------------------------
  const { data: jobs } = await supabase
    .from("gnosis_ingest_jobs")
    .select("surfaced_entities, created_at")
    .eq("status", "done")
  const ingestedAt = new Map<string, string>()
  for (const j of jobs ?? []) {
    const slug = (j.surfaced_entities as { suggestedSlug?: string } | null)?.suggestedSlug
    if (slug && !ingestedAt.has(slug)) ingestedAt.set(slug, String(j.created_at).slice(0, 10))
  }

  const index = getPageIndex()
  const articles = index.pages
    .filter((p) => p.slug.startsWith("sources/"))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      ingested: ingestedAt.get(p.slug.replace(/^sources\//, "")) ?? null,
      tldr: extractSection(p.body, "TL;DR"),
      claims: extractSection(p.body, "Key claims"),
      passages: extractSection(p.body, "Key passages"),
    }))
    // Pages with no distilled sections (LinkedIn profiles, stubs) have
    // nothing quotable — leave them out.
    .filter((a) => a.passages || a.claims)

  if (articles.length < 3) {
    return {
      digests: [
        `🪽 **Hermes** — themed email skipped: only ${articles.length} quotable articles in the corpus.`,
      ],
      filed: [],
    }
  }

  // Past themes, so editions don't repeat.
  const { data: pastRuns } = await supabase
    .from("gnosis_loop_runs")
    .select("detail")
    .eq("kind", "themed_email")
    .order("created_at", { ascending: false })
    .limit(12)
  const pastThemes = (pastRuns ?? [])
    .map((r) => (r.detail as { title?: string } | null)?.title)
    .filter(Boolean) as string[]

  const system = fillTemplate({
    current_date: isoDate(now),
    research_window:
      "articles added during the last 7 days as the primary material, with older Gnosis articles allowed as supporting context (ingestion dates are given per article)",
    audience:
      "Siva Cotipalli — founder of ProGrowth (AI marketing for financial services) and ProElevate; reads across AI, marketing, startups, economics, and older philosophical traditions; wants connections he would not have made himself",
    voice:
      "clear, direct, intellectually honest; concrete over abstract; no hype, no filler, no generic inspiration",
    target_words: "700-1,000 words",
    previous_editions: pastThemes.length ? pastThemes.join("; ") : "none provided",
  })

  const user = `The Gnosis corpus is provided below — treat it as your read-only corpus. Each article gives its Gnosis identifier ([[sources/...]]), title, ingestion date, TL;DR, Key claims, and Key passages (verbatim quotes from the original article — your only legitimate quotation pool).

${synthesis ? `--- THIS WEEK'S SYNTHESIS BRIEF (filed this morning; a strong signal for where this week's reading collided) ---\n${synthesis}\n\n` : ""}${resurfaceBodies.map((b, i) => `--- THIS WEEK'S RESURFACE PAGE ${i + 1} ---\n${b}\n\n`).join("")}--- THE ARTICLE CORPUS (${articles.length} articles) ---

${articles
  .map(
    (a) =>
      `### [[${a.slug}]] ${a.title}${a.ingested ? ` (ingested ${a.ingested})` : ""}\nTL;DR: ${a.tldr ?? "(none)"}\nKey claims: ${a.claims ?? "(none)"}\nKey passages:\n${a.passages ?? "(none)"}`,
  )
  .join("\n\n")}

Run the synthesis loop and return the output document now.`

  const raw = await loopLLM({
    callSite: "loop:themed_email",
    system,
    user,
    maxTokens: 24_000, // internal multi-pass reasoning + the essay
  })

  if (process.env.GNOSIS_LOOP_DUMP) {
    const { writeFileSync } = await import("node:fs")
    writeFileSync(process.env.GNOSIS_LOOP_DUMP + ".raw", raw)
  }

  // --- INSUFFICIENT SYNTHESIS: relay honestly, send nothing ---------------
  if (/INSUFFICIENT SYNTHESIS/i.test(raw.slice(0, 400))) {
    if (!opts.dry) await recordRun("themed_email", week, null, { mode: "insufficient" })
    return {
      digests: [
        `🪽 **Hermes** — themed email withheld this week (${week}): the synthesis verifier found no theme supported by at least three necessary articles.\n\n${raw.slice(0, 500)}`,
      ],
      filed: [],
    }
  }

  // --- Parse the output document ------------------------------------------
  const subject = extractDocSection(raw, "Subject")
  const preheader = extractDocSection(raw, "Preheader")
  const emailMd = extractDocSection(raw, "Email")
  const sourcesMd = extractDocSection(raw, "Sources")
  if (!subject || !emailMd) {
    throw new Error(`themed_email: output missing Subject/Email sections: ${raw.slice(0, 150)}`)
  }

  const html = renderEmailHtml({
    preheader: preheader ?? "",
    emailMd,
    sourcesMd: sourcesMd ?? "",
    dateLabel: isoDate(now),
    week,
  })

  if (opts.dry) {
    // Surface the parsed pieces so a dry run is actually reviewable.
    if (process.env.GNOSIS_LOOP_DUMP) {
      const { writeFileSync } = await import("node:fs")
      writeFileSync(
        process.env.GNOSIS_LOOP_DUMP,
        `SUBJECT: ${subject}\nPREHEADER: ${preheader}\n\n${emailMd}\n\n--- SOURCES ---\n${sourcesMd}`,
      )
    }
    return {
      digests: [
        `🪽 **Hermes** — themed email (dry): "${subject}" — ${countWords(emailMd)} words, ${(sourcesMd?.match(/^- /gm) ?? []).length} sources.`,
      ],
      filed: [],
    }
  }

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
    mode: "synthesis-loop",
    title: subject,
    words: countWords(emailMd),
  })

  return {
    digests: [
      `🪽 **Hermes** — themed connection email sent: **${subject}** (${countWords(emailMd)} words, ${(sourcesMd?.match(/^- /gm) ?? []).length} sources).`,
    ],
    filed: [],
  }
}

// --------------------------------------------------------------------------

/** Body of a wiki-page `## <heading>` section, or null. */
function extractSection(body: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const m = body.match(new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`))
  const text = m?.[1]?.trim()
  return text ? text.slice(0, 2200) : null
}

/**
 * Section of the model's output document under a top-level `# <name>`.
 * Terminates only at the NEXT KNOWN document header — the Email section may
 * legitimately contain its own `# `/`## ` headings, so stopping at any `#`
 * would truncate the essay at its first movement.
 */
function extractDocSection(doc: string, name: string): string | null {
  // No `m` flag: with it, `$` matches every line end and the lazy capture
  // stops at the first newline (the bug that truncated essays to one
  // paragraph). Anchor the header with (?:^|\n) instead.
  const m = doc.match(
    new RegExp(
      `(?:^|\\n)#\\s+${name}\\s*\\n([\\s\\S]*?)(?=\\n#\\s+(?:Subject|Preheader|Email|Sources)\\s*\\n|$)`,
    ),
  )
  const text = m?.[1]?.trim()
  return text || null
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

/** Markdown → HTML via the repo's existing unified/remark/hast chain. */
function markdownToHtml(md: string): string {
  const processor = unified().use(remarkParse).use(remarkRehype)
  const tree = processor.runSync(processor.parse(md))
  return toHtml(tree)
}

/**
 * Inline-style the generated HTML for email clients (Gmail strips <style>
 * blocks in enough contexts that inline is the only reliable path), and
 * linkify Gnosis identifiers so "sources/foo" opens the wiki page.
 */
function inlineStyles(html: string): string {
  const styles: Record<string, string> = {
    p: "margin:0 0 16px;font-size:15px;line-height:1.65;color:#1f2937;",
    h1: "font-size:19px;font-weight:700;margin:26px 0 10px;color:#111827;",
    h2: "font-size:17px;font-weight:700;margin:26px 0 10px;color:#111827;",
    h3: "font-size:15px;font-weight:600;margin:22px 0 8px;color:#111827;",
    blockquote:
      "margin:0 0 16px;padding:2px 0 2px 16px;border-left:3px solid #d1d5db;color:#374151;font-size:15px;line-height:1.6;",
    ul: "margin:0 0 16px;padding-left:22px;",
    ol: "margin:0 0 16px;padding-left:22px;",
    li: "margin:0 0 6px;font-size:15px;line-height:1.6;color:#1f2937;",
    a: "color:#2563eb;text-decoration:none;",
    hr: "border:none;border-top:1px solid #e5e7eb;margin:24px 0;",
    em: "",
    strong: "color:#111827;",
  }
  let out = html
  for (const [tag, style] of Object.entries(styles)) {
    if (style) out = out.replaceAll(`<${tag}>`, `<${tag} style="${style}">`)
  }
  // Linkify bare Gnosis identifiers (sources/foo, concepts/bar ...) that
  // aren't already inside a link.
  out = out.replace(
    /(?<!href="[^"]*)\b((?:sources|concepts|companies|people|entities|queries)\/[a-z0-9][a-z0-9-]*)/g,
    `<a href="${SITE}/$1" style="color:#2563eb;text-decoration:none;">$1</a>`,
  )
  return out
}

function renderEmailHtml(args: {
  preheader: string
  emailMd: string
  sourcesMd: string
  dateLabel: string
  week: string
}): string {
  const bodyHtml = inlineStyles(markdownToHtml(args.emailMd))
  // Strip wiki-link brackets — the identifiers get linkified in inlineStyles,
  // so literal [[ ]] around them is just noise in an email client.
  const sourcesHtml = args.sourcesMd
    ? inlineStyles(markdownToHtml(args.sourcesMd.replace(/\[\[|\]\]/g, "")))
    : ""

  return `
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(args.preheader)}</div>
<div style="max-width:620px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 2px;color:#111827;">gnosis.</p>
  <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${args.dateLabel}</p>

  ${bodyHtml}

  ${sourcesHtml ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;"><p style="font-size:13px;font-weight:600;color:#6b7280;margin:0 0 8px;">Sources</p>${sourcesHtml}` : ""}

  <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Gnosis learning loop · themed connection · ${args.week}</p>
</div>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
