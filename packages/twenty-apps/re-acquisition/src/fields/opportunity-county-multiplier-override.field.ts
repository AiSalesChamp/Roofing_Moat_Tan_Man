import { COUNTY_MULTIPLIER_OVERRIDE_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: COUNTY_MULTIPLIER_OVERRIDE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'countyMultiplierOverride',
  label: 'County Multiplier Override',
  icon: 'IconAdjustments',
  isNullable: true,
  universalSettings: { decimals: 2 },
});
