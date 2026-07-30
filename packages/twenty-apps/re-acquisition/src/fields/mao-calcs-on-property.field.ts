import {
  MAO_CALC_PROPERTY_FIELD_ID,
  MAO_CALCS_ON_PROPERTY_FIELD_ID,
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FieldType, RelationType, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_CALCS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'maoCalculations',
  label: 'MAO Calculations',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MAO_CALC_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
