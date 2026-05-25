/**
 * POST /api/auth/verify-otp
 *
 * Body: { email: string, code: string }
 * Response (success): sets HttpOnly `session` cookie + returns { success: true, email }
 * Response (error):   { error: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createSessionToken, isAllowed } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const rawEmail = body?.email
    const code = body?.code

    if (!rawEmail || !code) {
      res.status(400).json({ error: "Email and code are required" })
      return
    }

    const email = String(rawEmail).toLowerCase().trim()

    // Defence in depth: re-check allowlist (send-otp already gates, but a
    // non-allowlisted email shouldn't be able to verify a leaked code either).
    if (!isAllowed(email)) {
      res.status(401).json({ error: "Invalid or expired code" })
      return
    }

    // Find unused, unexpired OTP matching this email + code
    const { data: otpRow, error: fetchError } = await supabase
      .from("gnosis_otp_codes")
      .select("id")
      .eq("email", email)
      .eq("code", String(code))
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otpRow) {
      res.status(401).json({ error: "Invalid or expired code" })
      return
    }

    // Mark code as used (single-use)
    await supabase.from("gnosis_otp_codes").update({ used: true }).eq("id", otpRow.id)

    // Create session row
    const { data: session, error: sessionError } = await supabase
      .from("gnosis_sessions")
      .insert({
        email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single()

    if (sessionError || !session) {
      console.error("session insert error:", sessionError)
      res.status(500).json({ error: "Failed to create session" })
      return
    }

    const token = createSessionToken(email, session.id)

    res.setHeader(
      "Set-Cookie",
      [
        `session=${token}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${24 * 60 * 60}`,
      ].join("; "),
    )

    res.status(200).json({ success: true, email })
  } catch (error: any) {
    console.error("verify-otp error:", error)
    res.status(500).json({ error: "Verification failed" })
  }
}
