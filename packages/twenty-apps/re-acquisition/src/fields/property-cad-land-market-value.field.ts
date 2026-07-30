import { CAD_LAND_MARKET_VALUE_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FieldType, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: CAD_LAND_MARKET_VALUE_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.CURRENCY,
  name: 'cadLandMarketValue',
  label: 'CAD Land Market Value',
  icon: 'IconBuildingBank',
  isNullable: true,
});
