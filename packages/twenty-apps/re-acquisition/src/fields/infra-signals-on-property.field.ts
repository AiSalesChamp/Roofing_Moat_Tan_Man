import {
  INFRA_PROPERTY_FIELD_ID,
  INFRA_SIGNALS_ON_PROPERTY_FIELD_ID,
  INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FieldType, RelationType, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: INFRA_SIGNALS_ON_PROPERTY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'infrastructureSignals',
  label: 'Infrastructure Signals',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: INFRA_PROPERTY_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
