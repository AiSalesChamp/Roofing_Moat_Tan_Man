import {
  MAO_CALC_OPPORTUNITY_FIELD_ID,
  MAO_CALCS_ON_OPPORTUNITY_FIELD_ID,
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';
import {
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_CALCS_ON_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'maoCalculations',
  label: 'MAO Calculations',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MAO_CALC_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
