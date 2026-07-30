import {
  ACQUISITION_PIPELINE_VIEW_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_STAGES,
  DEAL_TYPE_FIELD_ID,
  OPP_NAME_FIELD_ID,
  OPP_OWNER_FIELD_ID,
  OPP_STAGE_FIELD_ID,
  PROJECTED_PROFIT_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: ACQUISITION_PIPELINE_VIEW_ID,
  name: 'Acquisition Pipeline',
  icon: 'IconLayoutKanban',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.KANBAN,
  mainGroupByFieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
  fields: [
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: PROJECTED_PROFIT_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: OPP_OWNER_FIELD_ID, position: 5, isVisible: true },
    // Standard Opportunity "stage" is intentionally hidden everywhere in this
    // app so dealStage is the single source of truth for pipeline position.
    { universalIdentifier: 'v1000001-0001-4000-8000-000000000007', fieldMetadataUniversalIdentifier: OPP_STAGE_FIELD_ID, position: 6, isVisible: false },
  ],
  groups: DEAL_STAGES.map((stage, index) => ({
    universalIdentifier: `v1000002-0001-4000-8000-${String(index).padStart(12, '0')}`,
    fieldValue: stage.value,
    position: stage.position,
    isVisible: stage.value !== 'DEAD',
  })),
});
