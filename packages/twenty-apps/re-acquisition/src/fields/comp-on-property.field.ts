import {
  COMP_PROPERTY_FIELD_ID,
  COMPS_ON_PROPERTY_FIELD_ID,
  COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: COMP_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'compProperty',
  label: 'Property',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: COMPS_ON_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'compPropertyId',
  },
});
