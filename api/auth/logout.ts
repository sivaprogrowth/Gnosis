/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Doesn't delete the session row server-side
 * (the JWT-based cookie is the source of truth; once it's gone, the
 * session is unreachable from this browser regardless of DB state).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader(
    "Set-Cookie",
    [
      "session=",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=0",
    ].join("; "),
  )
  res.status(200).json({ success: true })
}
