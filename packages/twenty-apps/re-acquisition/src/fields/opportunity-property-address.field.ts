import { OPP_PROPERTY_ADDRESS_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: OPP_PROPERTY_ADDRESS_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.ADDRESS,
  name: 'propertyAddress',
  label: 'Property Address (Snapshot)',
  icon: 'IconMapPin',
  isNullable: true,
});
