import {
  COMPS_ON_PROPERTY_FIELD_ID,
  INSPECTIONS_ON_PROPERTY_FIELD_ID,
  OPPORTUNITIES_ON_PROPERTY_FIELD_ID,
  PROPERTY_ACREAGE_FIELD_ID,
  PROPERTY_ADDRESS_FIELD_ID,
  PROPERTY_APN_FIELD_ID,
  PROPERTY_CLASS_FIELD_ID,
  PROPERTY_COUNTY_FIELD_ID,
  PROPERTY_GIS_LINK_FIELD_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_RECORD_PAGE_ID,
  PROPERTY_SQFT_FIELD_ID,
  PROPERTY_ZONING_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

export default definePageLayout({
  universalIdentifier: PROPERTY_RECORD_PAGE_ID,
  name: 'Property Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: 'pl200001-0001-4000-8000-000000000001',
      title: 'Parcel Info',
      position: 0,
      icon: 'IconMapPin',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl200002-0001-4000-8000-000000000001',
          title: 'Parcel Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              PROPERTY_ADDRESS_FIELD_ID,
              PROPERTY_APN_FIELD_ID,
              PROPERTY_COUNTY_FIELD_ID,
              PROPERTY_CLASS_FIELD_ID,
              PROPERTY_ACREAGE_FIELD_ID,
              PROPERTY_SQFT_FIELD_ID,
              PROPERTY_ZONING_FIELD_ID,
              PROPERTY_GIS_LINK_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl200001-0001-4000-8000-000000000004',
      title: 'Deals & Inspections',
      position: 50,
      icon: 'IconTargetArrow',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl200002-0001-4000-8000-000000000004',
          title: 'Related Records',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              OPPORTUNITIES_ON_PROPERTY_FIELD_ID,
              INSPECTIONS_ON_PROPERTY_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl200001-0001-4000-8000-000000000005',
      // Use the relation field's "+" control here to quickly add a comp for
      // this parcel — comps are modeled per-property since the same parcel
      // can be re-offered across multiple deals.
      title: 'Comps',
      position: 60,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl200002-0001-4000-8000-000000000005',
          title: 'Comparable Sales',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [COMPS_ON_PROPERTY_FIELD_ID],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl200001-0001-4000-8000-000000000002',
      title: 'Timeline',
      position: 100,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl200002-0001-4000-8000-000000000002',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: 'pl200001-0001-4000-8000-000000000003',
      title: 'Files',
      position: 200,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl200002-0001-4000-8000-000000000003',
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
