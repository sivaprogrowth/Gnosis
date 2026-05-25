/**
 * Supabase client for Gnosis auth — uses the aioverviews Supabase project
 * (ref jqpyzkqtnzzrhemnyegk) with the service role key. Same env var names
 * as the aioverviews project so the existing creds can be reused 1:1.
 *
 * Tables consumed by auth:
 *   gnosis_otp_codes  — short-lived 6-digit codes (5min TTL)
 *   gnosis_sessions   — long-lived session rows (24h TTL)
 *
 * Both are seeded by migrations/ in this repo.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("FATAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars unset. Auth will not work.")
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
