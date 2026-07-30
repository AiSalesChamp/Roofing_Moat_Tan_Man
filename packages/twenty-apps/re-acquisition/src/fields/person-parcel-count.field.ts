import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { PERSON_PARCEL_COUNT_FIELD_ID } from 'src/constants/lead-engine-identifiers';

export default defineField({
  universalIdentifier: PERSON_PARCEL_COUNT_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'parcelCount',
  label: 'Parcel Count',
  icon: 'IconHome',
  isNullable: true,
});
