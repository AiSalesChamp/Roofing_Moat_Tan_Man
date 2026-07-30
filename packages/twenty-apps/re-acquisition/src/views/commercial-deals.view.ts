import {
  CAP_RATE_FIELD_ID,
  COMMERCIAL_DEALS_VIEW_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  NOI_FIELD_ID,
  OPP_NAME_FIELD_ID,
  OPP_STAGE_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: COMMERCIAL_DEALS_VIEW_ID,
  name: 'Commercial / Industrial',
  icon: 'IconBuildingFactory2',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: NOI_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: CAP_RATE_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'v1000080-0001-4000-8000-000000000007', fieldMetadataUniversalIdentifier: OPP_STAGE_FIELD_ID, position: 5, isVisible: false },
  ],
  filters: [
    {
      universalIdentifier: 'v1000080-0001-4000-8000-000000000006',
      fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['COMMERCIAL', 'INDUSTRIAL'],
    },
  ],
});
