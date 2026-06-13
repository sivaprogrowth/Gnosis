-- 005_ai_usage.sql
-- Per-call Anthropic API usage + cost attribution. One row per
-- messages.create / messages.stream call, tagged with the code path
-- (call_site) that made it, so spend is attributable per feature.
-- Apply via Supabase MCP apply_migration.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  call_site text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  cost_usd numeric(12,6) not null default 0
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_call_site_idx on public.ai_usage (call_site);

-- Server-only table: written + read via the service-role key (bypasses RLS).
-- Enable RLS with no policies so the anon key cannot read or modify it.
alter table public.ai_usage enable row level security;
