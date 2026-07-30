-- IDENTITY LAYER. Slow clock: reloaded once a year from the certified
-- appraisal roll. Answers "who owns this and where does mail go".

CREATE TABLE parcels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deterministic, human-readable, stable across re-imports: tx-48439-R440917.
  -- This is what gets written to Twenty as engine_parcel_id, so idempotent
  -- upsert works without the engine storing Twenty's UUIDs as the source of truth.
  external_id       text NOT NULL UNIQUE,
  county_fips       char(5) NOT NULL REFERENCES counties (fips),
  apn_raw           text NOT NULL,
  apn_normalized    text NOT NULL,

  situs_address_raw text,
  situs_street      text,
  situs_city        text,
  situs_state       char(2),
  situs_postcode    text,

  legal_description text,
  land_use_code     text,
  land_use_description text,

  acreage             numeric(14, 4),
  land_market_value   numeric(16, 2),
  improvement_value   numeric(16, 2),
  total_market_value  numeric(16, 2),

  -- Tenure signal. Long-held land with no improvements is the classic
  -- inherited-and-forgotten parcel.
  deed_date         date,
  homestead_exemption boolean,

  geom              geography(MultiPolygon, 4326),

  source_name       text NOT NULL,
  roll_year         integer,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now()
);

-- The dedupe rule from the spec. Normalized APN, because Tarrant writes
-- "R-440917" and its own tax-sale listing writes "00440917".
CREATE UNIQUE INDEX parcels_county_apn_idx ON parcels (county_fips, apn_normalized);
CREATE INDEX parcels_county_idx ON parcels (county_fips);
CREATE INDEX parcels_geom_idx ON parcels USING gist (geom);

CREATE TYPE owner_entity_type AS ENUM (
  'individual', 'company', 'trust', 'estate', 'government', 'unknown'
);

CREATE TABLE owners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id       text NOT NULL UNIQUE,
  name_raw          text NOT NULL,
  name_normalized   text NOT NULL,
  entity_type       owner_entity_type NOT NULL DEFAULT 'unknown',
  first_name        text,
  last_name         text,

  mailing_address_raw text,
  mailing_street    text,
  mailing_city      text,
  mailing_state     char(2),
  mailing_postcode  text,
  mailing_is_po_box boolean NOT NULL DEFAULT false,
  -- Hash of the normalized mailing address. Two owners with the same name are
  -- only the same person if the mail goes to the same place.
  mailing_hash      text,

  parcel_count      integer NOT NULL DEFAULT 0,
  source_name       text NOT NULL,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX owners_identity_idx
  ON owners (name_normalized, COALESCE(mailing_hash, ''));

CREATE TABLE parcel_owners (
  parcel_id     uuid NOT NULL REFERENCES parcels (id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES owners (id) ON DELETE CASCADE,
  as_of_year    integer NOT NULL,
  is_current    boolean NOT NULL DEFAULT true,
  source_name   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parcel_id, owner_id, as_of_year)
);

CREATE INDEX parcel_owners_owner_idx ON parcel_owners (owner_id) WHERE is_current;
CREATE INDEX parcel_owners_parcel_current_idx ON parcel_owners (parcel_id) WHERE is_current;

-- Absentee is derived, never stored as a bare boolean input: it is a comparison
-- between two addresses, and storing only the answer loses the ability to
-- re-evaluate when one of the two addresses is corrected.
CREATE VIEW parcel_owner_current AS
SELECT
  p.id AS parcel_id,
  o.id AS owner_id,
  p.county_fips,
  p.apn_normalized,
  o.mailing_postcode,
  o.mailing_is_po_box,
  CASE
    WHEN o.mailing_hash IS NULL OR p.situs_street IS NULL THEN NULL
    WHEN o.mailing_is_po_box THEN true
    WHEN lower(trim(o.mailing_street)) = lower(trim(p.situs_street))
         AND lower(coalesce(o.mailing_city, '')) = lower(coalesce(p.situs_city, ''))
      THEN false
    ELSE true
  END AS is_absentee
FROM parcels p
JOIN parcel_owners po ON po.parcel_id = p.id AND po.is_current
JOIN owners o ON o.id = po.owner_id;
