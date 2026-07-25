import { BUYER_MARKET_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: BUYER_MARKET_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'buyerMarkets',
  label: 'Buyer Markets',
  icon: 'IconMap',
  isNullable: true,
  options: [
    { id: 'a4000003-0001-4000-8000-000000000001', value: 'LAND', label: 'Land', position: 0, color: 'green' },
    { id: 'a4000003-0001-4000-8000-000000000002', value: 'COMMERCIAL', label: 'Commercial', position: 1, color: 'blue' },
    { id: 'a4000003-0001-4000-8000-000000000003', value: 'INDUSTRIAL', label: 'Industrial', position: 2, color: 'orange' },
    { id: 'a4000003-0001-4000-8000-000000000004', value: 'RESIDENTIAL', label: 'Residential', position: 3, color: 'purple' },
  ],
});
