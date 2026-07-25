import {
  ALL_DEALS_VIEW_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  OPP_CLOSE_DATE_FIELD_ID,
  OPP_NAME_FIELD_ID,
  OPP_OWNER_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: ALL_DEALS_VIEW_ID,
  name: 'All Deals',
  icon: 'IconTargetArrow',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: OPP_CLOSE_DATE_FIELD_ID, position: 5, isVisible: true },
    { universalIdentifier: 'a2000010-0001-4000-8000-000000000007', fieldMetadataUniversalIdentifier: OPP_OWNER_FIELD_ID, position: 6, isVisible: true },
  ],
});
