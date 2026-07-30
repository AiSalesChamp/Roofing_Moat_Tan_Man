import {
  ACTUAL_PROFIT_FIELD_ID,
  ARV_FIELD_ID,
  ASKING_PRICE_FIELD_ID,
  CALL_LOGS_ON_OPPORTUNITY_FIELD_ID,
  CAP_RATE_FIELD_ID,
  CONTRACT_PRICE_FIELD_ID,
  CONTRACT_SENT_DATE_FIELD_ID,
  CONTRACT_TYPE_FIELD_ID,
  DEAL_STAGE_FIELD_ID,
  DEAL_TYPE_FIELD_ID,
  DD_DEADLINE_FIELD_ID,
  EARNEST_MONEY_FIELD_ID,
  HOLDING_COST_FIELD_ID,
  LEAD_SOURCE_FIELD_ID,
  MOTIVATION_FIELD_ID,
  NOI_FIELD_ID,
  OFFER_PRICE_FIELD_ID,
  OPP_POINT_OF_CONTACT_FIELD_ID,
  OPP_PROPERTY_ADDRESS_FIELD_ID,
  OPPORTUNITY_RECORD_PAGE_ID,
  PRICE_PER_ACRE_FIELD_ID,
  PRICE_PER_SQFT_FIELD_ID,
  PROJECTED_PROFIT_FIELD_ID,
  PROPERTY_ON_OPPORTUNITY_FIELD_ID,
  REHAB_ESTIMATE_FIELD_ID,
  SIGNED_CONTRACT_URL_FIELD_ID,
  SIGNATURE_REQUEST_ID_FIELD_ID,
  SIGNATURE_STATUS_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

export default definePageLayout({
  universalIdentifier: OPPORTUNITY_RECORD_PAGE_ID,
  name: 'Acquisition Deal Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  tabs: [
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000001',
      title: 'Deal Summary',
      position: 0,
      icon: 'IconTargetArrow',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000001',
          title: 'Deal Summary Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              DEAL_STAGE_FIELD_ID,
              DEAL_TYPE_FIELD_ID,
              LEAD_SOURCE_FIELD_ID,
              OPP_POINT_OF_CONTACT_FIELD_ID,
              MOTIVATION_FIELD_ID,
              PROPERTY_ON_OPPORTUNITY_FIELD_ID,
              CONTRACT_PRICE_FIELD_ID,
              PROJECTED_PROFIT_FIELD_ID,
              DD_DEADLINE_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000002',
      title: 'Underwriting',
      position: 50,
      icon: 'IconChartLine',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000002',
          title: 'Pricing',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              ASKING_PRICE_FIELD_ID,
              OFFER_PRICE_FIELD_ID,
              CONTRACT_PRICE_FIELD_ID,
              EARNEST_MONEY_FIELD_ID,
              ARV_FIELD_ID,
            ],
          },
        },
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000008',
          title: 'Costs & Returns',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              REHAB_ESTIMATE_FIELD_ID,
              HOLDING_COST_FIELD_ID,
              PROJECTED_PROFIT_FIELD_ID,
              ACTUAL_PROFIT_FIELD_ID,
              CAP_RATE_FIELD_ID,
              NOI_FIELD_ID,
              PRICE_PER_ACRE_FIELD_ID,
              PRICE_PER_SQFT_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000008',
      title: 'Property',
      position: 60,
      icon: 'IconBuildingSkyscraper',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000009',
          // Open the linked Property record to see full parcel detail,
          // the GIS/map link, and comparable sales — those live on the
          // Property object (a parcel can be re-offered across deals).
          title: 'Property',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              PROPERTY_ON_OPPORTUNITY_FIELD_ID,
              OPP_PROPERTY_ADDRESS_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000007',
      title: 'Contracts',
      position: 75,
      icon: 'IconFileSignature',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000007',
          title: 'Contract & E-Signature',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              CONTRACT_TYPE_FIELD_ID,
              SIGNATURE_STATUS_FIELD_ID,
              SIGNATURE_REQUEST_ID_FIELD_ID,
              SIGNED_CONTRACT_URL_FIELD_ID,
              CONTRACT_SENT_DATE_FIELD_ID,
              CONTRACT_PRICE_FIELD_ID,
              DD_DEADLINE_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000009',
      title: 'Calls',
      position: 90,
      icon: 'IconPhoneCall',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-00000000000a',
          // The relation field's "+" control is the quick-action for
          // logging a call directly from this deal (no separate button
          // widget type exists at the page-layout metadata level).
          title: 'Call Logs',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              CALL_LOGS_ON_OPPORTUNITY_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000003',
      title: 'Timeline',
      position: 100,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000004',
      title: 'Tasks',
      position: 150,
      icon: 'IconCheckbox',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000004',
          title: 'Tasks',
          type: 'TASKS',
          configuration: { configurationType: 'TASKS' },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000005',
      title: 'Notes',
      position: 200,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000005',
          title: 'Notes',
          type: 'NOTES',
          configuration: { configurationType: 'NOTES' },
        },
      ],
    },
    {
      universalIdentifier: 'pl100001-0001-4000-8000-000000000006',
      title: 'Files',
      position: 250,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl100002-0001-4000-8000-000000000006',
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
