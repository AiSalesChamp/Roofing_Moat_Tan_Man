import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

import {
  MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  MAO_CALCULATIONS_ON_PROPERTY_FIELD_ID,
  MAO_PROPERTY_FIELD_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MAO_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: MAO_CALCULATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'property',
  label: 'Property',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    MAO_CALCULATIONS_ON_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'maoPropertyId',
  },
});
