-- Every fetch is kept verbatim before parsing. When a parser turns out to be
-- wrong six weeks later, we re-parse from here instead of re-crawling the county
-- (which we may no longer be allowed to do, and which no longer holds the same page).
CREATE TABLE ingest_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name   text NOT NULL,
  kind          source_kind NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'running',
  records_discovered integer NOT NULL DEFAULT 0,
  records_parsed     integer NOT NULL DEFAULT 0,
  records_rejected   integer NOT NULL DEFAULT 0,
  error         text
);

CREATE INDEX ingest_runs_source_started_idx ON ingest_runs (source_name, started_at DESC);

CREATE TABLE raw_scrapes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES ingest_runs (id) ON DELETE CASCADE,
  source_name   text NOT NULL,
  url           text NOT NULL,
  http_status   integer,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  content_type  text,
  -- Hash lets a re-run skip unchanged pages without diffing megabytes of HTML.
  content_hash  text NOT NULL,
  raw_text      text,
  parsed_payload jsonb,
  -- PBFCM publishes its sale lists as PDFs, and a minority of them are scans with
  -- an unusable OCR layer. Those are recorded as needs_ocr and skipped rather than
  -- parsed into garbage: Phase 1 adds extraction for them. Silently dropping them
  -- would make a county look empty instead of unread.
  extraction_status text NOT NULL DEFAULT 'ok'
    CHECK (extraction_status IN ('ok', 'needs_ocr', 'parse_failed', 'empty'))
);

CREATE INDEX raw_scrapes_run_idx ON raw_scrapes (run_id);
CREATE INDEX raw_scrapes_hash_idx ON raw_scrapes (source_name, content_hash);

-- Appraisal roll imports are file-based, not URL-based, so they get their own
-- provenance row: which file, which certified roll year, what layout parsed it.
CREATE TABLE appraisal_roll_imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         uuid NOT NULL REFERENCES ingest_runs (id) ON DELETE CASCADE,
  county_fips    char(5) NOT NULL REFERENCES counties (fips),
  roll_year      integer NOT NULL,
  layout_id      text NOT NULL,
  file_path      text NOT NULL,
  file_bytes     bigint,
  file_sha256    text NOT NULL,
  row_count      integer,
  imported_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX appraisal_roll_imports_dedupe_idx
  ON appraisal_roll_imports (county_fips, roll_year, file_sha256);
