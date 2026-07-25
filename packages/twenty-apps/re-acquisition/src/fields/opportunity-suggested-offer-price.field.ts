import { SUGGESTED_OFFER_PRICE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// Written by on-suggested-offer-recompute. Never watch this field in a trigger:
// the function that writes it also fires on opportunity.updated.
export default defineField({
  universalIdentifier: SUGGESTED_OFFER_PRICE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'suggestedOfferPrice',
  label: 'Suggested Offer Price',
  icon: 'IconCurrencyDollar',
  isNullable: true,
});
