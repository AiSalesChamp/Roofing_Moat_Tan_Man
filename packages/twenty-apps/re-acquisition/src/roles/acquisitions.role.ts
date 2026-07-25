import { ACQUISITIONS_ROLE_ID } from 'src/constants/universal-identifiers';
import { defineRole } from 'twenty-sdk/define';

export default defineRole({
  universalIdentifier: ACQUISITIONS_ROLE_ID,
  label: 'Acquisitions',
  description: 'Full CRUD on deals, properties, and inspections',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
