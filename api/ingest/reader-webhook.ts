/**
 * POST /api/ingest/reader-webhook — realtime Reader → Gnosis ingest.
 *
 * Receives Readwise *Custom Webhook* events (https://readwise.io/webhook). The
 * moment the user adds the `gnosis` tag to a Reader document, Readwise fires a
 * `reader.document.tags_updated` event here and we ingest immediately, instead
 * of waiting for the daily cron (which stays on as a backstop).
 *
 * Readwise webhook contract (docs.readwise.io/readwise/docs/webhooks):
 *   - Method: POST, JSON body = the full Reader document, plus `event_type`
 *     and a 32-char `secret` (the webhook's auto-generated secret, sent IN the
 *     body — there is no separate signature header). `content` is null in the
 *     payload, so we re-fetch the doc by id to get usable content.
 *   - Auth: compare body.secret to READER_WEBHOOK_SECRET.
 *   - Test step: Readwise pings the endpoint BEFORE the webhook (and its
 *     secret) exists and requires a 200 to allow creation. So we always return
 *     200 quickly, but only *ingest* when the secret matches a real Reader
 *     document event. Unverified/test pings are acknowledged and ignored.
 *
 * Synth+commit takes ~90s, far longer than a webhook sender will wait, so the
 * actual work runs in waitUntil() after the 200 — same pattern as the cron.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { waitUntil } from "@vercel/functions"
import { ingestReaderWebhookDoc } from "../_ingest/pipeline.js"

export const config = {
  maxDuration: 300,
}

interface ReaderWebhookBody {
  id?: string
  event_type?: string
  secret?: string
  title?: string
  tags?: Record<string, unknown> | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  // Vercel parses JSON bodies, but be defensive if a raw string/Buffer arrives.
  let body: ReaderWebhookBody
  try {
    const raw = req.body
    body =
      (typeof raw === "string"
        ? JSON.parse(raw)
        : Buffer.isBuffer(raw)
          ? JSON.parse(raw.toString("utf8"))
          : raw) || {}
  } catch {
    // Malformed body — still 200 so a test ping doesn't block webhook creation.
    res.status(200).json({ ok: true, ignored: "unparseable body" })
    return
  }

  const expected = (process.env.READER_WEBHOOK_SECRET || "").trim()
  const provided = typeof body.secret === "string" ? body.secret.trim() : ""
  const eventType = typeof body.event_type === "string" ? body.event_type : ""
  const docId = typeof body.id === "string" ? body.id : ""

  // Acknowledge anything we won't act on with 200 (test pings, unverified
  // callers, highlight events, missing id). Never reveal whether the secret
  // matched; just don't ingest.
  const verified = expected.length > 0 && provided === expected
  const isReaderDocEvent = eventType.startsWith("reader.")
  if (!verified || !isReaderDocEvent || !docId) {
    res.status(200).json({
      ok: true,
      ingested: false,
      reason: !verified
        ? "unverified or test ping"
        : !isReaderDocEvent
          ? `ignored event ${eventType || "(none)"}`
          : "missing document id",
    })
    return
  }

  // Verified Reader document event — ingest in the background, respond now.
  waitUntil(
    ingestReaderWebhookDoc(docId)
      .then((result) =>
        console.log(
          `[webhook reader] ${eventType} ${docId}: ${result.status}${result.reason ? ` (${result.reason})` : ""}${result.commitSha ? ` commit ${result.commitSha.slice(0, 7)}` : ""}`,
        ),
      )
      .catch((err) =>
        console.error(
          `[webhook reader] ${docId} failed:`,
          err instanceof Error ? err.message : err,
        ),
      ),
  )

  res.status(200).json({ ok: true, received: true, id: docId, event: eventType })
}
