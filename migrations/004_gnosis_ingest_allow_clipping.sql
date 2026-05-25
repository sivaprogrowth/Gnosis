-- 004_gnosis_ingest_allow_clipping.sql
-- Allow 'clipping' as a source_type for the gnosis_ingest_jobs CHECK constraint.
-- A clipping is pre-extracted markdown the user pastes directly into /ingest,
-- bypassing the server-side fetcher (useful for paywalled / JS-heavy pages).
-- Applied via Supabase MCP apply_migration on 2026-05-25.

ALTER TABLE public.gnosis_ingest_jobs
  DROP CONSTRAINT gnosis_ingest_jobs_source_type_check;

ALTER TABLE public.gnosis_ingest_jobs
  ADD CONSTRAINT gnosis_ingest_jobs_source_type_check
  CHECK (source_type IN ('url', 'pdf', 'clipping'));
