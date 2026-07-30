-- PostGIS for parcel geometry. Not used in Phase 0 (appraisal rolls give
-- attributes, not shapes) but the column exists now so adding shapefiles later
-- is an UPDATE, not a table rewrite.
CREATE EXTENSION IF NOT EXISTS postgis;

-- pgcrypto for digest() — used to build stable hashes for dedupe keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
