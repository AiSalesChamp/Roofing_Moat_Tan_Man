import {
  CONTRACT_PRICE_FIELD_ID,
  DD_DEADLINE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_SUMMARY_FIELDS_VIEW_ID,
  DEAL_TYPE_FIELD_ID,
  LEAD_SOURCE_FIELD_ID,
  PROJECTED_PROFIT_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// Backing view for the "Deal Summary Fields" widget on the deal record page.
export default defineView({
  universalIdentifier: DEAL_SUMMARY_FIELDS_VIEW_ID,
  name: 'Deal Summary Fields',
  icon: 'IconList',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: LEAD_SOURCE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: PROJECTED_PROFIT_FIELD_ID, position: 5, isVisible: true },
    { universalIdentifier: 'a1000042-0001-4000-8000-000000000007', fieldMetadataUniversalIdentifier: DD_DEADLINE_FIELD_ID, position: 6, isVisible: true },
  ],
});
