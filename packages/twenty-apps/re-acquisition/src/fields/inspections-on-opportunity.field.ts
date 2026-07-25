import {
  INSPECTION_OPPORTUNITY_FIELD_ID,
  INSPECTIONS_ON_OPPORTUNITY_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INSPECTIONS_ON_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'inspections',
  label: 'Inspections',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: INSPECTION_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
