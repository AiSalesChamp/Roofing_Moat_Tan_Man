import {
  MAO_CALC_OPPORTUNITY_FIELD_ID,
  MAO_CALCS_ON_OPPORTUNITY_FIELD_ID,
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_CALC_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier: MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'opportunity',
  label: 'Opportunity',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    MAO_CALCS_ON_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'opportunityId',
  },
});
