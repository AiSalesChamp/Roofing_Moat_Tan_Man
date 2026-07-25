import { SIGNED_CONTRACT_URL_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: SIGNED_CONTRACT_URL_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.LINKS,
  name: 'signedContractUrl',
  label: 'Signed Contract URL',
  icon: 'IconFileCheck',
  isNullable: true,
});
