import { POST_ENTITLEMENT_VALUE_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: POST_ENTITLEMENT_VALUE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'postEntitlementValue',
  label: 'Post-Entitlement Value',
  icon: 'IconBuildingEstate',
  isNullable: true,
});
