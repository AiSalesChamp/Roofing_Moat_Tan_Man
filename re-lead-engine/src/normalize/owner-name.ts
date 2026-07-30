// Appraisal rolls write owner names in registry order without punctuation:
// "SMITH JOHN A", "SMITH JOHN A & MARY J", "SMITH FAMILY TRUST",
// "ACME HOLDINGS LLC", "SMITH JOHN A EST OF".
//
// Entity type matters for outbound: you do not mail a "Dear John" letter to
// "CITY OF DALLAS", and an estate is a probate signal rather than a person.

export type OwnerEntityType =
  | 'individual'
  | 'company'
  | 'trust'
  | 'estate'
  | 'government'
  | 'unknown';

export type ParsedOwnerName = {
  raw: string;
  normalized: string;
  entityType: OwnerEntityType;
  firstName: string | undefined;
  lastName: string | undefined;
  // Additional owners found after "&" or "AND". Kept so a co-owner is not lost,
  // but not promoted to their own person record in Phase 0.
  coOwnerNames: readonly string[];
};

const COMPANY_TOKENS = [
  'LLC',
  'L L C',
  'INC',
  'CORP',
  'CORPORATION',
  'COMPANY',
  'CO',
  'LP',
  'LLP',
  'LTD',
  'PARTNERS',
  'PARTNERSHIP',
  'HOLDINGS',
  'PROPERTIES',
  'INVESTMENTS',
  'ENTERPRISES',
  'GROUP',
  'ASSOCIATES',
  'DEVELOPMENT',
  'BANK',
  'CHURCH',
  'MINISTRIES',
];

const TRUST_TOKENS = ['TRUST', 'TRUSTEE', 'TR', 'LIVING TRUST', 'FAMILY TRUST'];

const ESTATE_TOKENS = ['EST OF', 'ESTATE OF', 'ESTATE', 'EST', 'DECD', 'DECEASED', 'HEIRS'];

const GOVERNMENT_TOKENS = [
  'CITY OF',
  'COUNTY OF',
  'STATE OF',
  'ISD',
  'SCHOOL DISTRICT',
  'UNITED STATES',
  'TEXAS DEPARTMENT',
  'HOUSING AUTHORITY',
  'MUNICIPAL',
  'WATER DISTRICT',
];

const NAME_SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V', 'MD', 'DDS', 'PHD']);

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

const containsToken = (haystack: string, tokens: readonly string[]): boolean =>
  tokens.some((token) => new RegExp(`(^|\\s)${token.replace(/ /g, '\\s')}(\\s|$)`).test(haystack));

const classify = (upper: string): OwnerEntityType => {
  // Government before company: "CITY OF DALLAS WATER CO" is government.
  if (containsToken(upper, GOVERNMENT_TOKENS)) {
    return 'government';
  }

  // Estate before trust before company: "SMITH JOHN EST OF" must not be read as
  // a company because it happens to contain no company token at all.
  if (containsToken(upper, ESTATE_TOKENS)) {
    return 'estate';
  }

  if (containsToken(upper, TRUST_TOKENS)) {
    return 'trust';
  }

  if (containsToken(upper, COMPANY_TOKENS)) {
    return 'company';
  }

  return 'individual';
};

export const parseOwnerName = (raw: string): ParsedOwnerName => {
  const cleaned = collapse(raw.toUpperCase().replace(/[.]/g, ''));

  if (cleaned === '') {
    return {
      raw,
      normalized: '',
      entityType: 'unknown',
      firstName: undefined,
      lastName: undefined,
      coOwnerNames: [],
    };
  }

  const segments = cleaned.split(/\s*(?:&|\bAND\b)\s*/).filter((part) => part !== '');
  const primary = segments[0] ?? cleaned;
  const coOwnerNames = segments.slice(1);
  const entityType = classify(cleaned);

  if (entityType !== 'individual') {
    return {
      raw,
      normalized: cleaned,
      entityType,
      firstName: undefined,
      lastName: undefined,
      coOwnerNames,
    };
  }

  // Comma form is authoritative when present: "SMITH, JOHN A".
  if (primary.includes(',')) {
    const [lastPart, firstPart] = primary.split(',');
    const givenTokens = collapse(firstPart ?? '')
      .split(' ')
      .filter((token) => token !== '' && !NAME_SUFFIXES.has(token));

    return {
      raw,
      normalized: cleaned,
      entityType,
      firstName: givenTokens[0],
      lastName: collapse(lastPart ?? '') || undefined,
      coOwnerNames,
    };
  }

  // Registry order: first token is the surname, second is the given name.
  // Middle initials and generational suffixes are dropped from the parsed fields
  // but kept in `normalized`, which is what dedupe actually compares.
  const tokens = primary.split(' ').filter((token) => token !== '' && !NAME_SUFFIXES.has(token));

  return {
    raw,
    normalized: cleaned,
    entityType,
    lastName: tokens[0],
    firstName: tokens[1],
    coOwnerNames,
  };
};
