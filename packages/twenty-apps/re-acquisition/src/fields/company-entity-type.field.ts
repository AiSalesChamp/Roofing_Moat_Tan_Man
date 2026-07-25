import { ENTITY_TYPE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: ENTITY_TYPE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.SELECT,
  name: 'entityType',
  label: 'Entity Type',
  icon: 'IconBuilding',
  isNullable: true,
  options: [
    { id: 'a4000004-0001-4000-8000-000000000001', value: 'OWNER_LLC', label: 'Owner LLC', position: 0, color: 'green' },
    { id: 'a4000004-0001-4000-8000-000000000002', value: 'TITLE_COMPANY', label: 'Title Company', position: 1, color: 'blue' },
    { id: 'a4000004-0001-4000-8000-000000000003', value: 'LENDER', label: 'Lender', position: 2, color: 'purple' },
    { id: 'a4000004-0001-4000-8000-000000000004', value: 'BUYER_ENTITY', label: 'Buyer Entity', position: 3, color: 'orange' },
    { id: 'a4000004-0001-4000-8000-000000000005', value: 'BROKERAGE', label: 'Brokerage', position: 4, color: 'turquoise' },
  ],
});
