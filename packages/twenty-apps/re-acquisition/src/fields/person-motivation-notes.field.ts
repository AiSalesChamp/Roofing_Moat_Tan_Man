import {
  MOTIVATION_NOTES_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MOTIVATION_NOTES_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'motivationNotes',
  label: 'Motivation Notes',
  icon: 'IconNotes',
  isNullable: true,
});
