// Where the county multiplier actually came from. Surfaced on the result so an
// operator reading a suggested offer can tell a calibrated number from a guess.
export type CountyMultiplierSource = 'OVERRIDE' | 'COUNTY_MAP' | 'DEFAULT';

export type SuggestedOfferInput = {
  // From the county appraisal district bulk pull. Nullable: most SOURCED leads
  // have not been matched to a parcel record yet.
  cadLandMarketValue: number | null | undefined;
  county?: string | null;
  countyMultiplierOverride?: number | null;
  offerAggressiveness?: number | null;
};

export type SuggestedOfferResult = {
  suggestedOffer: number;
  // Every input the number was actually built from, so the figure can be
  // reproduced later without re-reading the record it came from.
  cadLandMarketValue: number;
  county: string | null;
  countyMultiplier: number;
  countyMultiplierSource: CountyMultiplierSource;
  offerAggressiveness: number;
};
