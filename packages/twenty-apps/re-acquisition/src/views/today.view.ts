import {
  DEAL_STAGE_FIELD_ID,
  NEXT_ACTION_DATE_FIELD_ID,
  NEXT_ACTION_FIELD_ID,
  OPP_NAME_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
  SUGGESTED_OFFER_PRICE_FIELD_ID,
  TODAY_DUE_FILTER_GROUP_ID,
  TODAY_VIEW_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// The work queue, not a dashboard: what to do right now, oldest first.
//
// "Due today or overdue" needs a filter group. Verified against
// turnRecordFilterIntoGqlOperationFilter: for a DATE field IS_IN_PAST compiles
// to `lt: today` and IS_TODAY to `eq: today`, so IS_IN_PAST alone would drop
// everything due today. No single DATE operand covers both (IS_IN_FUTURE, the
// only one that includes today, runs the wrong way), so the two are ORed in a
// group. Root-level filters are ANDed with the outermost group's result — see
// computeRecordGqlOperationFilter — so the DEAD exclusion stays ungrouped.
export default defineView({
  universalIdentifier: TODAY_VIEW_ID,
  name: 'Today',
  icon: 'IconSunHigh',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: NEXT_ACTION_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: NEXT_ACTION_DATE_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: PROPERTY_ON_OPPORTUNITY_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a20000e0-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: SUGGESTED_OFFER_PRICE_FIELD_ID, position: 5, isVisible: true },
  ],
  filterGroups: [
    {
      universalIdentifier: TODAY_DUE_FILTER_GROUP_ID,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
      positionInViewFilterGroup: 0,
    },
  ],
  filters: [
    {
      universalIdentifier: 'a20000e0-0002-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: ['DEAD'],
    },
    {
      // IS_IN_PAST / IS_TODAY resolve against "now" and ignore any value, but
      // the manifest requires the key, so it is deliberately empty.
      universalIdentifier: 'a20000e0-0002-4000-8000-000000000002',
      fieldMetadataUniversalIdentifier: NEXT_ACTION_DATE_FIELD_ID,
      operand: ViewFilterOperand.IS_IN_PAST,
      value: '',
      viewFilterGroupUniversalIdentifier: TODAY_DUE_FILTER_GROUP_ID,
      positionInViewFilterGroup: 0,
    },
    {
      universalIdentifier: 'a20000e0-0002-4000-8000-000000000003',
      fieldMetadataUniversalIdentifier: NEXT_ACTION_DATE_FIELD_ID,
      operand: ViewFilterOperand.IS_TODAY,
      value: '',
      viewFilterGroupUniversalIdentifier: TODAY_DUE_FILTER_GROUP_ID,
      positionInViewFilterGroup: 1,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'a20000e0-0003-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: NEXT_ACTION_DATE_FIELD_ID,
      direction: ViewSortDirection.ASC,
    },
  ],
});
