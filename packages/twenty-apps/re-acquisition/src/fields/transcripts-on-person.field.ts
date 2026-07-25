import {
  TRANSCRIPT_PERSON_FIELD_ID,
  TRANSCRIPTS_ON_PERSON_FIELD_ID,
  CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: TRANSCRIPTS_ON_PERSON_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'callTranscripts',
  label: 'Call Transcripts',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: TRANSCRIPT_PERSON_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
