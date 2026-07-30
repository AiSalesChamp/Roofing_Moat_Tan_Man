import { normalizeCountyName, PHASE_0_COUNTIES } from '../config/counties.ts';
import { createLogger } from '../lib/logger.ts';
import { pool } from './pool.ts';

const logger = createLogger('seed');

export const seedPhase0Counties = async (): Promise<void> => {
  for (const county of PHASE_0_COUNTIES) {
    await pool.query(
      `INSERT INTO counties (fips, state_fips, name, name_normalized, cad_name, is_phase0_target)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (fips) DO UPDATE
         SET name = EXCLUDED.name,
             name_normalized = EXCLUDED.name_normalized,
             cad_name = EXCLUDED.cad_name,
             is_phase0_target = EXCLUDED.is_phase0_target`,
      [
        county.fips,
        county.fips.slice(0, 2),
        county.name,
        normalizeCountyName(county.name),
        county.cadName,
        county.isPhase0Target,
      ],
    );
  }

  logger.info('counties seeded', { count: PHASE_0_COUNTIES.length });
};

type DataSourceSeed = {
  sourceName: string;
  countyFips: string | null;
  kind: 'distress_listing' | 'appraisal_roll';
  vendorPlatform: string | null;
  baseUrl: string;
  expectedMinRecords: number;
  freshnessSlaHours: number;
};

const DATA_SOURCE_SEEDS: readonly DataSourceSeed[] = [
  {
    sourceName: 'lgbs',
    countyFips: null,
    kind: 'distress_listing',
    vendorPlatform: 'Linebarger Goggan Blair & Sampson',
    baseUrl: 'https://taxsales.lgbs.com',
    // Statewide monthly postings across the counties LGBS represents. Tuned from
    // the first successful run — the seed value is a floor, not a measurement.
    expectedMinRecords: 50,
    // Sales are the first Tuesday of the month. 768h ≈ 32 days: one missed cycle
    // trips the SLA.
    freshnessSlaHours: 768,
  },
  {
    sourceName: 'pbfcm',
    countyFips: null,
    kind: 'distress_listing',
    vendorPlatform: 'Perdue Brandon Fielder Collins & Mott',
    baseUrl: 'https://pbfcm.com',
    expectedMinRecords: 50,
    freshnessSlaHours: 768,
  },
];

export const seedPhase0DataSources = async (): Promise<void> => {
  for (const source of DATA_SOURCE_SEEDS) {
    await pool.query(
      `INSERT INTO data_sources
         (source_name, county_fips, kind, vendor_platform, base_url,
          expected_min_records, freshness_sla_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (source_name, COALESCE(county_fips, 'ALL')) DO UPDATE
         SET base_url = EXCLUDED.base_url,
             vendor_platform = EXCLUDED.vendor_platform,
             updated_at = now()`,
      [
        source.sourceName,
        source.countyFips,
        source.kind,
        source.vendorPlatform,
        source.baseUrl,
        source.expectedMinRecords,
        source.freshnessSlaHours,
      ],
    );
  }

  // Appraisal-roll sources are per county: one row each, so freshness is tracked
  // county by county rather than as a single statewide "rolls are fine".
  for (const county of PHASE_0_COUNTIES.filter((entry) => entry.isPhase0Target)) {
    await pool.query(
      `INSERT INTO data_sources
         (source_name, county_fips, kind, vendor_platform, base_url,
          expected_min_records, freshness_sla_hours)
       VALUES ($1, $2, 'appraisal_roll', $3, $4, $5, $6)
       ON CONFLICT (source_name, COALESCE(county_fips, 'ALL')) DO NOTHING`,
      [
        `appraisal_roll:${county.fips}`,
        county.fips,
        county.cadName,
        'file://data/rolls',
        1000,
        // Certified rolls are annual. 400 days allows a late certification without
        // firing a false alarm every summer.
        400 * 24,
      ],
    );
  }

  logger.info('data sources seeded');
};
