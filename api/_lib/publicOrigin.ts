import type { VercelRequest } from "@vercel/node"

/**
 * Resolve the origin to use when this app fetches *itself* (cron self-chaining).
 *
 * Why this exists: Deployment Protection on this project is set to
 * `all_except_custom_domains`, so every `*.vercel.app` deployment URL sits
 * behind Vercel SSO and only `gnosis.progrowth.services` is exempt. Vercel
 * cron invokes the DEPLOYMENT host — that parent request is trusted and gets
 * through, but a child request built from `req.headers.host` points back at
 * the protected host, where the edge 302s it to `vercel.com/sso-api` *before*
 * middleware runs. A valid `Authorization: Bearer ${CRON_SECRET}` does not
 * help, because nothing ever reaches the handler that would check it.
 *
 * `fetch` does not reject on a 302, so the caller's `.catch` never fires and
 * the wave silently does nothing. That is what capped the clippings cron at a
 * single wave (~2 clippings) per day while the job rows all read `done`.
 *
 * Set PUBLIC_ORIGIN to the custom domain in production. The request-derived
 * fallback keeps local dev and preview deployments working unchanged.
 */
export function resolvePublicOrigin(req: VercelRequest): string {
  const configured = (process.env.PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "")
  if (configured) return configured

  const proto = (req.headers["x-forwarded-proto"] as string) || "https"
  const host = req.headers.host
  return `${proto}://${host}`
}
