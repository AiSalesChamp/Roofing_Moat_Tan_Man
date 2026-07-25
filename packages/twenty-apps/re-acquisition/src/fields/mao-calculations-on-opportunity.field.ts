import {
  FieldType,
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
  universalIdentifier: MAO_CALCULATIONS_ON_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'maoCalculations',
  label: 'MAO Calculations',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MAO_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
