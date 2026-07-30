-- SIGNAL LAYER. Fast clock: scraped monthly, because Texas foreclosure sales
-- run the first Tuesday of every month. Answers "is this owner in trouble".

CREATE TYPE distress_type AS ENUM (
  'notice_of_trustee_sale',
  'tax_sale',
  'struck_off',
  'probate',
  'lien',
  'code_violation'
);

CREATE TYPE match_status AS ENUM ('matched', 'unmatched_apn', 'unmatched_county', 'ambiguous');

CREATE TABLE distress_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     text NOT NULL UNIQUE,

  -- Nullable on purpose. An event we cannot match to a parcel is still evidence:
  -- it usually means the appraisal roll for that county is missing or stale, and
  -- discarding it would hide that gap. match_status records why.
  parcel_id       uuid REFERENCES parcels (id) ON DELETE SET NULL,
  match_status    match_status NOT NULL DEFAULT 'unmatched_apn',

  county_fips     char(5) REFERENCES counties (fips),
  county_name_raw text,
  apn_raw         text,
  apn_normalized  text,

  type            distress_type NOT NULL,
  event_date      date,
  sale_date       date,
  judgment_amount numeric(16, 2),
  cause_number    text,
  defendant_name_raw text,
  property_address_raw text,

  -- LGBS returns a GeoJSON Point per listing. Kept here rather than on parcels,
  -- because it is the listing's idea of where the property is, not a surveyed
  -- boundary. parcels.geom stays reserved for real polygons.
  geom_point      geography(Point, 4326),

  -- Adjudged value and minimum bid. Minimum bid well below adjudged value is
  -- itself a motivation signal, so both are kept rather than collapsed.
  adjudged_value  numeric(16, 2),
  minimum_bid     numeric(16, 2),
  sale_status_raw text,
  sale_notes      text,

  source_name     text NOT NULL,
  source_url      text,
  source_doc_ref  text,
  -- 0..1. Parsed-from-a-table is high; inferred-from-free-text is low. The score
  -- multiplies by this so a shaky parse cannot alone push a parcel over the gate.
  confidence      numeric(4, 3) NOT NULL DEFAULT 1.000,
  raw_payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_scrape_id   uuid REFERENCES raw_scrapes (id) ON DELETE SET NULL,
  run_id          uuid REFERENCES ingest_runs (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX distress_events_parcel_idx ON distress_events (parcel_id);
CREATE INDEX distress_events_county_apn_idx ON distress_events (county_fips, apn_normalized);
CREATE INDEX distress_events_recent_idx ON distress_events (event_date DESC);
CREATE INDEX distress_events_unmatched_idx ON distress_events (match_status)
  WHERE match_status <> 'matched';
