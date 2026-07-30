// Universal identifiers for the underwriting layer: tiered MAO calculations,
// hyperscale exit gating, and infrastructure signals.
//
// This module backfills source for schema that already exists in the live
// workspace (see DRIFT.md section A). Kept separate so the reconciliation is
// reviewable as one unit, mirroring lead-engine-identifiers.ts.
//
// Prefix allocation, continuing the existing convention:
//   a100000a  maoCalculation object + fields
//   a100000b  infrastructureSignal object + fields
//   a1000012  opportunity underwriting fields
//   a1000093  property underwriting fields
//   a1000094  comparableSale underwriting fields

// --- Objects ---
export const MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER =
  'a100000a-0000-4000-8000-000000000001';
export const INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER =
  'a100000b-0000-4000-8000-000000000001';

// --- maoCalculation fields ---
export const MAO_CALC_NAME_FIELD_ID = 'a100000a-0000-4000-8000-000000000002';
export const MAO_CALC_EXIT_TYPE_FIELD_ID =
  'a100000a-0000-4000-8000-000000000003';
export const MAO_CALC_VALUE_FIELD_ID = 'a100000a-0000-4000-8000-000000000004';
export const MAO_CALC_VERSION_FIELD_ID =
  'a100000a-0000-4000-8000-000000000005';
export const MAO_CALC_GATE_STATUS_FIELD_ID =
  'a100000a-0000-4000-8000-000000000006';
export const MAO_CALC_GATE_REASON_FIELD_ID =
  'a100000a-0000-4000-8000-000000000007';
export const MAO_CALC_INPUTS_SNAPSHOT_FIELD_ID =
  'a100000a-0000-4000-8000-000000000008';
export const MAO_CALC_COMPUTED_AT_FIELD_ID =
  'a100000a-0000-4000-8000-000000000009';
export const MAO_CALC_OPPORTUNITY_FIELD_ID =
  'a100000a-0000-4000-8000-00000000000a';
export const MAO_CALCS_ON_OPPORTUNITY_FIELD_ID =
  'a100000a-0000-4000-8000-00000000000b';
export const MAO_CALC_PROPERTY_FIELD_ID =
  'a100000a-0000-4000-8000-00000000000c';
export const MAO_CALCS_ON_PROPERTY_FIELD_ID =
  'a100000a-0000-4000-8000-00000000000d';

// --- infrastructureSignal fields ---
export const INFRA_SIGNAL_NAME_FIELD_ID =
  'a100000b-0000-4000-8000-000000000002';
export const INFRA_INTERCONNECTION_STATUS_FIELD_ID =
  'a100000b-0000-4000-8000-000000000003';
export const INFRA_SUBSTATION_DISTANCE_FIELD_ID =
  'a100000b-0000-4000-8000-000000000004';
export const INFRA_TRANSMISSION_DISTANCE_FIELD_ID =
  'a100000b-0000-4000-8000-000000000005';
export const INFRA_FIBER_DISTANCE_FIELD_ID =
  'a100000b-0000-4000-8000-000000000006';
export const INFRA_WATER_ACCESS_FIELD_ID =
  'a100000b-0000-4000-8000-000000000007';
export const INFRA_TIMELINE_MONTHS_FIELD_ID =
  'a100000b-0000-4000-8000-000000000008';
export const INFRA_ASSESSED_DATE_FIELD_ID =
  'a100000b-0000-4000-8000-000000000009';
export const INFRA_NOTES_FIELD_ID = 'a100000b-0000-4000-8000-00000000000a';
export const INFRA_PROPERTY_FIELD_ID = 'a100000b-0000-4000-8000-00000000000b';
export const INFRA_SIGNALS_ON_PROPERTY_FIELD_ID =
  'a100000b-0000-4000-8000-00000000000c';

// --- Opportunity underwriting fields ---
export const MAO_WHOLESALE_FLIP_FIELD_ID =
  'a1000012-0000-4000-8000-000000000001';
export const MAO_ENTITLE_HOLD_FIELD_ID =
  'a1000012-0000-4000-8000-000000000002';
export const MAO_HYPERSCALE_DISPOSITION_FIELD_ID =
  'a1000012-0000-4000-8000-000000000003';
export const MAO_LAST_COMPUTED_AT_FIELD_ID =
  'a1000012-0000-4000-8000-000000000004';
export const TARGET_MARGIN_FIELD_ID = 'a1000012-0000-4000-8000-000000000005';
export const SUGGESTED_OFFER_PRICE_FIELD_ID =
  'a1000012-0000-4000-8000-000000000006';
export const ENTITLEMENT_CARRY_COST_FIELD_ID =
  'a1000012-0000-4000-8000-000000000007';
export const POST_ENTITLEMENT_VALUE_FIELD_ID =
  'a1000012-0000-4000-8000-000000000008';
export const OFFER_AGGRESSIVENESS_FIELD_ID =
  'a1000012-0000-4000-8000-000000000009';
export const COUNTY_MULTIPLIER_OVERRIDE_FIELD_ID =
  'a1000012-0000-4000-8000-00000000000a';
export const REALIZED_VALUE_RATIO_FIELD_ID =
  'a1000012-0000-4000-8000-00000000000b';
export const HYPERSCALE_GATE_STATUS_FIELD_ID =
  'a1000012-0000-4000-8000-00000000000c';
export const HYPERSCALE_GATE_REASON_FIELD_ID =
  'a1000012-0000-4000-8000-00000000000d';
export const RECOMMENDED_EXIT_TYPE_FIELD_ID =
  'a1000012-0000-4000-8000-00000000000e';
export const NEXT_ACTION_FIELD_ID = 'a1000012-0000-4000-8000-00000000000f';
export const NEXT_ACTION_DATE_FIELD_ID =
  'a1000012-0000-4000-8000-000000000010';
export const OPP_COUNTY_FIELD_ID = 'a1000012-0000-4000-8000-000000000011';

// --- Property underwriting fields ---
export const CAD_LAND_MARKET_VALUE_FIELD_ID =
  'a1000093-0000-4000-8000-000000000001';
export const ZONING_TRAJECTORY_FIELD_ID =
  'a1000093-0000-4000-8000-000000000002';

// --- ComparableSale underwriting fields ---
export const COMP_ACREAGE_FIELD_ID = 'a1000094-0000-4000-8000-000000000001';
export const COMP_ROAD_ACCESS_RATING_FIELD_ID =
  'a1000094-0000-4000-8000-000000000002';
export const COMP_BUILDABILITY_RATING_FIELD_ID =
  'a1000094-0000-4000-8000-000000000003';
export const COMP_POWER_FIBER_ADJACENT_FIELD_ID =
  'a1000094-0000-4000-8000-000000000004';

// Shared option sets. Values must match the live workspace enums exactly.
export const EXIT_TYPES = [
  { value: 'WHOLESALE_FLIP', label: 'Wholesale / Flip', position: 0, color: 'blue' },
  { value: 'ENTITLE_HOLD', label: 'Entitle & Hold', position: 1, color: 'turquoise' },
  { value: 'HYPERSCALE_DISPOSITION', label: 'Hyperscale Disposition', position: 2, color: 'purple' },
] as const;

export const COMP_QUALITY_RATINGS = [
  { value: 'GOOD', label: 'Good', position: 0, color: 'green' },
  { value: 'FAIR', label: 'Fair', position: 1, color: 'yellow' },
  { value: 'POOR', label: 'Poor', position: 2, color: 'red' },
  { value: 'UNKNOWN', label: 'Unknown', position: 3, color: 'gray' },
] as const;
