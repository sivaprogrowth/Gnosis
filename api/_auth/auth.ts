/**
 * Auth helpers — JWT session tokens + allowlist for the Gnosis private site.
 *
 * Mirrors the pattern from progrowth-ai-overview's lib/auth.ts but with a
 * single-email allowlist (just siva@progrowth.services) instead of a
 * business-email gate. Same JWT shape (HMAC-SHA256, base64url, 24h TTL).
 *
 * Shared between Node-runtime API functions (this file's exports use Node's
 * `crypto` module). The middleware uses Web Crypto API equivalents — see
 * verifyTokenWebCrypto() below for the edge-runtime variant.
 */

import crypto from "node:crypto"

const JWT_SECRET = process.env.JWT_SECRET || ""
if (!JWT_SECRET) {
  // Surface loudly at module load on the server — never in client code.
  console.error("FATAL: JWT_SECRET env var is unset. Auth will not work.")
}

// Single-email allowlist for Gnosis. Add to this set to let more people in.
export const ALLOWED_EMAILS = new Set<string>([
  "siva@progrowth.services",
])

export function isAllowed(email: string): boolean {
  return ALLOWED_EMAILS.has(email.toLowerCase().trim())
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

interface SessionPayload {
  email: string
  sessionId: string
  exp: number
}

export function createSessionToken(email: string, sessionId: string): string {
  const payload: SessionPayload = {
    email,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url")
  return `${data}.${sig}`
}

/** Verify a session token using Node's `crypto`. Returns the payload if valid, null otherwise. */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split(".")
    if (!data || !sig) return null
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url")
    if (sig !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
