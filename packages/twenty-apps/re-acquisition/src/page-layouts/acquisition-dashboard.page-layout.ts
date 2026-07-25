import {
  ACQUISITION_DASHBOARD_PAGE_ID,
  ASSIGNMENT_FEE_FIELD_ID,
  CLOSING_DATE_FIELD_ID,
  CONTRACT_PRICE_FIELD_ID,
  DEAL_COUNTY_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  HYPERSCALE_GATE_STATUS_FIELD_ID,
  LEAD_SOURCE_FIELD_ID,
  MAO_WHOLESALE_FLIP_FIELD_ID,
  OPP_NAME_FIELD_ID,
  PROJECTED_PROFIT_FIELD_ID,
  REALIZED_VALUE_RATIO_FIELD_ID,
  RECOMMENDED_EXIT_TYPE_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  AggregateOperations,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  definePageLayout,
} from 'twenty-sdk/define';

const OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier;

// A DASHBOARD layout has no backing object of its own, so every widget carries
// its own objectUniversalIdentifier.
const TAB_ID = (suffix: string) => `a3000005-0001-4000-8000-${suffix}`;
const WIDGET_ID = (suffix: string) => `a3000006-0001-4000-8000-${suffix}`;

// Dead deals would swamp every total, and the pipeline reads as a funnel only
// while the closed-lost tail is excluded. A chart filter is a record-filter
// set, and SELECT values serialize as a JSON array string exactly as the
// filter dropdown writes them.
const EXCLUDES_DEAD_DEALS = {
  recordFilters: [
    {
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: JSON.stringify(['DEAD']),
      type: 'SELECT',
    },
  ],
};

export default definePageLayout({
  universalIdentifier: ACQUISITION_DASHBOARD_PAGE_ID,
  name: 'Acquisition Dashboard',
  type: 'DASHBOARD',
  tabs: [
    {
      universalIdentifier: TAB_ID('000000000001'),
      title: 'Pipeline',
      position: 0,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: WIDGET_ID('000000000001'),
          title: 'Pipeline Value',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 0,
            rowSpan: 1,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            label: 'Under contract',
            description: 'Total contract price across all live deals',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000002'),
          title: 'Projected Profit',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 3,
            rowSpan: 1,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: PROJECTED_PROFIT_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            label: 'Projected',
            description: 'ARV less contract, rehab, holding and assignment',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000003'),
          title: 'Live Deals',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 6,
            rowSpan: 1,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            label: 'Open',
            description: 'Deals not marked dead',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000004'),
          title: 'Avg Assignment Fee',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 9,
            rowSpan: 1,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: ASSIGNMENT_FEE_FIELD_ID,
            aggregateOperation: AggregateOperations.AVG,
            label: 'Per assignment',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000005'),
          title: 'Deals by Stage',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 1,
            column: 0,
            rowSpan: 2,
            columnSpan: 8,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              DEAL_STAGE_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            description: 'Where the funnel is thin',
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000006'),
          title: 'Deals by Type',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 1,
            column: 8,
            rowSpan: 2,
            columnSpan: 4,
          },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
            // dealType is MULTI_SELECT — a land/wholesale deal must count
            // toward both slices, not toward a combined "LAND,WHOLESALE" one.
            splitMultiValueFields: true,
            showCenterMetric: true,
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000007'),
          title: 'Contract Value by Close Month',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 3,
            column: 0,
            rowSpan: 2,
            columnSpan: 12,
          },
          configuration: {
            configurationType: 'LINE_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              CLOSING_DATE_FIELD_ID,
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.MONTH,
            omitNullValues: true,
            displayLegend: false,
            description: 'Scheduled closings by month',
          },
        },
      ],
    },
    {
      universalIdentifier: TAB_ID('000000000002'),
      title: 'Underwriting',
      position: 50,
      icon: 'IconTarget',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: WIDGET_ID('000000000008'),
          title: 'Recommended Exit Path',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 0,
            rowSpan: 2,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier:
              RECOMMENDED_EXIT_TYPE_FIELD_ID,
            showCenterMetric: true,
            description: 'INSUFFICIENT_DATA here means comps or acreage missing',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('000000000009'),
          title: 'Hyperscale Gate Outcome',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 6,
            rowSpan: 2,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              HYPERSCALE_GATE_STATUS_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            description: 'Interconnection viability across the book',
          },
        },
        {
          universalIdentifier: WIDGET_ID('00000000000a'),
          title: 'Wholesale MAO by Lead Source',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 2,
            column: 0,
            rowSpan: 2,
            columnSpan: 12,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              MAO_WHOLESALE_FLIP_FIELD_ID,
            aggregateOperation: AggregateOperations.AVG,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              LEAD_SOURCE_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            omitNullValues: true,
            description: 'Which channels surface parcels worth paying for',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
        {
          universalIdentifier: WIDGET_ID('00000000000b'),
          title: 'Realized Value Ratio by County',
          type: 'GRAPH',
          objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 4,
            column: 0,
            rowSpan: 2,
            columnSpan: 12,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              REALIZED_VALUE_RATIO_FIELD_ID,
            aggregateOperation: AggregateOperations.AVG,
            // Grouped by the deal's own county field, not the Property's: a
            // chart can only group by a field on its own object, which is why
            // the offer recompute denormalizes county onto the deal.
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              DEAL_COUNTY_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            // Deals that never closed have no ratio and would pull every bar
            // toward zero if they counted as 0 rather than as absent.
            omitNullValues: true,
            description:
              'Contract price / CAD land value on closed deals — put these numbers in COUNTY_MULTIPLIERS',
            filter: EXCLUDES_DEAD_DEALS,
          },
        },
      ],
    },
  ],
});
