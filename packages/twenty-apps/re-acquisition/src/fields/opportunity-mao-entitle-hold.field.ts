import { MAO_ENTITLE_HOLD_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_ENTITLE_HOLD_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'maoEntitleHold',
  label: 'MAO — Entitle & Hold',
  icon: 'IconCalculator',
  isNullable: true,
});
