import { CONTACT_ROLE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CONTACT_ROLE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'contactRole',
  label: 'Contact Role',
  icon: 'IconUser',
  isNullable: true,
  options: [
    { id: 'g1000001-0001-4000-8000-000000000001', value: 'SELLER', label: 'Seller', position: 0, color: 'green' },
    { id: 'g1000001-0001-4000-8000-000000000002', value: 'BUYER', label: 'Buyer', position: 1, color: 'blue' },
    { id: 'g1000001-0001-4000-8000-000000000003', value: 'BROKER', label: 'Broker', position: 2, color: 'purple' },
    { id: 'g1000001-0001-4000-8000-000000000004', value: 'ATTORNEY', label: 'Attorney', position: 3, color: 'orange' },
    { id: 'g1000001-0001-4000-8000-000000000005', value: 'TITLE', label: 'Title', position: 4, color: 'turquoise' },
    { id: 'g1000001-0001-4000-8000-000000000006', value: 'LENDER', label: 'Lender', position: 5, color: 'yellow' },
    { id: 'g1000001-0001-4000-8000-000000000007', value: 'CONTRACTOR', label: 'Contractor', position: 6, color: 'pink' },
    { id: 'g1000001-0001-4000-8000-000000000008', value: 'SURVEYOR', label: 'Surveyor', position: 7, color: 'gray' },
  ],
});
