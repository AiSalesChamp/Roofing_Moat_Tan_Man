import {
  INFRA_PROPERTY_FIELD_ID,
  INFRA_SIGNALS_ON_PROPERTY_FIELD_ID,
  INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INFRA_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'infraProperty',
  label: 'Property',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    INFRA_SIGNALS_ON_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'infraPropertyId',
  },
});
