import { REALIZED_VALUE_RATIO_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// Contract price / CAD land market value on a real closing. Averaged by county
// on the dashboard, this is what calibrates COUNTY_MULTIPLIERS — a number no
// vendor sells, derived only from the operator's own deals.
export default defineField({
  universalIdentifier: REALIZED_VALUE_RATIO_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'realizedValueRatio',
  label: 'Realized Value Ratio',
  icon: 'IconChartHistogram',
  isNullable: true,
  universalSettings: { decimals: 3 },
});
