import {
  SIGNATURE_STATUS_FIELD_ID,
  SIGNATURE_STATUSES,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: SIGNATURE_STATUS_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'signatureStatus',
  label: 'Signature Status',
  icon: 'IconSignature',
  isNullable: false,
  defaultValue: "'NOT_SENT'",
  options: SIGNATURE_STATUSES.map((status, index) => ({
    id: `f1000011-0001-4000-8000-${String(index).padStart(12, '0')}`,
    value: status.value,
    label: status.label,
    position: status.position,
    color: status.color,
  })),
});
