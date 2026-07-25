import {
  INSPECTION_PROPERTY_FIELD_ID,
  INSPECTIONS_ON_PROPERTY_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INSPECTIONS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'inspections',
  label: 'Inspections',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: INSPECTION_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
