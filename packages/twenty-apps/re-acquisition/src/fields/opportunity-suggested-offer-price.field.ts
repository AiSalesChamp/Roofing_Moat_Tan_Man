import { SUGGESTED_OFFER_PRICE_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: SUGGESTED_OFFER_PRICE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'suggestedOfferPrice',
  label: 'Suggested Offer Price',
  icon: 'IconCoin',
  isNullable: true,
});
