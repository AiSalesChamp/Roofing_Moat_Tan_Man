-- Bidirectional sync ledger. The engine remembers which Twenty record a given
-- external_id became, plus a hash of what it last pushed. That hash is what makes
-- re-running promotion produce zero duplicates AND zero pointless writes.
CREATE TYPE sync_entity_kind AS ENUM ('parcel', 'owner', 'distress_event');

CREATE TABLE twenty_sync_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind     sync_entity_kind NOT NULL,
  external_id     text NOT NULL,
  twenty_object   text NOT NULL,
  twenty_record_id uuid,
  last_payload_hash text,
  last_pushed_at  timestamptz,
  last_status     text,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX twenty_sync_state_entity_idx
  ON twenty_sync_state (entity_kind, external_id);
CREATE INDEX twenty_sync_state_record_idx ON twenty_sync_state (twenty_record_id);

-- One row per promote invocation, so a bad run can be identified and explained.
CREATE TABLE promotion_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  dry_run       boolean NOT NULL,
  min_score     integer NOT NULL,
  lookback_days integer NOT NULL,
  channel       text NOT NULL,
  evaluated     integer NOT NULL DEFAULT 0,
  promoted      integer NOT NULL DEFAULT 0,
  updated       integer NOT NULL DEFAULT 0,
  withheld      integer NOT NULL DEFAULT 0,
  failed        integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'running',
  error         text
);
