-- COMPLIANCE. Built in Phase 0 because retrofitting per-channel suppression
-- across a live multi-channel system is a quarter of engineering time.

CREATE TYPE contact_channel AS ENUM ('mail', 'phone', 'sms', 'email', 'ads', 'all');
CREATE TYPE suppression_status AS ENUM (
  'allowed', 'opted_out', 'dnc_listed', 'litigator_flagged', 'bounced', 'deceased'
);
CREATE TYPE identifier_kind AS ENUM ('person', 'mailing_address', 'phone', 'email');

-- Suppression is keyed on the IDENTIFIER, not only the owner row. An opt-out
-- follows the phone number even after we re-resolve it to a different owner —
-- otherwise a re-skip-trace silently un-suppresses someone who told us to stop.
CREATE TABLE suppression (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid REFERENCES owners (id) ON DELETE SET NULL,
  twenty_person_id  uuid,

  identifier_kind   identifier_kind NOT NULL,
  identifier_hash   text NOT NULL,
  identifier_preview text,

  -- 'all' is the default an unscoped opt-out lands on. A person who scoped
  -- their request to one channel gets that channel only.
  channel           contact_channel NOT NULL,
  status            suppression_status NOT NULL,

  source            text NOT NULL,
  provenance_vendor text,
  captured_at       timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX suppression_identifier_channel_idx
  ON suppression (identifier_kind, identifier_hash, channel);
CREATE INDEX suppression_owner_idx ON suppression (owner_id);
CREATE INDEX suppression_active_idx ON suppression (status)
  WHERE status <> 'allowed';

-- Raw webhook receipts. An opt-out claim we cannot replay is an opt-out we
-- cannot defend in a TDPSA cure-period response.
CREATE TABLE opt_out_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at   timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL,
  payload       jsonb NOT NULL,
  signature_ok  boolean NOT NULL,
  applied       boolean NOT NULL DEFAULT false,
  apply_error   text
);

CREATE INDEX opt_out_events_received_idx ON opt_out_events (received_at DESC);

-- Every contact identifier records which vendor supplied it and when. Required
-- for data-broker compliance and for scoring vendor quality later.
CREATE TABLE contact_provenance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES owners (id) ON DELETE CASCADE,
  identifier_kind identifier_kind NOT NULL,
  identifier_hash text NOT NULL,
  identifier_value text,
  vendor          text NOT NULL,
  vendor_confidence numeric(4, 3),
  captured_at     timestamptz NOT NULL DEFAULT now(),
  cost_cents      integer
);

CREATE UNIQUE INDEX contact_provenance_dedupe_idx
  ON contact_provenance (owner_id, identifier_kind, identifier_hash, vendor);

CREATE TYPE skip_trace_status AS ENUM (
  'not_requested', 'pending', 'hit', 'no_hit', 'failed', 'skipped_suppressed'
);

CREATE TABLE skip_trace_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES owners (id) ON DELETE CASCADE,
  vendor        text NOT NULL,
  status        skip_trace_status NOT NULL DEFAULT 'pending',
  confidence    numeric(4, 3),
  phones        jsonb NOT NULL DEFAULT '[]'::jsonb,
  emails        jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_response  jsonb,
  cost_cents    integer,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX skip_trace_results_owner_idx ON skip_trace_results (owner_id, requested_at DESC);
