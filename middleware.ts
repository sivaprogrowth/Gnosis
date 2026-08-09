/**
 * Edge Middleware — gates the entire gnosis-main site behind a session cookie.
 *
 * Runs at Vercel's edge before any static asset or API function. Unauthenticated
 * HTML requests are redirected to /login. Static-asset and login-page requests
 * pass through (so the login form's CSS/JS can load). API auth routes also pass
 * through (otherwise the user couldn't log in).
 *
 * Session verification uses Web Crypto API (the only crypto available on Edge).
 * Logic is equivalent to verifySessionToken() in api/_auth/auth.ts but ported
 * to the edge runtime.
 */

const JWT_SECRET = process.env.JWT_SECRET || ""

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const [data, sig] = token.split(".")
    if (!data || !sig) return false

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const expectedSigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(data))
    const expectedSig = base64UrlFromBytes(new Uint8Array(expectedSigBytes))
    if (sig !== expectedSig) return false

    const payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")))
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { pathname } = url

  // -------- Allowlist: requests that bypass auth entirely --------

  // 1. Auth endpoints — the login flow itself
  if (pathname.startsWith("/api/auth/")) {
    return fetch(req)
  }

  // 1b. Vercel cron endpoints — let through so the handler can verify the
  //     bearer token against CRON_SECRET. Without this the cookie-based
  //     session check below would 401 every scheduled invocation.
  if (pathname === "/api/ingest/job" && url.searchParams.get("cron")) {
    return fetch(req)
  }

  // 1c. Readwise Reader webhook — external POSTs carry their own 32-char secret
  //     in the body, which the handler verifies. Bypass the cookie session
  //     check (Readwise has no session) and let the handler authenticate.
  if (pathname === "/api/ingest/reader-webhook") {
    return fetch(req)
  }

  // 1d. Life-system bidirectional endpoints — external POSTs from
  //     progrowth-life-system carry a Bearer LIFE_SYSTEM_SECRET. Verify it at
  //     the edge: valid → pass through to the handler; invalid → 401 directly
  //     (returning fetch(req) for a request the handler would 401 trips the
  //     edge runtime, so we reject here instead of re-fetching).
  if (pathname === "/api/ingest/from-life" || pathname === "/api/search") {
    const auth = req.headers.get("authorization") || ""
    const m = auth.match(/^Bearer\s+(.+)$/i)
    const expected = (process.env.LIFE_SYSTEM_SECRET || "").trim()
    if (expected && m && m[1].trim() === expected) {
      return fetch(req)
    }
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Login page (and its assets — handled by extension check below)
  if (pathname === "/login" || pathname === "/login.html" || pathname === "/login/") {
    return fetch(req)
  }

  // 3. Static assets — anything with a file extension other than .html.
  //    The login page references CSS/JS/fonts/images by hash; we let those
  //    through so the unauthenticated login UI renders correctly.
  if (/\.(css|js|mjs|map|json|xml|txt|ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2|ttf|otf|eot)$/i.test(pathname)) {
    return fetch(req)
  }

  // 4. Robots / sitemap — public crawler endpoints stay public so search engines
  //    can at least see the site exists (they'll see the redirect, but not 401).
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return fetch(req)
  }

  // -------- Session check for everything else --------

  const cookieHeader = req.headers.get("cookie") || ""
  const sessionMatch = cookieHeader.match(/(?:^|; )session=([^;]+)/)
  const token = sessionMatch?.[1]

  if (token && (await verifySessionToken(token))) {
    return fetch(req)
  }

  // No / invalid session.

  // API requests (non-auth): return 401 JSON so fetch() callers see a clean error
  if (pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Page requests: redirect to /login (preserve the original path as ?next=)
  const loginUrl = new URL("/login", url.origin)
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname + url.search)
  }
  return Response.redirect(loginUrl.toString(), 302)
}

export const config = {
  // api/loop and api/resurface are EXCLUDED from the middleware entirely:
  // both do their own Bearer auth, and their synchronous LLM work runs up to
  // 300s — far past the edge middleware's ~25s cap, which 504s any request
  // proxied through `return fetch(req)`. Bypassing the matcher sends the
  // request straight to the function, whose own maxDuration applies.
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/loop|api/resurface).*)",
}
