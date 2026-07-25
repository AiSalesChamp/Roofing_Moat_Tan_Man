import {
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  HYPERSCALE_GATE_REASON_FIELD_ID,
  HYPERSCALE_GATE_STATUS_FIELD_ID,
  HYPERSCALE_QUEUE_VIEW_ID,
  MAO_HYPERSCALE_DISPOSITION_FIELD_ID,
  OPP_NAME_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: HYPERSCALE_QUEUE_VIEW_ID,
  name: 'Hyperscale Queue',
  icon: 'IconBolt',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: MAO_HYPERSCALE_DISPOSITION_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: HYPERSCALE_GATE_STATUS_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a20000d0-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: HYPERSCALE_GATE_REASON_FIELD_ID, position: 5, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'a20000d0-0001-4000-8000-000000000007',
      fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
      operand: ViewFilterOperand.CONTAINS,
      value: ['HYPERSCALE'],
    },
  ],
});
