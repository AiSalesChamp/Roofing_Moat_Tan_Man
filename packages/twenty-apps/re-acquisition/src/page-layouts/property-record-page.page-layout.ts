import {
  PROPERTY_INFRASTRUCTURE_FIELDS_VIEW_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  PROPERTY_PARCEL_FIELDS_VIEW_ID,
  PROPERTY_RECORD_PAGE_ID,
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
      universalIdentifier: 'a3000003-0001-4000-8000-000000000001',
      title: 'Parcel Info',
      position: 0,
      icon: 'IconMapPin',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'a3000004-0001-4000-8000-000000000001',
          title: 'Parcel Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: PROPERTY_PARCEL_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000003-0001-4000-8000-000000000004',
      title: 'Infrastructure',
      position: 50,
      icon: 'IconBolt',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'a3000004-0001-4000-8000-000000000004',
          title: 'Infrastructure Signals',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: PROPERTY_INFRASTRUCTURE_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000003-0001-4000-8000-000000000002',
      title: 'Timeline',
      position: 100,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000004-0001-4000-8000-000000000002',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: 'a3000003-0001-4000-8000-000000000003',
      title: 'Files',
      position: 200,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000004-0001-4000-8000-000000000003',
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
