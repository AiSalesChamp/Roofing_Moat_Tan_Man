import { NEXT_ACTION_DATE_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: NEXT_ACTION_DATE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE,
  name: 'nextActionDate',
  label: 'Next Action Date',
  icon: 'IconCalendarDue',
  isNullable: true,
});
