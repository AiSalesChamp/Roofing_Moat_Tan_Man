import {
  DEAD_DEALS_VIEW_ID,
  DEAL_STAGE_FIELD_ID,
  OPP_NAME_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: DEAD_DEALS_VIEW_ID,
  name: 'Dead Deals',
  icon: 'IconSkull',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a2000040-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a2000040-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'a2000040-0001-4000-8000-000000000003',
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['DEAD'],
    },
  ],
});
