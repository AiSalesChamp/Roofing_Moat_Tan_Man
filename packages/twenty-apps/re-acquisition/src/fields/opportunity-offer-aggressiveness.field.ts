import { OFFER_AGGRESSIVENESS_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// 0-1. Higher pushes the offer toward full CAD-anchored value (fewer contracts,
// thinner spread); lower pushes for volume. Blank uses the engine default.
export default defineField({
  universalIdentifier: OFFER_AGGRESSIVENESS_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'offerAggressiveness',
  label: 'Offer Aggressiveness',
  icon: 'IconAdjustments',
  isNullable: true,
  universalSettings: { decimals: 2 },
});
