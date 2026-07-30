import { MAO_LAST_COMPUTED_AT_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_LAST_COMPUTED_AT_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.DATE_TIME,
  name: 'maoLastComputedAt',
  label: 'MAO Last Computed At',
  icon: 'IconClock',
  isNullable: true,
});
