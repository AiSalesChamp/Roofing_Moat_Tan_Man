import {
  ARV_FIELD_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_UNDERWRITING_FIELDS_VIEW_ID,
  PROJECTED_PROFIT_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// Backing view for the "Underwriting Fields" widget on the deal record page.
export default defineView({
  universalIdentifier: DEAL_UNDERWRITING_FIELDS_VIEW_ID,
  name: 'Deal Underwriting Fields',
  icon: 'IconList',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0002-4000-8000-000000000001', fieldMetadataUniversalIdentifier: ARV_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a1000042-0002-4000-8000-000000000002', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a1000042-0002-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PROJECTED_PROFIT_FIELD_ID, position: 2, isVisible: true },
  ],
});
