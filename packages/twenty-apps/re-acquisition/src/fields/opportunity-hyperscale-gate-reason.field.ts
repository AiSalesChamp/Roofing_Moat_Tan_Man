import { HYPERSCALE_GATE_REASON_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: HYPERSCALE_GATE_REASON_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.TEXT,
  name: 'hyperscaleGateReason',
  label: 'Hyperscale Gate Reason',
  icon: 'IconInfoCircle',
  isNullable: true,
});
