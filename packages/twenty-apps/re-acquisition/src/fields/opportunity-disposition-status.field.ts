import { DISPOSITION_STATUS_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: DISPOSITION_STATUS_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'dispositionStatus',
  label: 'Disposition Status',
  icon: 'IconArrowsExchange',
  isNullable: true,
  options: [
    { id: 'f1000003-0001-4000-8000-000000000001', value: 'NOT_STARTED', label: 'Not Started', position: 0, color: 'gray' },
    { id: 'f1000003-0001-4000-8000-000000000002', value: 'MARKETING', label: 'Marketing', position: 1, color: 'blue' },
    { id: 'f1000003-0001-4000-8000-000000000003', value: 'UNDER_CONTRACT', label: 'Under Contract', position: 2, color: 'turquoise' },
    { id: 'f1000003-0001-4000-8000-000000000004', value: 'ASSIGNED', label: 'Assigned', position: 3, color: 'green' },
    { id: 'f1000003-0001-4000-8000-000000000005', value: 'CLOSED', label: 'Closed', position: 4, color: 'purple' },
  ],
});
