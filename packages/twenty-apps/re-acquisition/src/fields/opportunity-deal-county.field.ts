import { DEAL_COUNTY_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// Denormalized copy of the linked Property's county, written by the offer
// recompute. A chart can only group by a field on its own object, so the
// calibration widget (AVG realizedValueRatio by county) needs it on the deal.
export default defineField({
  universalIdentifier: DEAL_COUNTY_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.TEXT,
  name: 'county',
  label: 'County',
  icon: 'IconMap',
  isNullable: true,
});
