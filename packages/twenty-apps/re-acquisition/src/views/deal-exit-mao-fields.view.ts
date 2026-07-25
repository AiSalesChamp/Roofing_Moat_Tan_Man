import {
  DEAL_EXIT_MAO_FIELDS_VIEW_ID,
  ENTITLEMENT_CARRY_COST_FIELD_ID,
  HYPERSCALE_GATE_REASON_FIELD_ID,
  HYPERSCALE_GATE_STATUS_FIELD_ID,
  MAO_ENTITLE_HOLD_FIELD_ID,
  MAO_HYPERSCALE_DISPOSITION_FIELD_ID,
  MAO_LAST_COMPUTED_AT_FIELD_ID,
  MAO_WHOLESALE_FLIP_FIELD_ID,
  POST_ENTITLEMENT_VALUE_FIELD_ID,
  RECOMMENDED_EXIT_TYPE_FIELD_ID,
  TARGET_MARGIN_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// Backing view for the "MAO by Exit Path" widget on the deal record page.
export default defineView({
  universalIdentifier: DEAL_EXIT_MAO_FIELDS_VIEW_ID,
  name: 'Deal Exit Strategy & MAO Fields',
  icon: 'IconTarget',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000001', fieldMetadataUniversalIdentifier: RECOMMENDED_EXIT_TYPE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000002', fieldMetadataUniversalIdentifier: MAO_WHOLESALE_FLIP_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000003', fieldMetadataUniversalIdentifier: MAO_ENTITLE_HOLD_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000004', fieldMetadataUniversalIdentifier: MAO_HYPERSCALE_DISPOSITION_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000005', fieldMetadataUniversalIdentifier: HYPERSCALE_GATE_STATUS_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000006', fieldMetadataUniversalIdentifier: HYPERSCALE_GATE_REASON_FIELD_ID, position: 5, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000007', fieldMetadataUniversalIdentifier: MAO_LAST_COMPUTED_AT_FIELD_ID, position: 6, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000008', fieldMetadataUniversalIdentifier: POST_ENTITLEMENT_VALUE_FIELD_ID, position: 7, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-000000000009', fieldMetadataUniversalIdentifier: ENTITLEMENT_CARRY_COST_FIELD_ID, position: 8, isVisible: true },
    { universalIdentifier: 'a1000042-0003-4000-8000-00000000000a', fieldMetadataUniversalIdentifier: TARGET_MARGIN_FIELD_ID, position: 9, isVisible: true },
  ],
});
