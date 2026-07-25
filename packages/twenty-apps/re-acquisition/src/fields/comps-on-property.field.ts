import {
  COMP_PROPERTY_FIELD_ID,
  COMPS_ON_PROPERTY_FIELD_ID,
  COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: COMPS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'comparableSales',
  label: 'Comparable Sales',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: COMP_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
