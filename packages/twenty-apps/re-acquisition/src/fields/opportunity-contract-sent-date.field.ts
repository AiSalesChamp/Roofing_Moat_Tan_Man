import { CONTRACT_SENT_DATE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CONTRACT_SENT_DATE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE_TIME,
  name: 'contractSentDate',
  label: 'Contract Sent Date',
  icon: 'IconSend',
  isNullable: true,
});
