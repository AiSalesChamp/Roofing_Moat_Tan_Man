import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  TRANSCRIPT_BODY_FIELD_ID,
  TRANSCRIPT_DIRECTION_FIELD_ID,
  TRANSCRIPT_EXTRACTED_DATA_FIELD_ID,
  TRANSCRIPT_OUTCOME_FIELD_ID,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: CALL_TRANSCRIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'callTranscript',
  namePlural: 'callTranscripts',
  labelSingular: 'Call Transcript',
  labelPlural: 'Call Transcripts',
  description: 'Seller or broker call transcript with extracted CRM data',
  icon: 'IconPhone',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: TRANSCRIPT_BODY_FIELD_ID,
  fields: [
    {
      universalIdentifier: TRANSCRIPT_BODY_FIELD_ID,
      type: FieldType.RICH_TEXT,
      name: 'transcriptBody',
      label: 'Transcript',
      icon: 'IconMessage',
      isNullable: true,
    },
    {
      universalIdentifier: TRANSCRIPT_DIRECTION_FIELD_ID,
      type: FieldType.SELECT,
      name: 'callDirection',
      label: 'Call Direction',
      icon: 'IconArrowRight',
      isNullable: true,
      options: [
        { id: 'd1000001-0001-4000-8000-000000000001', value: 'INBOUND', label: 'Inbound', position: 0, color: 'blue' },
        { id: 'd1000001-0001-4000-8000-000000000002', value: 'OUTBOUND', label: 'Outbound', position: 1, color: 'green' },
      ],
    },
    {
      universalIdentifier: TRANSCRIPT_OUTCOME_FIELD_ID,
      type: FieldType.SELECT,
      name: 'callOutcome',
      label: 'Call Outcome',
      icon: 'IconCheck',
      isNullable: true,
      options: [
        { id: 'd1000002-0001-4000-8000-000000000001', value: 'CONNECTED', label: 'Connected', position: 0, color: 'green' },
        { id: 'd1000002-0001-4000-8000-000000000002', value: 'VOICEMAIL', label: 'Voicemail', position: 1, color: 'yellow' },
        { id: 'd1000002-0001-4000-8000-000000000003', value: 'NO_ANSWER', label: 'No Answer', position: 2, color: 'gray' },
        { id: 'd1000002-0001-4000-8000-000000000004', value: 'OFFER_DISCUSSED', label: 'Offer Discussed', position: 3, color: 'blue' },
        { id: 'd1000002-0001-4000-8000-000000000005', value: 'NOT_INTERESTED', label: 'Not Interested', position: 4, color: 'red' },
      ],
    },
    {
      universalIdentifier: TRANSCRIPT_EXTRACTED_DATA_FIELD_ID,
      type: FieldType.RAW_JSON,
      name: 'extractedData',
      label: 'Extracted Data (Evidence)',
      icon: 'IconCode',
      isNullable: true,
    },
  ],
});
