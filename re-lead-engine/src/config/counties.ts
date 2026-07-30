// Texas county FIPS codes for the Phase 0 target set.
//
// PROVENANCE WARNING: these ten values are hand-entered, not machine-derived.
// Verify them, and load the remaining 244 Texas counties, with:
//
//   yarn fips:load <path-to-census-gazetteer.txt>
//
// Source: US Census Bureau national county gazetteer / FIPS 6-4. The loader
// overwrites these rows from the file, so an error here is corrected on first load
// rather than becoming permanent. A wrong FIPS silently mis-joins an entire
// county's parcels to another county's distress events, which is why this is
// flagged rather than trusted.
export type CountySeed = {
  fips: string;
  name: string;
  cadName: string;
  isPhase0Target: boolean;
};

export const PHASE_0_COUNTIES: readonly CountySeed[] = [
  // Metros — accessible bulk data, high deal volume.
  { fips: '48201', name: 'Harris', cadName: 'HCAD', isPhase0Target: true },
  { fips: '48113', name: 'Dallas', cadName: 'DCAD', isPhase0Target: true },
  { fips: '48439', name: 'Tarrant', cadName: 'TAD', isPhase0Target: true },
  { fips: '48029', name: 'Bexar', cadName: 'BCAD', isPhase0Target: true },
  { fips: '48453', name: 'Travis', cadName: 'TCAD', isPhase0Target: true },
  { fips: '48339', name: 'Montgomery', cadName: 'MCAD', isPhase0Target: true },

  // Rural land-heavy contrast set. Metro rules tuned on quarter-acre lots do not
  // transfer to 40-acre tracts, so the score needs both shapes in the sample.
  { fips: '48467', name: 'Van Zandt', cadName: 'Van Zandt CAD', isPhase0Target: true },
  { fips: '48161', name: 'Freestone', cadName: 'Freestone CAD', isPhase0Target: true },

  // Already present in the CRM's seed data, so promotion can be checked against
  // records that existed before the engine did.
  { fips: '48121', name: 'Denton', cadName: 'DCAD (Denton)', isPhase0Target: false },
  { fips: '48217', name: 'Hill', cadName: 'Hill CAD', isPhase0Target: false },
];

export const normalizeCountyName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
