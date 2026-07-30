import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import {
  CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  CONTACT_CONSENT_PERSON_FIELD_ID,
  CONTACT_CONSENTS_ON_PERSON_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';

// CASCADE here, unlike distressEvent: a consent row is meaningless without the
// person it governs, and an orphaned opt-out cannot be matched to anyone. The
// engine's own suppression table is the durable record.
export default defineField({
  universalIdentifier: CONTACT_CONSENT_PERSON_FIELD_ID,
  objectUniversalIdentifier: CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    CONTACT_CONSENTS_ON_PERSON_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'personId',
  },
});
