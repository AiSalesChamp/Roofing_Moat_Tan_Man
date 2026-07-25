import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  EXIT_TYPES,
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  MAO_COMPUTED_AT_FIELD_ID,
  MAO_EXIT_TYPE_FIELD_ID,
  MAO_GATE_REASON_FIELD_ID,
  MAO_GATE_STATUS_FIELD_ID,
  MAO_GATE_STATUSES,
  MAO_INPUTS_SNAPSHOT_FIELD_ID,
  MAO_VALUE_FIELD_ID,
  MAO_VERSION_FIELD_ID,
} from 'src/constants/universal-identifiers';

// Append-only, versioned record — never overwrite a row, always insert the
// next version. This is the audit trail behind the Opportunity MAO rollups.
export default defineObject({
  universalIdentifier: MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'maoCalculation',
  namePlural: 'maoCalculations',
  labelSingular: 'MAO Calculation',
  labelPlural: 'MAO Calculations',
  description:
    'Versioned Maximum Allowable Offer calculation for one exit path on one deal',
  icon: 'IconCalculator',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: MAO_EXIT_TYPE_FIELD_ID,
  fields: [
    {
      universalIdentifier: MAO_EXIT_TYPE_FIELD_ID,
      type: FieldType.SELECT,
      name: 'exitType',
      label: 'Exit Type',
      icon: 'IconArrowsSplit',
      isNullable: false,
      options: EXIT_TYPES.map((type, index) => ({
        id: `a4000005-0001-4000-8000-${String(index).padStart(12, '0')}`,
        value: type.value,
        label: type.label,
        position: type.position,
        color: type.color,
      })),
    },
    {
      universalIdentifier: MAO_VALUE_FIELD_ID,
      type: FieldType.CURRENCY,
      name: 'maoValue',
      label: 'MAO Value',
      icon: 'IconCoin',
      isNullable: true,
    },
    {
      universalIdentifier: MAO_VERSION_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'version',
      label: 'Version',
      icon: 'IconVersions',
      isNullable: false,
      defaultValue: 1,
    },
    {
      universalIdentifier: MAO_GATE_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'gateStatus',
      label: 'Gate Status',
      icon: 'IconShieldCheck',
      defaultValue: "'NOT_APPLICABLE'",
      options: MAO_GATE_STATUSES.map((status, index) => ({
        id: `a4000006-0001-4000-8000-${String(index).padStart(12, '0')}`,
        value: status.value,
        label: status.label,
        position: status.position,
        color: status.color,
      })),
    },
    {
      universalIdentifier: MAO_GATE_REASON_FIELD_ID,
      type: FieldType.TEXT,
      name: 'gateReason',
      label: 'Gate Reason',
      icon: 'IconAlertTriangle',
      isNullable: true,
    },
    {
      universalIdentifier: MAO_INPUTS_SNAPSHOT_FIELD_ID,
      type: FieldType.RAW_JSON,
      name: 'inputsSnapshot',
      label: 'Inputs Snapshot',
      icon: 'IconCode',
      isNullable: true,
    },
    {
      universalIdentifier: MAO_COMPUTED_AT_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'computedAt',
      label: 'Computed At',
      icon: 'IconClock',
      isNullable: true,
    },
  ],
});
