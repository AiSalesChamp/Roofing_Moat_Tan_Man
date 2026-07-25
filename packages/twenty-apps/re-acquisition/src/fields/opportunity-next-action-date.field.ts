import { NEXT_ACTION_DATE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// Drives the Today queue. DATE, not DATE_TIME: the queue is a day's worklist,
// and a timestamp would make "due today" depend on the hour it was set.
export default defineField({
  universalIdentifier: NEXT_ACTION_DATE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE,
  name: 'nextActionDate',
  label: 'Next Action Date',
  icon: 'IconCalendarDue',
  isNullable: true,
});
