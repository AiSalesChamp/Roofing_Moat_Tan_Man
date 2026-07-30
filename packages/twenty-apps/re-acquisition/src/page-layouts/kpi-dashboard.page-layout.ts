import {
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  EXIT_DATE_FIELD_ID,
  KPI_DASHBOARD_PAGE_LAYOUT_ID,
  OPP_ID_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  AggregateOperations,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  definePageLayout,
} from 'twenty-sdk/define';

const CLOSED_THIS_MONTH_FILTER_GROUP_ID = 'f1000002-0001-4000-8000-000000000001';
const closedThisMonthFilter = {
  recordFilterGroups: [
    { id: CLOSED_THIS_MONTH_FILTER_GROUP_ID, logicalOperator: 'AND' },
  ],
  recordFilters: [
    {
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: 'IS',
      value: 'EXIT_CLOSED',
      recordFilterGroupId: CLOSED_THIS_MONTH_FILTER_GROUP_ID,
    },
    {
      fieldMetadataUniversalIdentifier: EXIT_DATE_FIELD_ID,
      operand: 'IS_RELATIVE',
      value: 'THIS_1_MONTH;;UTC;;SUNDAY;;',
      recordFilterGroupId: CLOSED_THIS_MONTH_FILTER_GROUP_ID,
    },
  ],
} as any;

const opportunityObject = {
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
};

export default definePageLayout({
  universalIdentifier: KPI_DASHBOARD_PAGE_LAYOUT_ID,
  name: 'Acquisition KPIs',
  type: 'DASHBOARD',
  tabs: [
    {
      universalIdentifier: 'pl500001-0001-4000-8000-000000000001',
      title: 'KPIs',
      position: 0,
      icon: 'IconChartInfographic',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000001',
          title: 'Deals Closed This Month',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 3 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            label: 'Deals Closed This Month',
            filter: closedThisMonthFilter,
          } as any,
          ...opportunityObject,
        },
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000002',
          title: 'Revenue Closed This Month',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 3, rowSpan: 4, columnSpan: 3 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            label: 'Revenue Closed This Month',
            prefix: '$',
            filter: closedThisMonthFilter,
          } as any,
          ...opportunityObject,
        },
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000003',
          title: 'Conversion Rate (Sourced -> Exit Closed)',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 6, rowSpan: 4, columnSpan: 3 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            label: 'Conversion Rate',
            ratioAggregateConfig: {
              fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
              optionValue: 'EXIT_CLOSED',
            },
          } as any,
          ...opportunityObject,
        },
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000004',
          title: 'Total Pipeline Value',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 9, rowSpan: 4, columnSpan: 3 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            label: 'Total Pipeline Value',
            prefix: '$',
          } as any,
          ...opportunityObject,
        },
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000005',
          title: 'Pipeline Value by Stage',
          type: 'GRAPH',
          gridPosition: { row: 4, column: 0, rowSpan: 6, columnSpan: 6 },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              DEAL_STAGE_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            color: 'green',
          } as any,
          ...opportunityObject,
        },
        {
          universalIdentifier: 'pl500002-0001-4000-8000-000000000006',
          title: 'Deals by Type',
          type: 'GRAPH',
          gridPosition: { row: 4, column: 6, rowSpan: 6, columnSpan: 6 },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier: DEAL_TYPE_FIELD_ID,
            displayLegend: true,
            showCenterMetric: true,
            color: 'orange',
          } as any,
          ...opportunityObject,
        },
      ],
    },
  ],
});
