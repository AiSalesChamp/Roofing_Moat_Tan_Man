// The identity layer's input is a county appraisal roll: a bulk file published by
// the CAD under the Public Information Act. Not scraped — downloaded.
//
// Every CAD invented its own layout, so the adapter is one generic reader driven by
// a per-county column map. Adding county #3 is a config entry, not a new parser.

export type RollFieldName =
  | 'apn'
  | 'ownerName'
  | 'ownerMailingLine1'
  | 'ownerMailingLine2'
  | 'ownerMailingCity'
  | 'ownerMailingState'
  | 'ownerMailingZip'
  | 'situsStreet'
  | 'situsCity'
  | 'situsZip'
  | 'legalDescription'
  | 'landUseCode'
  | 'acreage'
  | 'landMarketValue'
  | 'improvementValue'
  | 'totalMarketValue'
  | 'deedDate'
  | 'homesteadFlag';

// Fields without which a row cannot become a parcel+owner pair at all. A roll
// missing these is the wrong file, not a partial one — fail the import rather than
// load half an identity layer.
//
// The mailing address is deliberately NOT required. A parcel exists whether or not
// its owner is reachable by mail, and dropping the unreachable ones would hide real
// inventory and, worse, empty out the `no_mailing_address` withhold reason — which is
// the signal that tells you your data layer, not your threshold, is the problem.
// Reachability is the promotion gate's decision, not the reader's.
export const REQUIRED_ROLL_FIELDS: readonly RollFieldName[] = ['apn', 'ownerName'];

export type DelimitedRollLayout = {
  kind: 'delimited';
  delimiter: ',' | '\t' | '|';
  hasHeaderRow: boolean;
  // Header name -> canonical field. Matched case-insensitively, ignoring spaces
  // and underscores, so "Owner Name" and "owner_name" both resolve.
  columns: Partial<Record<RollFieldName, string>>;
  // Used only when hasHeaderRow is false.
  columnIndexes?: Partial<Record<RollFieldName, number>>;
};

export type FixedWidthRollLayout = {
  kind: 'fixed_width';
  // [startOffset, length], zero-indexed — as published in the CAD's record layout PDF.
  fields: Partial<Record<RollFieldName, readonly [number, number]>>;
};

export type RollLayout = {
  layoutId: string;
  countyFips: string;
  rollYear: number | 'from_filename';
  encoding: 'utf8' | 'latin1';
  // Rows to skip before data begins, on top of the header row.
  skipRows: number;
  // Rows whose land use code marks them as personal property or minerals rather
  // than real property. Those are not parcels we can ever buy.
  excludeLandUseCodes: readonly string[];
  spec: DelimitedRollLayout | FixedWidthRollLayout;
};

export type RollRow = Partial<Record<RollFieldName, string>>;

export const canonicalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');
