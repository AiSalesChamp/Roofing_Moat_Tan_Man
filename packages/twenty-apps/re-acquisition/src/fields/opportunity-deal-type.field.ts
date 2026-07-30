import { DEAL_TYPE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: DEAL_TYPE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'dealType',
  label: 'Deal Type',
  icon: 'IconTags',
  isNullable: true,
  options: [
    { id: 'e1000010-0001-4000-8000-000000000001', value: 'WHOLESALE', label: 'Wholesale', position: 0, color: 'blue' },
    { id: 'e1000010-0001-4000-8000-000000000002', value: 'FLIP', label: 'Flip', position: 1, color: 'green' },
    { id: 'e1000010-0001-4000-8000-000000000003', value: 'LAND', label: 'Land', position: 2, color: 'turquoise' },
    { id: 'e1000010-0001-4000-8000-000000000004', value: 'COMMERCIAL', label: 'Commercial', position: 3, color: 'purple' },
    { id: 'e1000010-0001-4000-8000-000000000005', value: 'INDUSTRIAL', label: 'Industrial', position: 4, color: 'orange' },
  ],
});
