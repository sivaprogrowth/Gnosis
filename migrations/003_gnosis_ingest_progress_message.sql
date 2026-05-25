-- 003_gnosis_ingest_progress_message.sql
-- Adds a human-readable progress field for the polling-based ingest UI.
-- Applied via Supabase MCP apply_migration to project jqpyzkqtnzzrhemnyegk on 2026-05-25.

ALTER TABLE public.gnosis_ingest_jobs
  ADD COLUMN progress_message text;
