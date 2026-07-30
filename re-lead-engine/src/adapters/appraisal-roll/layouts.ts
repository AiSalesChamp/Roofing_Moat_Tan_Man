import { canonicalizeHeader, type RollFieldName, type RollLayout } from './types.ts';

// NO FABRICATED LAYOUTS LIVE HERE.
//
// Each CAD publishes its own record layout, and inventing offsets or column names
// would produce an adapter that runs, reports success, and loads garbage. Instead:
//
//   1. Download the roll into data/rolls/<fips>/
//   2. Run `yarn ingest --source=roll --county=<fips> --inspect`
//      It prints the detected delimiter and the header names it found, together
//      with its best guess at the field mapping.
//   3. Paste a layout entry below, correcting the guesses.
//
// That is the "add county #3 in under an hour" path.

// Header fragments used to guess a mapping during --inspect. Ordered: the first
// match wins, so more specific fragments come first.
export const HEADER_HINTS: Record<RollFieldName, readonly string[]> = {
  apn: ['propertyid', 'propid', 'accountnumber', 'acctnum', 'account', 'apn', 'parcelid', 'geoid'],
  ownerName: ['ownername', 'owner1', 'currentowner', 'name1', 'ownername1', 'owner'],
  ownerMailingLine1: ['owneraddress1', 'mailaddr1', 'mailingaddress1', 'addr1', 'mailingaddress'],
  ownerMailingLine2: ['owneraddress2', 'mailaddr2', 'mailingaddress2', 'addr2'],
  ownerMailingCity: ['ownercity', 'mailcity', 'mailingcity', 'city'],
  ownerMailingState: ['ownerstate', 'mailstate', 'mailingstate', 'state'],
  ownerMailingZip: ['ownerzip', 'mailzip', 'mailingzip', 'zipcode', 'zip'],
  situsStreet: ['situsaddress', 'situsstreet', 'propertyaddress', 'locationaddress', 'situs'],
  situsCity: ['situscity', 'propertycity'],
  situsZip: ['situszip', 'propertyzip'],
  legalDescription: ['legaldescription', 'legaldesc', 'legal'],
  landUseCode: ['statecode', 'landusecode', 'propertyusecode', 'clsschcd', 'propertyclass'],
  acreage: ['landacres', 'acreage', 'acres', 'gisacres', 'legalacreage'],
  landMarketValue: ['landvalue', 'landmarketvalue', 'landval', 'marketvalueland'],
  improvementValue: ['improvementvalue', 'imprvvalue', 'impvalue', 'improvement'],
  totalMarketValue: ['totalmarketvalue', 'marketvalue', 'totalvalue', 'assessedvalue'],
  deedDate: ['deeddate', 'saledate', 'dateacquired', 'transferdate'],
  homesteadFlag: ['homestead', 'hsexempt', 'exemptionhs', 'hscap'],
};

export const guessFieldForHeader = (header: string): RollFieldName | undefined => {
  const canonical = canonicalizeHeader(header);

  // Exact canonical match first — "city" should not steal "situscity".
  for (const [field, hints] of Object.entries(HEADER_HINTS) as [
    RollFieldName,
    readonly string[],
  ][]) {
    if (hints.includes(canonical)) {
      return field;
    }
  }

  for (const [field, hints] of Object.entries(HEADER_HINTS) as [
    RollFieldName,
    readonly string[],
  ][]) {
    if (hints.some((hint) => canonical.includes(hint))) {
      return field;
    }
  }

  return undefined;
};

// Populate from --inspect output. Empty by design until a real file is read.
export const ROLL_LAYOUTS: Record<string, RollLayout> = {};

export const getLayoutForCounty = (countyFips: string): RollLayout | undefined =>
  Object.values(ROLL_LAYOUTS).find((layout) => layout.countyFips === countyFips);
