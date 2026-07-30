import {
  INSPECTION_OPPORTUNITY_FIELD_ID,
  INSPECTIONS_ON_OPPORTUNITY_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INSPECTION_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'inspectionOpportunity',
  label: 'Deal',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: INSPECTIONS_ON_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'inspectionOpportunityId',
  },
});
