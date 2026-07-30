import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_MOTIVATION_SCORE_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_MOTIVATION_SCORE_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.NUMBER,
  name: 'motivationScore',
  label: 'Motivation Score',
  icon: 'IconGauge',
  isNullable: true,
});
