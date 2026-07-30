import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  EXIT_TYPES,
  MAO_CALC_COMPUTED_AT_FIELD_ID,
  MAO_CALC_EXIT_TYPE_FIELD_ID,
  MAO_CALC_GATE_REASON_FIELD_ID,
  MAO_CALC_GATE_STATUS_FIELD_ID,
  MAO_CALC_INPUTS_SNAPSHOT_FIELD_ID,
  MAO_CALC_NAME_FIELD_ID,
  MAO_CALC_VALUE_FIELD_ID,
  MAO_CALC_VERSION_FIELD_ID,
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';

// Audit-trail record for each MAO computation. The current values live on
// opportunity (maoWholesaleFlip / maoEntitleHold / maoHyperscaleDisposition);
// each recompute appends one row per exit type here with the exact inputs used,
// so offers are always traceable to the numbers behind them.
export default defineObject({
  universalIdentifier: MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'maoCalculation',
  namePlural: 'maoCalculations',
  labelSingular: 'MAO Calculation',
  labelPlural: 'MAO Calculations',
  description: 'Versioned max-allowable-offer computation with input snapshot',
  icon: 'IconCalculator',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: MAO_CALC_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: MAO_CALC_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      icon: 'IconCalculator',
      isNullable: true,
    },
    {
      universalIdentifier: MAO_CALC_EXIT_TYPE_FIELD_ID,
      type: FieldType.SELECT,
      name: 'exitType',
      label: 'Exit Type',
      icon: 'IconRoute',
      isNullable: false,
      defaultValue: "'WHOLESALE_FLIP'",
      options: EXIT_TYPES.map((option) => ({
        id: `f100000a-0003-4000-8000-00000000000${option.position + 1}`,
        ...option,
      })),
    },
    {
      universalIdentifier: MAO_CALC_VALUE_FIELD_ID,
      type: FieldType.CURRENCY,
      name: 'maoValue',
      label: 'MAO Value',
      icon: 'IconCoin',
      isNullable: true,
    },
    {
      // WEIGHTS_VERSION-style marker: which formula revision produced this row.
      universalIdentifier: MAO_CALC_VERSION_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'version',
      label: 'Formula Version',
      icon: 'IconVersions',
      isNullable: false,
      defaultValue: 1,
    },
    {
      universalIdentifier: MAO_CALC_GATE_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'gateStatus',
      label: 'Gate Status',
      icon: 'IconShieldCheck',
      isNullable: true,
      options: [
        { id: 'f100000a-0006-4000-8000-000000000001', value: 'PASSED', label: 'Passed', position: 0, color: 'green' },
        { id: 'f100000a-0006-4000-8000-000000000002', value: 'HARD_REJECTED', label: 'Hard Rejected', position: 1, color: 'red' },
        { id: 'f100000a-0006-4000-8000-000000000003', value: 'NOT_APPLICABLE', label: 'Not Applicable', position: 2, color: 'gray' },
      ],
    },
    {
      universalIdentifier: MAO_CALC_GATE_REASON_FIELD_ID,
      type: FieldType.TEXT,
      name: 'gateReason',
      label: 'Gate Reason',
      icon: 'IconInfoCircle',
      isNullable: true,
    },
    {
      // Everything the formula read: comp ids, price/acre, multipliers, margins.
      universalIdentifier: MAO_CALC_INPUTS_SNAPSHOT_FIELD_ID,
      type: FieldType.RAW_JSON,
      name: 'inputsSnapshot',
      label: 'Inputs Snapshot',
      icon: 'IconCode',
      isNullable: true,
    },
    {
      universalIdentifier: MAO_CALC_COMPUTED_AT_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'computedAt',
      label: 'Computed At',
      icon: 'IconClock',
      isNullable: true,
    },
  ],
});
