import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_IS_ABSENTEE_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_IS_ABSENTEE_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.BOOLEAN,
  name: 'isAbsentee',
  label: 'Absentee Owner',
  icon: 'IconHomeOff',
  isNullable: true,
});
