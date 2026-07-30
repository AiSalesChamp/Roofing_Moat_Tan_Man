// Address standardization, USPS Publication 28 conventions. Deterministic only —
// no geocoding service, no LLM. Two addresses that normalize to the same string
// are treated as the same place, so this function defines what "same place" means.

const SUFFIX_ABBREVIATIONS: Record<string, string> = {
  ALLEY: 'ALY',
  AVENUE: 'AVE',
  AVE: 'AVE',
  BOULEVARD: 'BLVD',
  BLVD: 'BLVD',
  CIRCLE: 'CIR',
  CIR: 'CIR',
  COURT: 'CT',
  CT: 'CT',
  DRIVE: 'DR',
  DR: 'DR',
  EXPRESSWAY: 'EXPY',
  FREEWAY: 'FWY',
  HIGHWAY: 'HWY',
  HWY: 'HWY',
  LANE: 'LN',
  LN: 'LN',
  LOOP: 'LOOP',
  PARKWAY: 'PKWY',
  PKWY: 'PKWY',
  PLACE: 'PL',
  PL: 'PL',
  ROAD: 'RD',
  RD: 'RD',
  ROUTE: 'RTE',
  STREET: 'ST',
  ST: 'ST',
  TERRACE: 'TER',
  TRAIL: 'TRL',
  TRL: 'TRL',
  WAY: 'WAY',
};

const DIRECTIONAL_ABBREVIATIONS: Record<string, string> = {
  NORTH: 'N',
  SOUTH: 'S',
  EAST: 'E',
  WEST: 'W',
  NORTHEAST: 'NE',
  NORTHWEST: 'NW',
  SOUTHEAST: 'SE',
  SOUTHWEST: 'SW',
};

const UNIT_DESIGNATORS = new Set([
  'APT',
  'BLDG',
  'FL',
  'STE',
  'SUITE',
  'UNIT',
  'RM',
  'TRLR',
  'LOT',
  '#',
]);

export type NormalizedAddress = {
  raw: string;
  street: string | undefined;
  unit: string | undefined;
  city: string | undefined;
  state: string | undefined;
  postcode: string | undefined;
  isPoBox: boolean;
  // True when the input did not yield a street or a PO Box. §6 requires a
  // resolvable mailing address, and this flag is what that gate reads.
  isResolvable: boolean;
};

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

const PO_BOX_PATTERN = /\b(?:P\.?\s*O\.?|POST\s+OFFICE)\s*BOX\s*([A-Z0-9-]+)/i;

// Texas rural addresses lean on these; treated as street types, not directionals.
const HIGHWAY_PATTERN = /\b(FM|RM|CR|SH|US|IH|TX)\s*[- ]?\s*(\d+)\b/g;

export const normalizeStreet = (input: string): string => {
  let value = collapse(input.toUpperCase()).replace(/[.,]/g, '');

  // "F M 1385" / "FM-1385" all become "FM 1385" so the token count is stable.
  value = value.replace(HIGHWAY_PATTERN, (_match, prefix: string, number: string) =>
    `${prefix} ${number}`,
  );

  const tokens = value.split(' ').filter((token) => token !== '');

  const normalized = tokens.map((token, index) => {
    // Never abbreviate the first token: "N" as a house number is not a directional.
    if (index > 0 && DIRECTIONAL_ABBREVIATIONS[token] !== undefined) {
      return DIRECTIONAL_ABBREVIATIONS[token];
    }

    if (SUFFIX_ABBREVIATIONS[token] !== undefined) {
      return SUFFIX_ABBREVIATIONS[token];
    }

    return token;
  });

  return normalized.join(' ');
};

const extractUnit = (street: string): { street: string; unit: string | undefined } => {
  const tokens = street.split(' ');

  for (let index = tokens.length - 2; index >= 1; index -= 1) {
    const token = tokens[index];

    if (token !== undefined && UNIT_DESIGNATORS.has(token)) {
      return {
        street: collapse(tokens.slice(0, index).join(' ')),
        unit: collapse(tokens.slice(index).join(' ')),
      };
    }
  }

  const hashIndex = tokens.findIndex((token) => token.startsWith('#'));

  if (hashIndex > 0) {
    return {
      street: collapse(tokens.slice(0, hashIndex).join(' ')),
      unit: collapse(tokens.slice(hashIndex).join(' ')),
    };
  }

  return { street, unit: undefined };
};

const STATE_ZIP_PATTERN = /\b([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s*$/;

// Accepts either a single-line address or pre-split components. County rolls give
// components; scraped listings give one line — both land here.
export const normalizeAddress = (input: {
  line?: string | undefined;
  street?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postcode?: string | undefined;
}): NormalizedAddress => {
  const raw = collapse(
    input.line ??
      [input.street, input.city, input.state, input.postcode].filter(Boolean).join(', '),
  );

  if (raw === '') {
    return {
      raw,
      street: undefined,
      unit: undefined,
      city: undefined,
      state: undefined,
      postcode: undefined,
      isPoBox: false,
      isResolvable: false,
    };
  }

  const poBoxMatch = PO_BOX_PATTERN.exec(raw);

  let street = input.street;
  let city = input.city;
  let state = input.state;
  let postcode = input.postcode;

  if (input.line !== undefined && street === undefined) {
    const parts = input.line.split(',').map((part) => collapse(part));
    const upperLast = (parts.at(-1) ?? '').toUpperCase();
    const stateZipMatch = STATE_ZIP_PATTERN.exec(upperLast);

    if (stateZipMatch !== null) {
      state = stateZipMatch[1];
      postcode = stateZipMatch[2];
      city = parts.at(-2);
      street = parts.slice(0, -2).join(' ');
    } else {
      // No trailing state/zip — treat the whole line as street rather than
      // inventing a city from a token that might be part of the street name.
      street = parts.join(' ');
    }
  }

  if (poBoxMatch !== null) {
    return {
      raw,
      street: `PO BOX ${(poBoxMatch[1] ?? '').toUpperCase()}`,
      unit: undefined,
      city: city === undefined ? undefined : collapse(city.toUpperCase()),
      state: state === undefined ? undefined : state.toUpperCase().slice(0, 2),
      postcode: postcode?.slice(0, 5),
      isPoBox: true,
      isResolvable: true,
    };
  }

  const normalizedStreet =
    street === undefined || collapse(street) === '' ? undefined : normalizeStreet(street);
  const split =
    normalizedStreet === undefined
      ? { street: undefined, unit: undefined }
      : extractUnit(normalizedStreet);

  // A street with no house number is a road name, not a deliverable address.
  const hasHouseNumber = split.street !== undefined && /^\d/.test(split.street);

  return {
    raw,
    street: split.street,
    unit: split.unit,
    city: city === undefined ? undefined : collapse(city.toUpperCase()),
    state: state === undefined ? undefined : state.toUpperCase().slice(0, 2),
    postcode: postcode?.slice(0, 5),
    isPoBox: false,
    isResolvable: hasHouseNumber && postcode !== undefined,
  };
};

export const addressFingerprint = (address: NormalizedAddress): string =>
  [address.street, address.unit, address.city, address.state, address.postcode]
    .map((part) => part ?? '')
    .join('|')
    .toUpperCase();
