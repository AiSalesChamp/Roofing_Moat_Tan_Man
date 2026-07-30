import {
  CONTRACT_PRICE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  LAND_DEALS_VIEW_ID,
  OPP_NAME_FIELD_ID,
  OPP_STAGE_FIELD_ID,
  PRICE_PER_ACRE_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: LAND_DEALS_VIEW_ID,
  name: 'Land Deals',
  icon: 'IconTrees',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v1000070-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000070-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000070-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v1000070-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: PRICE_PER_ACRE_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'v1000070-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: OPP_STAGE_FIELD_ID, position: 4, isVisible: false },
  ],
  filters: [
    {
      universalIdentifier: 'v1000070-0001-4000-8000-000000000005',
      fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
      operand: ViewFilterOperand.CONTAINS,
      value: ['LAND'],
    },
  ],
});
