import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { PERSON_ENGINE_OWNER_ID_FIELD_ID } from 'src/constants/lead-engine-identifiers';

export default defineField({
  universalIdentifier: PERSON_ENGINE_OWNER_ID_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'engineOwnerId',
  label: 'Engine Owner ID',
  icon: 'IconFingerprint',
  isNullable: true,
});
