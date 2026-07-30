import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_ENGINE_PARCEL_ID_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_ENGINE_PARCEL_ID_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.TEXT,
  name: 'engineParcelId',
  label: 'Engine Parcel ID',
  icon: 'IconFingerprint',
  isNullable: true,
});
