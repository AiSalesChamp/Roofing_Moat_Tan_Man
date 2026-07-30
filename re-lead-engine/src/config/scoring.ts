// Rules-based motivation score. No ML: there is no outcome data yet, and a model
// trained on zero closed deals would just launder these same guesses through a
// harder-to-audit function.
//
// Bump WEIGHTS_VERSION on every change. Scores are stored with the version that
// produced them, so a threshold argument later can be settled with data instead
// of memory.
export const WEIGHTS_VERSION = 'v1';

export type ScoreRuleName =
  | 'activeNoticeOfTrusteeSale'
  | 'taxSale'
  | 'struckOff'
  | 'multiYearTaxDelinquency'
  | 'probate'
  | 'lien'
  | 'codeViolation'
  | 'absenteeOwner'
  | 'longTenure'
  | 'vacantUnimproved';

// Ordered by the spec's ranking: active NOTS > multi-year delinquency >
// absentee > long tenure > vacant/unimproved.
export const SCORE_WEIGHTS: Record<ScoreRuleName, number> = {
  activeNoticeOfTrusteeSale: 32,
  multiYearTaxDelinquency: 26,
  absenteeOwner: 16,
  longTenure: 10,
  vacantUnimproved: 10,

  // Secondary signals. Present in the enum, lower weight, because a single tax
  // sale posting is the normal state of a delinquent parcel rather than evidence
  // the owner is ready to talk.
  taxSale: 18,
  struckOff: 20,
  probate: 14,
  lien: 8,
  codeViolation: 5,
};

export const SCORING_THRESHOLDS = {
  // A parcel whose most recent tax-sale posting is older than this is stale
  // signal, not motivation.
  distressRecencyDays: 180,

  // Two or more distinct delinquent tax years is the "multi-year" test. One year
  // is an oversight; three is a decision.
  multiYearDelinquencyMinYears: 2,

  // Held this long without improving it. Land bought recently is usually held by
  // someone with a plan; land held 15 years with no structure usually is not.
  longTenureYears: 15,

  // Improvement value at or below this means unimproved for scoring purposes.
  // Not strictly zero — some CADs carry a nominal value for a fence or a well.
  unimprovedMaxImprovementValue: 5000,
} as const;

// Distress-derived rules are multiplied by the event's parse confidence, so a
// shaky free-text extraction cannot by itself push a parcel over the gate.
export const CONFIDENCE_WEIGHTED_RULES: readonly ScoreRuleName[] = [
  'activeNoticeOfTrusteeSale',
  'taxSale',
  'struckOff',
  'multiYearTaxDelinquency',
  'probate',
  'lien',
  'codeViolation',
];

export const MAX_SCORE = 100;
