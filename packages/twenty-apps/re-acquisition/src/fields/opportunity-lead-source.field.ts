import { LEAD_SOURCE_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: LEAD_SOURCE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'leadSource',
  label: 'Lead Source',
  icon: 'IconRadar',
  isNullable: true,
  options: [
    { id: 'f1000001-0001-4000-8000-000000000001', value: 'COLD_CALL', label: 'Cold Call', position: 0, color: 'gray' },
    { id: 'f1000001-0001-4000-8000-000000000002', value: 'DRIVING_FOR_DOLLARS', label: 'Driving for Dollars', position: 1, color: 'blue' },
    { id: 'f1000001-0001-4000-8000-000000000003', value: 'MLS', label: 'MLS', position: 2, color: 'green' },
    { id: 'f1000001-0001-4000-8000-000000000004', value: 'LOOPNET', label: 'LoopNet / Crexi', position: 3, color: 'purple' },
    { id: 'f1000001-0001-4000-8000-000000000005', value: 'AUCTION', label: 'Auction', position: 4, color: 'orange' },
    { id: 'f1000001-0001-4000-8000-000000000006', value: 'REFERRAL', label: 'Referral', position: 5, color: 'sky' },
    { id: 'f1000001-0001-4000-8000-000000000007', value: 'DIRECT_MAIL', label: 'Direct Mail', position: 6, color: 'yellow' },
    { id: 'f1000001-0001-4000-8000-000000000008', value: 'COUNTY_RECORDS', label: 'County Records', position: 7, color: 'turquoise' },
    { id: 'f1000001-0001-4000-8000-000000000009', value: 'OFF_MARKET', label: 'Off Market', position: 8, color: 'pink' },
  ],
});
