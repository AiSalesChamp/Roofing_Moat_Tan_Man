import {
  BUYER_DEALS_ON_PERSON_FIELD_ID,
  BUYER_MARKET_FIELD_ID,
  CALL_LOGS_ON_PERSON_FIELD_ID,
  CONTACT_ROLE_FIELD_ID,
  DO_NOT_CONTACT_FIELD_ID,
  MOTIVATION_NOTES_FIELD_ID,
  PERSON_CITY_FIELD_ID,
  PERSON_EMAILS_FIELD_ID,
  PERSON_PHONES_FIELD_ID,
  PERSON_RECORD_PAGE_ID,
  PREFERRED_CONTACT_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

// Every contact type (seller, buyer, broker, title/escrow, etc.) shares this
// page layout via the contactRole field — see person-contact-role.field.ts.
export default definePageLayout({
  universalIdentifier: PERSON_RECORD_PAGE_ID,
  name: 'Contact Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  tabs: [
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000001',
      title: 'Profile',
      position: 0,
      icon: 'IconUser',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000001',
          title: 'Contact Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              CONTACT_ROLE_FIELD_ID,
              PREFERRED_CONTACT_FIELD_ID,
              DO_NOT_CONTACT_FIELD_ID,
              PERSON_EMAILS_FIELD_ID,
              PERSON_PHONES_FIELD_ID,
              PERSON_CITY_FIELD_ID,
              CALL_LOGS_ON_PERSON_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000002',
      title: 'Seller & Buyer Info',
      position: 50,
      icon: 'IconTargetArrow',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000002',
          title: 'Seller & Buyer Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            fieldMetadataUniversalIdentifiers: [
              MOTIVATION_NOTES_FIELD_ID,
              BUYER_MARKET_FIELD_ID,
              BUYER_DEALS_ON_PERSON_FIELD_ID,
            ],
          },
        },
      ],
    },
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000003',
      title: 'Timeline',
      position: 100,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000004',
      title: 'Tasks',
      position: 150,
      icon: 'IconCheckbox',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000004',
          title: 'Tasks',
          type: 'TASKS',
          configuration: { configurationType: 'TASKS' },
        },
      ],
    },
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000005',
      title: 'Notes',
      position: 200,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000005',
          title: 'Notes',
          type: 'NOTES',
          configuration: { configurationType: 'NOTES' },
        },
      ],
    },
    {
      universalIdentifier: 'pl300001-0001-4000-8000-000000000006',
      title: 'Files',
      position: 250,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'pl300002-0001-4000-8000-000000000006',
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
