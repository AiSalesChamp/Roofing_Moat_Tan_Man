import {
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  MAO_WHOLESALE_FLIP_FIELD_ID,
  OPP_NAME_FIELD_ID,
  WHOLESALE_QUEUE_VIEW_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: WHOLESALE_QUEUE_VIEW_ID,
  name: 'Wholesale Queue',
  icon: 'IconArrowsExchange',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a2000050-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a2000050-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a2000050-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a2000050-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: MAO_WHOLESALE_FLIP_FIELD_ID, position: 3, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'a2000050-0001-4000-8000-000000000004',
      fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
      operand: ViewFilterOperand.CONTAINS,
      value: ['WHOLESALE'],
    },
    {
      universalIdentifier: 'a2000050-0001-4000-8000-000000000005',
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['ACQUIRED', 'DISPOSITION'],
    },
  ],
});
