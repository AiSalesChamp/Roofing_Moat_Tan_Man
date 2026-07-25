import {
  HYPERSCALE_GATE_STATUS_FIELD_ID,
  HYPERSCALE_GATE_STATUSES,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: HYPERSCALE_GATE_STATUS_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'hyperscaleGateStatus',
  label: 'Hyperscale Gate Status',
  icon: 'IconShieldCheck',
  defaultValue: "'NOT_EVALUATED'",
  options: HYPERSCALE_GATE_STATUSES.map((status, index) => ({
    id: `e1000013-0001-4000-8000-${String(index).padStart(12, '0')}`,
    value: status.value,
    label: status.label,
    position: status.position,
    color: status.color,
  })),
});
