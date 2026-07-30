import {
  TRANSCRIPT_OPPORTUNITY_FIELD_ID,
  TRANSCRIPTS_ON_OPPORTUNITY_FIELD_ID,
  CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: TRANSCRIPT_OPPORTUNITY_FIELD_ID,
  objectUniversalIdentifier: CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'transcriptOpportunity',
  label: 'Deal',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TRANSCRIPTS_ON_OPPORTUNITY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'transcriptOpportunityId',
  },
});
