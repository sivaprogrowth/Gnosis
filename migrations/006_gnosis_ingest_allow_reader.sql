-- 006_gnosis_ingest_allow_reader.sql
-- Allow 'reader' as a source_type for the gnosis_ingest_jobs CHECK constraint.
-- The Readwise Reader auto-ingest cron (processReaderCron, shipped 2026-05-31)
-- inserts jobs with source_type='reader', but migration 004 only enumerated
-- ('url','pdf','clipping'). Every reader-cron insert silently failed the CHECK,
-- so no reader doc ever reached the wiki and the Reader docs stayed bare-tagged.
-- Applied via Supabase MCP apply_migration on 2026-06-14.

ALTER TABLE public.gnosis_ingest_jobs
  DROP CONSTRAINT gnosis_ingest_jobs_source_type_check;

ALTER TABLE public.gnosis_ingest_jobs
  ADD CONSTRAINT gnosis_ingest_jobs_source_type_check
  CHECK (source_type IN ('url', 'pdf', 'clipping', 'reader'));
