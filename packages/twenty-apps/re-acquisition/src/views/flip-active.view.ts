import {
  ARV_FIELD_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  FLIP_ACTIVE_VIEW_ID,
  OPP_NAME_FIELD_ID,
  REHAB_ESTIMATE_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: FLIP_ACTIVE_VIEW_ID,
  name: 'Flip Active',
  icon: 'IconHammer',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a2000060-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a2000060-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a2000060-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a2000060-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: ARV_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a2000060-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: REHAB_ESTIMATE_FIELD_ID, position: 4, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'a2000060-0001-4000-8000-000000000006',
      fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
      operand: ViewFilterOperand.CONTAINS,
      value: ['FLIP'],
    },
    {
      universalIdentifier: 'a2000060-0001-4000-8000-000000000007',
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['ACQUIRED', 'DISPOSITION'],
    },
  ],
});
