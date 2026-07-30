import {
  CONTRACT_TYPE_FIELD_ID,
  CONTRACT_TYPES,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CONTRACT_TYPE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'contractType',
  label: 'Contract Type',
  icon: 'IconFileText',
  isNullable: true,
  options: CONTRACT_TYPES.map((contractType, index) => ({
    id: `f1000012-0001-4000-8000-${String(index).padStart(12, '0')}`,
    value: contractType.value,
    label: contractType.label,
    position: contractType.position,
    color: 'gray',
  })),
});
