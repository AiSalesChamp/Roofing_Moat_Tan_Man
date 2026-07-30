import { HYPERSCALE_GATE_STATUS_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: HYPERSCALE_GATE_STATUS_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'hyperscaleGateStatus',
  label: 'Hyperscale Gate',
  icon: 'IconShieldCheck',
  isNullable: true,
  options: [
    { id: 'f1000012-000c-4000-8000-000000000001', value: 'PASSED', label: 'Passed', position: 0, color: 'green' },
    { id: 'f1000012-000c-4000-8000-000000000002', value: 'HARD_REJECTED', label: 'Hard Rejected', position: 1, color: 'red' },
    { id: 'f1000012-000c-4000-8000-000000000003', value: 'NOT_EVALUATED', label: 'Not Evaluated', position: 2, color: 'gray' },
  ],
});
