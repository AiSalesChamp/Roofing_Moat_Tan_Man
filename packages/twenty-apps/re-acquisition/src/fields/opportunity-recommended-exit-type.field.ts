import { RECOMMENDED_EXIT_TYPE_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: RECOMMENDED_EXIT_TYPE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'recommendedExitType',
  label: 'Recommended Exit',
  icon: 'IconRoute',
  isNullable: true,
  options: [
    { id: 'f1000012-000e-4000-8000-000000000001', value: 'WHOLESALE_FLIP', label: 'Wholesale / Flip', position: 0, color: 'blue' },
    { id: 'f1000012-000e-4000-8000-000000000002', value: 'ENTITLE_HOLD', label: 'Entitle & Hold', position: 1, color: 'turquoise' },
    { id: 'f1000012-000e-4000-8000-000000000003', value: 'HYPERSCALE_DISPOSITION', label: 'Hyperscale Disposition', position: 2, color: 'purple' },
    { id: 'f1000012-000e-4000-8000-000000000004', value: 'INSUFFICIENT_DATA', label: 'Insufficient Data', position: 3, color: 'gray' },
  ],
});
