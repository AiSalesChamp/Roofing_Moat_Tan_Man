import {
  BUYER_MARKET_FIELD_ID,
  BUYERS_VIEW_ID,
  CONTACT_ROLE_FIELD_ID,
  PERSON_EMAILS_FIELD_ID,
  PERSON_NAME_FIELD_ID,
  PERSON_PHONES_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: BUYERS_VIEW_ID,
  name: 'Buyers List',
  icon: 'IconUsers',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v10000b0-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: PERSON_NAME_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v10000b0-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: PERSON_EMAILS_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v10000b0-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PERSON_PHONES_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v10000b0-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: BUYER_MARKET_FIELD_ID, position: 3, isVisible: true },
  ],
  filters: [
    {
      universalIdentifier: 'v10000b0-0001-4000-8000-000000000005',
      fieldMetadataUniversalIdentifier: CONTACT_ROLE_FIELD_ID,
      operand: ViewFilterOperand.CONTAINS,
      value: ['BUYER'],
    },
  ],
});
