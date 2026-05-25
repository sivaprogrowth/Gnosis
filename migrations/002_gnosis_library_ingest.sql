-- 002_gnosis_library_ingest.sql
-- Tables for the Library + Ingest web UI features.
-- Applied via Supabase MCP apply_migration to project jqpyzkqtnzzrhemnyegk on 2026-05-25.

-- gnosis_drain_queue: books queued via the web Library UI for the next
-- "drain Readwise" pass in a Claude Code session.
CREATE TABLE public.gnosis_drain_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  readwise_book_id bigint NOT NULL,
  book_title text NOT NULL,
  book_author text,
  requested_class text NOT NULL DEFAULT 'A'
    CHECK (requested_class IN ('A','B','C','D')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','drained','cancelled')),
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  drained_at timestamptz,
  notes text
);

-- One pending row per book at a time. Older drained/cancelled rows don't conflict.
CREATE UNIQUE INDEX gnosis_drain_queue_pending_unique
  ON public.gnosis_drain_queue (readwise_book_id) WHERE status = 'pending';

-- Server-only access; service-role bypasses RLS. No anon policies = no client access.
ALTER TABLE public.gnosis_drain_queue ENABLE ROW LEVEL SECURITY;


-- gnosis_ingest_jobs: tracks the URL/PDF -> wiki-archive ingest pipeline.
-- Two-phase: row created at submit (status=fetching), updated to awaiting_user
-- after discuss step, finalised by the resume endpoint.
CREATE TABLE public.gnosis_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('url','pdf')),
  source_url text,
  source_filename text,
  source_title text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued','fetching','discussing','awaiting_user',
      'synthesizing','committing','done','failed','cancelled'
    )),
  raw_markdown text,
  takeaways jsonb,
  surfaced_entities jsonb,
  user_decision text,
  commit_sha text,
  committed_files jsonb,
  error_message text,
  requested_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gnosis_ingest_jobs_requested_by_created
  ON public.gnosis_ingest_jobs (requested_by, created_at DESC);

ALTER TABLE public.gnosis_ingest_jobs ENABLE ROW LEVEL SECURITY;


-- updated_at trigger for ingest_jobs (drain_queue uses explicit timestamps)
CREATE OR REPLACE FUNCTION public.gnosis_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER gnosis_ingest_jobs_set_updated_at
  BEFORE UPDATE ON public.gnosis_ingest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.gnosis_set_updated_at();
