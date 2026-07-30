import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_LAST_DISTRESS_AT_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_LAST_DISTRESS_AT_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.DATE,
  name: 'lastDistressEventAt',
  label: 'Last Distress Event',
  icon: 'IconAlertTriangle',
  isNullable: true,
});
