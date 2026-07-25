import { MAX_ASSIGNMENT_SPREAD_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAX_ASSIGNMENT_SPREAD_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'maxAssignmentSpread',
  label: 'Max Assignment Spread',
  icon: 'IconArrowsDiff',
  isNullable: true,
});
