import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

import {
  DISTRESS_EVENT_OBJECT_UNIVERSAL_IDENTIFIER,
  DISTRESS_EVENT_PROPERTY_FIELD_ID,
  DISTRESS_EVENTS_ON_PROPERTY_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// MANY_TO_ONE side. SET_NULL on delete, not CASCADE: deleting a property record in
// the CRM must not destroy the public-record evidence attached to it. The engine
// remains the system of record either way.
export default defineField({
  universalIdentifier: DISTRESS_EVENT_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: DISTRESS_EVENT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'property',
  label: 'Property',
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    DISTRESS_EVENTS_ON_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'propertyId',
  },
});
