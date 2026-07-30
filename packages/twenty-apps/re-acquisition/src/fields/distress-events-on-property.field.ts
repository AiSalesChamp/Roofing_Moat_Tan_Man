import {
  FieldType,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

import {
  DISTRESS_EVENT_OBJECT_UNIVERSAL_IDENTIFIER,
  DISTRESS_EVENT_PROPERTY_FIELD_ID,
  DISTRESS_EVENTS_ON_PROPERTY_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// One parcel has many distress events over time. This is the ONE_TO_MANY side.
export default defineField({
  universalIdentifier: DISTRESS_EVENTS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'distressEvents',
  label: 'Distress Events',
  icon: 'IconAlertTriangle',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    DISTRESS_EVENT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    DISTRESS_EVENT_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
