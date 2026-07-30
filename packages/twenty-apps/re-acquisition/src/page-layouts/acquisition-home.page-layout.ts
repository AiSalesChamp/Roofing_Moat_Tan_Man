import {
  CONTRACT_PRICE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  HOME_DASHBOARD_PAGE_LAYOUT_ID,
  OPP_ID_FIELD_ID,
  TASK_ID_FIELD_ID,
  TASK_STATUS_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  AggregateOperations,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  definePageLayout,
} from 'twenty-sdk/define';

// A single AND filter group excluding closed-out deals (DEAD, EXIT_CLOSED)
// so "open pipeline" widgets only count deals that are still active.
const OPEN_PIPELINE_FILTER_GROUP_ID = 'f1000001-0001-4000-8000-000000000001';
const openPipelineFilter = {
  recordFilterGroups: [
    { id: OPEN_PIPELINE_FILTER_GROUP_ID, logicalOperator: 'AND' },
  ],
  recordFilters: [
    {
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: 'IS_NOT',
      value: 'DEAD',
      recordFilterGroupId: OPEN_PIPELINE_FILTER_GROUP_ID,
    },
    {
      fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID,
      operand: 'IS_NOT',
      value: 'EXIT_CLOSED',
      recordFilterGroupId: OPEN_PIPELINE_FILTER_GROUP_ID,
    },
  ],
} as any;

const OPEN_TASKS_FILTER_GROUP_ID = 'f1000001-0001-4000-8000-000000000002';
const openTasksFilter = {
  recordFilterGroups: [
    { id: OPEN_TASKS_FILTER_GROUP_ID, logicalOperator: 'AND' },
  ],
  recordFilters: [
    {
      fieldMetadataUniversalIdentifier: TASK_STATUS_FIELD_ID,
      operand: 'IS_NOT',
      value: 'DONE',
      recordFilterGroupId: OPEN_TASKS_FILTER_GROUP_ID,
    },
  ],
} as any;

export default definePageLayout({
  universalIdentifier: HOME_DASHBOARD_PAGE_LAYOUT_ID,
  name: 'Acquisition Home',
  type: 'DASHBOARD',
  tabs: [
    {
      universalIdentifier: 'pl400001-0001-4000-8000-000000000001',
      title: 'Overview',
      position: 0,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: 'pl400002-0001-4000-8000-000000000001',
          title: 'Open Pipeline Deals',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            label: 'Open Pipeline Deals',
            filter: openPipelineFilter,
          } as any,
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity
              .universalIdentifier,
        },
        {
          universalIdentifier: 'pl400002-0001-4000-8000-000000000002',
          title: 'Open Pipeline Value',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 4, rowSpan: 4, columnSpan: 4 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            label: 'Open Pipeline Value',
            prefix: '$',
            filter: openPipelineFilter,
          } as any,
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity
              .universalIdentifier,
        },
        {
          universalIdentifier: 'pl400002-0001-4000-8000-000000000003',
          title: 'Open Tasks',
          type: 'GRAPH',
          gridPosition: { row: 0, column: 8, rowSpan: 4, columnSpan: 4 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: TASK_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            label: 'Open Tasks',
            filter: openTasksFilter,
          } as any,
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
        },
        {
          universalIdentifier: 'pl400002-0001-4000-8000-000000000004',
          title: 'Deals by Stage',
          type: 'GRAPH',
          gridPosition: { row: 4, column: 0, rowSpan: 6, columnSpan: 12 },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: OPP_ID_FIELD_ID,
            aggregateOperation: AggregateOperations.COUNT,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              DEAL_STAGE_FIELD_ID,
            displayDataLabel: true,
            displayLegend: false,
            color: 'blue',
          } as any,
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity
              .universalIdentifier,
        },
      ],
    },
  ],
});
