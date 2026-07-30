import { DISPOSITION_ROLE_ID } from 'src/constants/universal-identifiers';
import { defineApplicationRole } from 'twenty-sdk/define';

export default defineApplicationRole({
  universalIdentifier: DISPOSITION_ROLE_ID,
  label: 'Disposition',
  description: 'Read deals and manage buyer disposition fields',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
