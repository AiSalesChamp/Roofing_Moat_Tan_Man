import {
  DD_CALENDAR_VIEW_ID,
  DD_DEADLINE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  OPP_NAME_FIELD_ID,
  OPP_STAGE_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';
import { ViewCalendarLayout } from 'twenty-shared/types';

export default defineView({
  universalIdentifier: DD_CALENDAR_VIEW_ID,
  name: 'Due Diligence Calendar',
  icon: 'IconCalendarEvent',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.CALENDAR,
  calendarLayout: ViewCalendarLayout.MONTH,
  calendarFieldMetadataUniversalIdentifier: DD_DEADLINE_FIELD_ID,
  fields: [
    { universalIdentifier: 'v1000090-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: OPP_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000090-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: DEAL_STAGE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000090-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: OPP_STAGE_FIELD_ID, position: 2, isVisible: false },
  ],
});
