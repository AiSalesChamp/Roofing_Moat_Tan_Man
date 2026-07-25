import {
  CONTRACT_PRICE_FIELD_ID,
  CONTRACT_SENT_DATE_FIELD_ID,
  CONTRACT_TYPE_FIELD_ID,
  DD_DEADLINE_FIELD_ID,
  DEAL_CONTRACT_FIELDS_VIEW_ID,
  SIGNATURE_REQUEST_ID_FIELD_ID,
  SIGNATURE_STATUS_FIELD_ID,
  SIGNED_CONTRACT_URL_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
  defineView,
} from 'twenty-sdk/define';

// Backing view for the "Contract & E-Signature" widget on the deal record page.
export default defineView({
  universalIdentifier: DEAL_CONTRACT_FIELDS_VIEW_ID,
  name: 'Deal Contract Fields',
  icon: 'IconFileSignature',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000001', fieldMetadataUniversalIdentifier: CONTRACT_TYPE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000002', fieldMetadataUniversalIdentifier: SIGNATURE_STATUS_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000003', fieldMetadataUniversalIdentifier: SIGNATURE_REQUEST_ID_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000004', fieldMetadataUniversalIdentifier: SIGNED_CONTRACT_URL_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000005', fieldMetadataUniversalIdentifier: CONTRACT_SENT_DATE_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000006', fieldMetadataUniversalIdentifier: CONTRACT_PRICE_FIELD_ID, position: 5, isVisible: true },
    { universalIdentifier: 'a1000042-0004-4000-8000-000000000007', fieldMetadataUniversalIdentifier: DD_DEADLINE_FIELD_ID, position: 6, isVisible: true },
  ],
});
