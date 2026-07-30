import { ENTITLEMENT_CARRY_COST_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: ENTITLEMENT_CARRY_COST_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'entitlementCarryCost',
  label: 'Entitlement Carry Cost',
  icon: 'IconReceipt',
  isNullable: true,
});
