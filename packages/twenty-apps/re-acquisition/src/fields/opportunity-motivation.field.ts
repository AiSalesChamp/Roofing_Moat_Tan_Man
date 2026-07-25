import { MOTIVATION_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MOTIVATION_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'motivation',
  label: 'Seller Motivation',
  icon: 'IconFlame',
  isNullable: true,
  options: [
    { id: 'f1000002-0001-4000-8000-000000000001', value: 'DISTRESSED', label: 'Distressed', position: 0, color: 'red' },
    { id: 'f1000002-0001-4000-8000-000000000002', value: 'ESTATE', label: 'Estate / Probate', position: 1, color: 'purple' },
    { id: 'f1000002-0001-4000-8000-000000000003', value: 'RELOCATION', label: 'Relocation', position: 2, color: 'blue' },
    { id: 'f1000002-0001-4000-8000-000000000004', value: 'VACANT', label: 'Vacant Property', position: 3, color: 'gray' },
    { id: 'f1000002-0001-4000-8000-000000000005', value: 'DEVELOPMENT', label: 'Development', position: 4, color: 'green' },
    { id: 'f1000002-0001-4000-8000-000000000006', value: 'TAX_LIEN', label: 'Tax Lien / Delinquent', position: 5, color: 'orange' },
    { id: 'f1000002-0001-4000-8000-000000000007', value: 'DIVORCE', label: 'Divorce', position: 6, color: 'pink' },
    { id: 'f1000002-0001-4000-8000-000000000008', value: 'TIRED_LANDLORD', label: 'Tired Landlord', position: 7, color: 'yellow' },
  ],
});
