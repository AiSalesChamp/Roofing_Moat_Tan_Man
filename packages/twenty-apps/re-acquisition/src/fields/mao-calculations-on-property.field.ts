import { FieldType, RelationType, defineField } from 'twenty-sdk/define';

import {
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  MAO_CALCULATIONS_ON_PROPERTY_FIELD_ID,
  MAO_PROPERTY_FIELD_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MAO_CALCULATIONS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'maoCalculations',
  label: 'MAO Calculations',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MAO_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
