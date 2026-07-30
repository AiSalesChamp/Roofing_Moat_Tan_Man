import { FieldType, defineField } from 'twenty-sdk/define';

import { PROPERTY_COUNTY_FIPS_FIELD_ID } from 'src/constants/lead-engine-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROPERTY_COUNTY_FIPS_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.TEXT,
  name: 'countyFips',
  label: 'County FIPS',
  icon: 'IconMap',
  isNullable: true,
});
