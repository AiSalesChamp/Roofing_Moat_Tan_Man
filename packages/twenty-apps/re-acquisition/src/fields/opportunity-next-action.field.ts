import { NEXT_ACTION_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

// One sentence, always populated — a deal with no next action is the real bug
// in a wholesaling pipeline, and nothing else in the app surfaces it.
export default defineField({
  universalIdentifier: NEXT_ACTION_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.TEXT,
  name: 'nextAction',
  label: 'Next Action',
  icon: 'IconChecklist',
  isNullable: true,
});
