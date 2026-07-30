import { REALIZED_VALUE_RATIO_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: REALIZED_VALUE_RATIO_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'realizedValueRatio',
  label: 'Realized Value Ratio',
  icon: 'IconPercentage',
  isNullable: true,
  universalSettings: { decimals: 2 },
});
