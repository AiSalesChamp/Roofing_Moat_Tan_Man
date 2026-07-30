import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { OPPORTUNITY_EQUITABLE_DISCLOSURE_DATE_FIELD_ID } from 'src/constants/lead-engine-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_EQUITABLE_DISCLOSURE_DATE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE,
  name: 'equitableInterestDisclosureDate',
  label: 'Equitable Interest Disclosure Date',
  icon: 'IconCalendarCheck',
  isNullable: true,
});
