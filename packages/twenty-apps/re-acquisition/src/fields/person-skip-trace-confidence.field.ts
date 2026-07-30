import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { PERSON_SKIP_TRACE_CONFIDENCE_FIELD_ID } from 'src/constants/lead-engine-identifiers';

export default defineField({
  universalIdentifier: PERSON_SKIP_TRACE_CONFIDENCE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'skipTraceConfidence',
  label: 'Skip Trace Confidence',
  icon: 'IconPercentage',
  isNullable: true,
});
