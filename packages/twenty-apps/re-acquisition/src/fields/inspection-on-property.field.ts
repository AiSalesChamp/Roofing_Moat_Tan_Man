import {
  INSPECTION_PROPERTY_FIELD_ID,
  INSPECTIONS_ON_PROPERTY_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INSPECTION_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'inspectionProperty',
  label: 'Property',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: INSPECTIONS_ON_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'propertyId',
  },
});
