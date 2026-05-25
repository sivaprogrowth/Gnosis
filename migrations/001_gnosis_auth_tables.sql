-- Gnosis auth schema — OTP codes + sessions tables.
-- Idempotent (CREATE TABLE IF NOT EXISTS + indexes IF NOT EXISTS).
--
-- Applied to the shared Supabase project (ref jqpyzkqtnzzrhemnyegk, aka the
-- "Progrowth AI Overviews" project) — gnosis reuses the same Supabase
-- backend as aioverviews, but with prefixed table names to keep the two
-- apps' data cleanly separated.
--
-- Apply via Supabase MCP apply_migration OR Supabase dashboard SQL editor:
--   https://app.supabase.com/project/jqpyzkqtnzzrhemnyegk/sql/new

begin;

-- 1. OTP codes — short-lived 6-digit codes
create table if not exists gnosis_otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gnosis_otp_codes_email_unused_idx
  on gnosis_otp_codes (email, used, expires_at desc);

-- 2. Sessions — long-lived (24h) session rows. Cookie carries a JWT
--    referencing one of these IDs.
create table if not exists gnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists gnosis_sessions_email_idx
  on gnosis_sessions (email, expires_at desc);

commit;

-- Verification (run separately):
--   select count(*) from gnosis_otp_codes;   -- expect: 0
--   select count(*) from gnosis_sessions;    -- expect: 0
--   \d gnosis_otp_codes
--   \d gnosis_sessions
