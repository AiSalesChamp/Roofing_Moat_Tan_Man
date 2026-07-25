import {
  BUYER_ASSIGNED_FIELD_ID,
  BUYER_DEALS_ON_PERSON_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: BUYER_ASSIGNED_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'buyerAssigned',
  label: 'Buyer Assigned',
  icon: 'IconUserCheck',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    BUYER_DEALS_ON_PERSON_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'buyerAssignedId',
  },
});
