/**
 * POST /api/auth/send-otp
 *
 * Body: { email: string }
 * Response (success): { success: true }
 * Response (error):   { error: string }
 *
 * Generates a 6-digit OTP, stores it in gnosis_otp_codes with a 5-minute TTL,
 * and sends it via Brevo SMTP to the requesting email. Only emails in
 * ALLOWED_EMAILS are accepted; unknown emails return a generic "Failed to
 * send" so the allowlist isn't enumerable from the outside.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import nodemailer from "nodemailer"
import { generateOTP, isAllowed } from "../_auth/auth.js"
import { supabase } from "../_auth/supabase.js"

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER || "",
    pass: process.env.BREVO_SMTP_PASS || "",
  },
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const rawEmail = body?.email

    if (!rawEmail || typeof rawEmail !== "string") {
      res.status(400).json({ error: "Email is required" })
      return
    }

    const email = rawEmail.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" })
      return
    }

    // Allowlist check. Return generic "Failed to send" message so the
    // allowlist isn't enumerable — same response shape as a real failure.
    if (!isAllowed(email)) {
      // Still return success: true so an attacker can't distinguish
      // allowlisted from non-allowlisted emails by response.
      res.status(200).json({ success: true })
      return
    }

    const code = generateOTP()

    const { error: dbError } = await supabase.from("gnosis_otp_codes").insert({
      email,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    if (dbError) {
      console.error("OTP insert error:", dbError)
      res.status(500).json({ error: "Failed to generate code" })
      return
    }

    await transporter.sendMail({
      from: '"Gnosis" <siva@progrowth.services>',
      to: email,
      subject: `Your Gnosis login code: ${code}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto;">
          <h2 style="color: #284b63; margin-bottom: .5rem;">Gnosis</h2>
          <p style="color: #4e4e4e;">Your one-time login code:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 20px 0; font-family: 'IBM Plex Mono', monospace;">
            ${code}
          </div>
          <p style="color: #6b6b6b; font-size: 14px;">This code expires in 5 minutes.</p>
        </div>
      `,
    })

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("send-otp error:", error)
    res.status(500).json({ error: "Failed to send code" })
  }
}
