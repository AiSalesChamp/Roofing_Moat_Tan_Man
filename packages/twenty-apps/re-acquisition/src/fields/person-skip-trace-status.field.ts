import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { PERSON_SKIP_TRACE_STATUS_FIELD_ID } from 'src/constants/lead-engine-identifiers';

// SKIPPED_SUPPRESSED is a distinct outcome from NO_HIT on purpose: one means the
// vendor could not find them, the other means we chose not to ask because they had
// already opted out. Collapsing the two would hide a compliance decision inside a
// data-quality statistic.
export default defineField({
  universalIdentifier: PERSON_SKIP_TRACE_STATUS_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.SELECT,
  name: 'skipTraceStatus',
  label: 'Skip Trace Status',
  icon: 'IconAddressBook',
  isNullable: true,
  defaultValue: "'NOT_REQUESTED'",
  options: [
    {
      id: 'a1000091-0001-4000-8000-000000000001',
      value: 'NOT_REQUESTED',
      label: 'Not Requested',
      position: 0,
      color: 'gray',
    },
    {
      id: 'a1000091-0001-4000-8000-000000000002',
      value: 'PENDING',
      label: 'Pending',
      position: 1,
      color: 'blue',
    },
    {
      id: 'a1000091-0001-4000-8000-000000000003',
      value: 'HIT',
      label: 'Hit',
      position: 2,
      color: 'green',
    },
    {
      id: 'a1000091-0001-4000-8000-000000000004',
      value: 'NO_HIT',
      label: 'No Hit',
      position: 3,
      color: 'orange',
    },
    {
      id: 'a1000091-0001-4000-8000-000000000005',
      value: 'FAILED',
      label: 'Failed',
      position: 4,
      color: 'red',
    },
    {
      id: 'a1000091-0001-4000-8000-000000000006',
      value: 'SKIPPED_SUPPRESSED',
      label: 'Skipped (Suppressed)',
      position: 5,
      color: 'purple',
    },
  ],
});
