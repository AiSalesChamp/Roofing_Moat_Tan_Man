-- Counties. FIPS is the join key across every source, because county NAMES are
-- not stable across sources ("De Witt" / "DeWitt" / "Dewitt" are one county).
CREATE TABLE counties (
  fips            char(5) PRIMARY KEY,
  state_fips      char(2) NOT NULL,
  name            text    NOT NULL,
  name_normalized text    NOT NULL,
  cad_name        text,
  cad_url         text,
  is_phase0_target boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX counties_state_name_normalized_idx
  ON counties (state_fips, name_normalized);

-- Provenance and scraper health, one row per (source, county) pair.
-- county_fips NULL means the source is statewide (LGBS and PBFCM both are).
CREATE TYPE source_kind AS ENUM ('distress_listing', 'appraisal_roll');
CREATE TYPE source_status AS ENUM ('healthy', 'stale', 'failing', 'disabled');

CREATE TABLE data_sources (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name           text NOT NULL,
  county_fips           char(5) REFERENCES counties (fips),
  kind                  source_kind NOT NULL,
  vendor_platform       text,
  base_url              text NOT NULL,
  -- Health-check inputs. expected_min_records is the tripwire: a source that
  -- suddenly returns 3 rows instead of 3000 has changed its markup, and we want
  -- that to fail loudly rather than quietly shrink the funnel.
  expected_min_records  integer NOT NULL DEFAULT 1,
  freshness_sla_hours   integer NOT NULL DEFAULT 768,
  status                source_status NOT NULL DEFAULT 'healthy',
  last_successful_run_at timestamptz,
  last_run_at           timestamptz,
  last_record_count     integer,
  last_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX data_sources_name_county_idx
  ON data_sources (source_name, COALESCE(county_fips, 'ALL'));
