// Uncalibrated starting points, same framing as mao-engine/constants.ts.
// Replace them with per-county numbers derived from actual closings — the
// Underwriting dashboard averages realizedValueRatio by county for exactly
// that purpose, and 15-20 closings in a county is roughly where the average
// stops moving.

// Keys are normalized county names (see normalizeCountyKey): trimmed, upper
// case, with a trailing " COUNTY" removed. Seeded at 1.0 so an uncalibrated
// county is visibly neutral rather than quietly optimistic.
export const COUNTY_MULTIPLIERS: Record<string, number> = {
  BASTROP: 1.0,
  CALDWELL: 1.0,
  GUADALUPE: 1.0,
  HAYS: 1.0,
  MILAM: 1.0,
  WILLIAMSON: 1.0,
};

// Texas appraisal districts cannot see sale prices either, so their land values
// run under market. 1.2 is the direction of the bias, not a measured figure.
export const DEFAULT_COUNTY_MULTIPLIER = 1.2;

// 0.6 favors volume: enough spread to assign, low enough to keep offers moving.
export const DEFAULT_OFFER_AGGRESSIVENESS = 0.6;

export const MIN_OFFER_AGGRESSIVENESS = 0;
export const MAX_OFFER_AGGRESSIVENESS = 1;
