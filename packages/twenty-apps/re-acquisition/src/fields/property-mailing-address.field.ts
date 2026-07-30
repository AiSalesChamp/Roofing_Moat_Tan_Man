import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_MAILING_ADDRESS_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_MAILING_ADDRESS_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.ADDRESS,
  name: 'mailingAddress',
  label: 'Owner Mailing Address',
  icon: 'IconMailbox',
  isNullable: true,
});
