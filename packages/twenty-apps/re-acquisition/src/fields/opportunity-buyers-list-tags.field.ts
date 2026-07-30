import { BUYERS_LIST_TAGS_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: BUYERS_LIST_TAGS_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'buyersListTags',
  label: 'Buyers List Tags',
  icon: 'IconTags',
  isNullable: true,
  options: [
    { id: 'f1000004-0001-4000-8000-000000000001', value: 'CASH_BUYER', label: 'Cash Buyer', position: 0, color: 'green' },
    { id: 'f1000004-0001-4000-8000-000000000002', value: 'LAND_BUYER', label: 'Land Buyer', position: 1, color: 'turquoise' },
    { id: 'f1000004-0001-4000-8000-000000000003', value: 'COMMERCIAL_BUYER', label: 'Commercial Buyer', position: 2, color: 'blue' },
    { id: 'f1000004-0001-4000-8000-000000000004', value: 'INDUSTRIAL_BUYER', label: 'Industrial Buyer', position: 3, color: 'orange' },
  ],
});
