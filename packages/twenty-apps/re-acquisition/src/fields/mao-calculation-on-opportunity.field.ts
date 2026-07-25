import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import {
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  MAO_CALCULATIONS_ON_OPPORTUNITY_FIELD_ID,
  MAO_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MAO_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier: MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'opportunity',
  label: 'Deal',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    MAO_CALCULATIONS_ON_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'maoOpportunityId',
  },
});
