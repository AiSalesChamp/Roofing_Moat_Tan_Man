import {
  ALL_PROPERTIES_VIEW_ID,
  PROPERTY_ACREAGE_FIELD_ID,
  PROPERTY_ADDRESS_FIELD_ID,
  PROPERTY_APN_FIELD_ID,
  PROPERTY_CLASS_FIELD_ID,
  PROPERTY_COUNTY_FIELD_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_SQFT_FIELD_ID,
} from 'src/constants/universal-identifiers';
import { ViewType, defineView } from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: ALL_PROPERTIES_VIEW_ID,
  name: 'All Properties',
  icon: 'IconBuildingSkyscraper',
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: PROPERTY_ADDRESS_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: PROPERTY_APN_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PROPERTY_CLASS_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: PROPERTY_COUNTY_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000005', fieldMetadataUniversalIdentifier: PROPERTY_ACREAGE_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a2000020-0001-4000-8000-000000000006', fieldMetadataUniversalIdentifier: PROPERTY_SQFT_FIELD_ID, position: 5, isVisible: true },
  ],
});
