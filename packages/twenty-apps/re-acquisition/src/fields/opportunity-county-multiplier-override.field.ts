import { COUNTY_MULTIPLIER_OVERRIDE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// Per-deal escape hatch from the county default in offer-engine/constants.ts.
// Blank means "use the county map", not "use 0".
export default defineField({
  universalIdentifier: COUNTY_MULTIPLIER_OVERRIDE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'countyMultiplierOverride',
  label: 'County Multiplier Override',
  icon: 'IconMathSymbols',
  isNullable: true,
  universalSettings: { decimals: 3 },
});
