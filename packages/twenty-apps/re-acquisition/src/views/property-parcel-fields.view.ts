import {
  PROPERTY_ACREAGE_FIELD_ID,
  PROPERTY_APN_FIELD_ID,
  PROPERTY_CLASS_FIELD_ID,
  PROPERTY_COUNTY_FIELD_ID,
  PROPERTY_GIS_LINK_FIELD_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_PARCEL_FIELDS_VIEW_ID,
  PROPERTY_SQFT_FIELD_ID,
  PROPERTY_ZONING_FIELD_ID,
  PROPERTY_ZONING_TRAJECTORY_FIELD_ID,
} from 'src/constants/universal-identifiers';
import { ViewType, defineView } from 'twenty-sdk/define';

// Backing view for the "Parcel Fields" widget on the property record page.
// Address is the label identifier — the record header already renders it, so it
// is left out here to match how standard record page field views are built.
export default defineView({
  universalIdentifier: PROPERTY_PARCEL_FIELDS_VIEW_ID,
  name: 'Property Parcel Fields',
  icon: 'IconMapPin',
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000001', fieldMetadataUniversalIdentifier: PROPERTY_APN_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000002', fieldMetadataUniversalIdentifier: PROPERTY_COUNTY_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000003', fieldMetadataUniversalIdentifier: PROPERTY_CLASS_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000004', fieldMetadataUniversalIdentifier: PROPERTY_ACREAGE_FIELD_ID, position: 3, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000005', fieldMetadataUniversalIdentifier: PROPERTY_SQFT_FIELD_ID, position: 4, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000006', fieldMetadataUniversalIdentifier: PROPERTY_ZONING_FIELD_ID, position: 5, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000007', fieldMetadataUniversalIdentifier: PROPERTY_ZONING_TRAJECTORY_FIELD_ID, position: 6, isVisible: true },
    { universalIdentifier: 'a1000042-0005-4000-8000-000000000008', fieldMetadataUniversalIdentifier: PROPERTY_GIS_LINK_FIELD_ID, position: 7, isVisible: true },
  ],
});
