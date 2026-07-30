import {
  OPEN_TASKS_VIEW_ID,
  TASK_ASSIGNEE_FIELD_ID,
  TASK_DUE_AT_FIELD_ID,
  TASK_STATUS_FIELD_ID,
  TASK_TITLE_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// "Open" rather than strictly "due today" — sorted soonest-first so today's
// and overdue tasks always surface at the top of the list.
export default defineView({
  universalIdentifier: OPEN_TASKS_VIEW_ID,
  name: 'Open Tasks',
  icon: 'IconCheckbox',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v10000d0-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: TASK_TITLE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v10000d0-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: TASK_DUE_AT_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v10000d0-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: TASK_STATUS_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v10000d0-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: TASK_ASSIGNEE_FIELD_ID, position: 3, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'v10000d0-0001-4000-8000-000000000005',
      fieldMetadataUniversalIdentifier: TASK_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: ['DONE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: 'v10000d0-0001-4000-8000-000000000006',
      fieldMetadataUniversalIdentifier: TASK_DUE_AT_FIELD_ID,
      direction: ViewSortDirection.ASC,
    },
  ],
});
