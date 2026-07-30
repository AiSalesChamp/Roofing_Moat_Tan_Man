import {
  CALL_LOG_OBJECT_UNIVERSAL_IDENTIFIER,
  CALL_LOG_PERSON_FIELD_ID,
  CALL_LOGS_ON_PERSON_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CALL_LOGS_ON_PERSON_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'callLogs',
  label: 'Call Logs',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    CALL_LOG_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CALL_LOG_PERSON_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
