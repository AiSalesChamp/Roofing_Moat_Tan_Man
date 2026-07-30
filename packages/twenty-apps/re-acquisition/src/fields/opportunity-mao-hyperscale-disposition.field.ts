import { MAO_HYPERSCALE_DISPOSITION_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MAO_HYPERSCALE_DISPOSITION_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.CURRENCY,
  name: 'maoHyperscaleDisposition',
  label: 'MAO — Hyperscale Disposition',
  icon: 'IconCalculator',
  isNullable: true,
});
