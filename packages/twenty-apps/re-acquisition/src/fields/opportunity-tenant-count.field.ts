import { TENANT_COUNT_FIELD_ID } from 'src/constants/universal-identifiers';
import { FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: TENANT_COUNT_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'tenantCount',
  label: 'Tenant Count',
  icon: 'IconUsers',
  isNullable: true,
});
