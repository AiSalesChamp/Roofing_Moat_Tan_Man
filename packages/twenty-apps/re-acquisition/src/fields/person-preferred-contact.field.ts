import { PREFERRED_CONTACT_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: PREFERRED_CONTACT_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.SELECT,
  name: 'preferredContactMethod',
  label: 'Preferred Contact Method',
  icon: 'IconPhone',
  isNullable: true,
  options: [
    { id: 'g1000002-0001-4000-8000-000000000001', value: 'PHONE', label: 'Phone', position: 0, color: 'blue' },
    { id: 'g1000002-0001-4000-8000-000000000002', value: 'EMAIL', label: 'Email', position: 1, color: 'green' },
    { id: 'g1000002-0001-4000-8000-000000000003', value: 'TEXT', label: 'Text', position: 2, color: 'purple' },
  ],
});
