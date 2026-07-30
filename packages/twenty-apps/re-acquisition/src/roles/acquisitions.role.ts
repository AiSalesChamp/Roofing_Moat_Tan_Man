import { ACQUISITIONS_ROLE_ID } from 'src/constants/universal-identifiers';
import { defineApplicationRole } from 'twenty-sdk/define';

export default defineApplicationRole({
  universalIdentifier: ACQUISITIONS_ROLE_ID,
  label: 'Acquisitions',
  description: 'Full CRUD on deals, properties, and inspections',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
