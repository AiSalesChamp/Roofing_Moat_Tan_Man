import { InterconnectionStatus, ZoningTrajectory } from './types';

// Tunable placeholders. Replace with numbers derived from actual closed
// deals during Phase 7 field testing — these are defensible starting
// points, not calibrated figures.

export const DEFAULT_WHOLESALE_FEE_PCT = 0.65; // midpoint of the plan's 0.60-0.70 range

export const RECENCY_HALF_LIFE_MONTHS = 24;

// Recency weight for a comp with a missing or unparseable sale date. Mirrors
// the UNKNOWN rating weight: such a comp still counts, but never outranks a
// comp we can actually date.
export const UNKNOWN_RECENCY_WEIGHT = 0.5;

export const DEFAULT_MAX_TIMELINE_MONTHS = 36;

export const ENTITLEMENT_RISK_DISCOUNTS: Record<ZoningTrajectory, number> = {
  UPZONING_LIKELY: 0.9,
  STABLE: 0.8,
  DOWNZONING_RISK: 0.55,
  UNKNOWN: 0.65,
};

export const HYPERSCALE_RISK_DISCOUNTS: Record<
  Exclude<InterconnectionStatus, 'NO_PATH'>,
  number
> = {
  CONFIRMED: 0.95,
  QUEUE_POSITION_SECURED: 0.8,
  STUDY_IN_PROGRESS: 0.65,
  UNCONFIRMED: 0.45,
};
