import {
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import {
  CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  CONTACT_CONSENT_PERSON_FIELD_ID,
  CONTACT_CONSENTS_ON_PERSON_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';

// One person has one consent row per channel, so this is ONE_TO_MANY rather than a
// single status field. That is the whole point: per-channel state.
export default defineField({
  universalIdentifier: CONTACT_CONSENTS_ON_PERSON_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'contactConsents',
  label: 'Contact Consents',
  icon: 'IconShieldLock',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONTACT_CONSENT_PERSON_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
