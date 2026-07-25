import {
  RECOMMENDED_EXIT_TYPE_FIELD_ID,
  RECOMMENDED_EXIT_TYPES,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: RECOMMENDED_EXIT_TYPE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'recommendedExitType',
  label: 'Recommended Exit',
  icon: 'IconTarget',
  isNullable: true,
  options: RECOMMENDED_EXIT_TYPES.map((type, index) => ({
    id: `e1000012-0001-4000-8000-${String(index).padStart(12, '0')}`,
    value: type.value,
    label: type.label,
    position: type.position,
    color: type.color,
  })),
});
