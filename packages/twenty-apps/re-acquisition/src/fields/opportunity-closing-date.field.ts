import { CLOSING_DATE_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CLOSING_DATE_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE,
  name: 'closingDate',
  label: 'Closing Date',
  icon: 'IconCalendar',
  isNullable: true,
});
