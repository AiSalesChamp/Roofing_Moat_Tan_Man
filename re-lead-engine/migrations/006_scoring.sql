-- Rules-based motivation score. Versioned by weights_version so a threshold
-- change is auditable: you can prove which weights produced the lead you mailed.
CREATE TABLE lead_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid NOT NULL REFERENCES parcels (id) ON DELETE CASCADE,
  score           integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  weights_version text NOT NULL,
  -- Per-rule contributions. Without this the score is unexplainable, and an
  -- unexplainable score cannot be tuned.
  breakdown       jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX lead_scores_parcel_version_idx
  ON lead_scores (parcel_id, weights_version, computed_at);
CREATE INDEX lead_scores_parcel_recent_idx ON lead_scores (parcel_id, computed_at DESC);

CREATE VIEW lead_scores_latest AS
SELECT DISTINCT ON (parcel_id) *
FROM lead_scores
ORDER BY parcel_id, computed_at DESC;

-- Why a parcel did NOT get promoted. This is the tuning instrument: if 90% of
-- withholds are no_mailing_address, the problem is the data layer, not the threshold.
CREATE TYPE withhold_reason AS ENUM (
  'no_distress_event',
  'distress_event_too_old',
  'score_below_threshold',
  'no_mailing_address',
  'no_owner_resolved',
  'suppressed',
  'channel_disabled'
);

CREATE TABLE promotion_withholds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id     uuid NOT NULL REFERENCES parcels (id) ON DELETE CASCADE,
  reason        withhold_reason NOT NULL,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
  channel       text,
  evaluated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promotion_withholds_reason_idx ON promotion_withholds (reason, evaluated_at DESC);
CREATE INDEX promotion_withholds_parcel_idx ON promotion_withholds (parcel_id, evaluated_at DESC);
