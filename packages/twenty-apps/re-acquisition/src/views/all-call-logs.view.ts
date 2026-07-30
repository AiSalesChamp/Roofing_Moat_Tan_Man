import {
  ALL_CALL_LOGS_VIEW_ID,
  CALL_LOG_DATE_FIELD_ID,
  CALL_LOG_DIRECTION_FIELD_ID,
  CALL_LOG_OBJECT_UNIVERSAL_IDENTIFIER,
  CALL_LOG_OPPORTUNITY_FIELD_ID,
  CALL_LOG_OUTCOME_FIELD_ID,
  CALL_LOG_PERSON_FIELD_ID,
} from 'src/constants/universal-identifiers';
import { ViewType, defineView } from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: ALL_CALL_LOGS_VIEW_ID,
  name: 'All Call Logs',
  icon: 'IconPhoneCall',
  objectUniversalIdentifier: CALL_LOG_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: CALL_LOG_DATE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: CALL_LOG_DIRECTION_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: CALL_LOG_OUTCOME_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: CALL_LOG_PERSON_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: CALL_LOG_OPPORTUNITY_FIELD_ID, position: 4, isVisible: true },
  ],
});
