// APN normalization is the single highest-risk join in the engine. Get it wrong
// and distress events attach to the wrong parcel — or to nothing, silently.
//
// The same parcel is written differently by the CAD and by the law firm posting
// the sale. Tarrant's roll says "R-440917"; a tax-sale listing for it may say
// "00440917" or "440917". So normalization is per county, and the default is
// deliberately conservative.

export type ApnNormalizer = {
  // Strip a CAD-specific prefix letter (Tarrant/Denton use R for real property).
  stripLeadingLetters: boolean;
  // Drop zero padding so "00440917" and "440917" converge.
  stripLeadingZeros: boolean;
  // Fixed width to re-pad to after stripping. Undefined means leave as-is.
  padToLength?: number;
};

const DEFAULT_NORMALIZER: ApnNormalizer = {
  stripLeadingLetters: false,
  stripLeadingZeros: false,
};

// VERIFY AGAINST REAL FILES before trusting any entry here. Each rule should be
// confirmed by matching a known parcel across its roll and a tax-sale posting.
// An unverified rule is worse than no rule: it produces confident mismatches.
const COUNTY_NORMALIZERS: Record<string, ApnNormalizer> = {
  // Tarrant: roll APNs are "R" + 8 digits zero-padded; listings drop both.
  '48439': { stripLeadingLetters: true, stripLeadingZeros: true },
  // Denton: same shape as Tarrant.
  '48121': { stripLeadingLetters: true, stripLeadingZeros: true },
  // Harris: 13-digit account number, no letters, padding is significant.
  '48201': { stripLeadingLetters: false, stripLeadingZeros: false, padToLength: 13 },
  // Dallas: 17-character account, padding significant.
  '48113': { stripLeadingLetters: false, stripLeadingZeros: false, padToLength: 17 },
};

export const normalizeApn = (raw: string, countyFips?: string): string => {
  const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (stripped === '') {
    return '';
  }

  const rules =
    countyFips === undefined
      ? DEFAULT_NORMALIZER
      : (COUNTY_NORMALIZERS[countyFips] ?? DEFAULT_NORMALIZER);

  let value = stripped;

  if (rules.stripLeadingLetters) {
    value = value.replace(/^[A-Z]+/, '');
  }

  if (rules.stripLeadingZeros) {
    value = value.replace(/^0+/, '');
  }

  if (rules.padToLength !== undefined && value.length < rules.padToLength) {
    value = value.padStart(rules.padToLength, '0');
  }

  return value;
};

export const hasCountySpecificApnRule = (countyFips: string): boolean =>
  COUNTY_NORMALIZERS[countyFips] !== undefined;
