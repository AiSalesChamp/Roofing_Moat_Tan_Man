import {
  COUNTY_MULTIPLIERS,
  DEFAULT_COUNTY_MULTIPLIER,
  DEFAULT_OFFER_AGGRESSIVENESS,
  MAX_OFFER_AGGRESSIVENESS,
  MIN_OFFER_AGGRESSIVENESS,
} from './constants';
import {
  CountyMultiplierSource,
  SuggestedOfferInput,
  SuggestedOfferResult,
} from './types';

// County names arrive from CAD exports, capture forms and typing, so "Bastrop",
// " bastrop county " and "BASTROP COUNTY" must all hit the same multiplier.
export const normalizeCountyKey = (county: string): string =>
  county.trim().toUpperCase().replace(/\s+COUNTY$/, '').trim();

// A non-finite or non-positive value is bad data, not a valid multiplier. Using
// it would emit a zero or negative offer that reads as a real recommendation.
const isUsableMultiplier = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const resolveCountyMultiplier = (
  county: string | null | undefined,
  countyMultiplierOverride: number | null | undefined,
): { countyMultiplier: number; countyMultiplierSource: CountyMultiplierSource } => {
  if (isUsableMultiplier(countyMultiplierOverride)) {
    return {
      countyMultiplier: countyMultiplierOverride,
      countyMultiplierSource: 'OVERRIDE',
    };
  }

  const mappedMultiplier = county
    ? COUNTY_MULTIPLIERS[normalizeCountyKey(county)]
    : undefined;

  if (isUsableMultiplier(mappedMultiplier)) {
    return {
      countyMultiplier: mappedMultiplier,
      countyMultiplierSource: 'COUNTY_MAP',
    };
  }

  return {
    countyMultiplier: DEFAULT_COUNTY_MULTIPLIER,
    countyMultiplierSource: 'DEFAULT',
  };
};

// Aggressiveness above 1 would offer more than CAD-anchored value and below 0
// would offer a negative number; both are operator typos, not intentions.
const resolveOfferAggressiveness = (
  offerAggressiveness: number | null | undefined,
): number => {
  if (
    typeof offerAggressiveness !== 'number' ||
    !Number.isFinite(offerAggressiveness)
  ) {
    return DEFAULT_OFFER_AGGRESSIVENESS;
  }

  return Math.min(
    MAX_OFFER_AGGRESSIVENESS,
    Math.max(MIN_OFFER_AGGRESSIVENESS, offerAggressiveness),
  );
};

// suggestedOffer = cadLandMarketValue x countyMultiplier x offerAggressiveness
//
// Returns null when the CAD value is missing or non-positive. A default is
// never substituted for absent data: an offer built on a placeholder anchor is
// indistinguishable on screen from one built on a real parcel value.
export const computeSuggestedOffer = (
  input: SuggestedOfferInput,
): SuggestedOfferResult | null => {
  const { cadLandMarketValue, county, countyMultiplierOverride } = input;

  if (
    typeof cadLandMarketValue !== 'number' ||
    !Number.isFinite(cadLandMarketValue) ||
    cadLandMarketValue <= 0
  ) {
    return null;
  }

  const { countyMultiplier, countyMultiplierSource } = resolveCountyMultiplier(
    county,
    countyMultiplierOverride,
  );
  const offerAggressiveness = resolveOfferAggressiveness(
    input.offerAggressiveness,
  );

  return {
    suggestedOffer:
      cadLandMarketValue * countyMultiplier * offerAggressiveness,
    cadLandMarketValue,
    county: county ?? null,
    countyMultiplier,
    countyMultiplierSource,
    offerAggressiveness,
  };
};

// Calibration feedback: what the deal actually cost per dollar of CAD land
// value. Only a real closed price counts — an offer or an asking price would
// teach the multiplier what we hoped for rather than what the market took.
export const computeRealizedValueRatio = (
  closedPrice: number | null | undefined,
  cadLandMarketValue: number | null | undefined,
): number | null => {
  if (
    typeof closedPrice !== 'number' ||
    !Number.isFinite(closedPrice) ||
    closedPrice <= 0
  ) {
    return null;
  }

  if (
    typeof cadLandMarketValue !== 'number' ||
    !Number.isFinite(cadLandMarketValue) ||
    cadLandMarketValue <= 0
  ) {
    return null;
  }

  return closedPrice / cadLandMarketValue;
};
