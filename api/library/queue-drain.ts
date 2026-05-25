/**
 * POST /api/library/queue-drain
 *
 * Body: { readwise_book_id: number, book_title: string, book_author?: string,
 *         requested_class?: 'A' | 'B' | 'C' | 'D' }
 *
 * Inserts a row into public.gnosis_drain_queue with status='pending'.
 * Idempotent on (readwise_book_id) WHERE status='pending' — re-posting the
 * same book while a pending row exists returns 200 with already=true rather
 * than 409, so the UI's optimistic state matches the server's.
 *
 * The vault-side "drain Readwise" workflow (CLAUDE.md §4.6) reads this table
 * to pick up books queued from the web UI.
 *
 * 401 if the request isn't authenticated.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifySessionToken } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"

const ALLOWED_CLASSES = new Set(["A", "B", "C", "D"])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const cookieHeader = req.headers.cookie || ""
  const sessionMatch = cookieHeader.match(/(?:^|; )session=([^;]+)/)
  const sessionToken = sessionMatch?.[1]
  const session = sessionToken ? verifySessionToken(sessionToken) : null
  if (!session) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const body = (req.body || {}) as Record<string, unknown>
  const readwiseBookId = Number(body.readwise_book_id)
  const bookTitle = typeof body.book_title === "string" ? body.book_title.trim() : ""
  const bookAuthor = typeof body.book_author === "string" ? body.book_author.trim() : null
  const requestedClass =
    typeof body.requested_class === "string" && ALLOWED_CLASSES.has(body.requested_class)
      ? body.requested_class
      : "A"

  if (!Number.isFinite(readwiseBookId) || readwiseBookId <= 0) {
    res.status(400).json({ error: "readwise_book_id (positive number) required" })
    return
  }
  if (!bookTitle) {
    res.status(400).json({ error: "book_title required" })
    return
  }

  try {
    // Check for existing pending row first — idempotent path
    const { data: existing, error: selErr } = await supabase
      .from("gnosis_drain_queue")
      .select("id, requested_class, requested_at")
      .eq("readwise_book_id", readwiseBookId)
      .eq("status", "pending")
      .maybeSingle()

    if (selErr) throw selErr

    if (existing) {
      res.status(200).json({
        already: true,
        id: existing.id,
        requested_class: existing.requested_class,
        requested_at: existing.requested_at,
      })
      return
    }

    const { data: inserted, error: insErr } = await supabase
      .from("gnosis_drain_queue")
      .insert({
        readwise_book_id: readwiseBookId,
        book_title: bookTitle,
        book_author: bookAuthor,
        requested_class: requestedClass,
        requested_by: session.email,
      })
      .select("id, requested_class, requested_at")
      .single()

    if (insErr) throw insErr

    res.status(201).json({
      already: false,
      id: inserted.id,
      requested_class: inserted.requested_class,
      requested_at: inserted.requested_at,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[library/queue-drain] error:", msg)
    res.status(500).json({ error: msg })
  }
}
