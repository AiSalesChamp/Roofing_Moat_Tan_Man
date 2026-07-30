import { OFFER_AGGRESSIVENESS_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: OFFER_AGGRESSIVENESS_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'offerAggressiveness',
  label: 'Offer Aggressiveness',
  icon: 'IconAdjustments',
  isNullable: true,
  universalSettings: { decimals: 2 },
});
