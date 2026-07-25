import {
  DEAL_CONTRACT_FIELDS_VIEW_ID,
  DEAL_EXIT_MAO_FIELDS_VIEW_ID,
  DEAL_SUMMARY_FIELDS_VIEW_ID,
  DEAL_UNDERWRITING_FIELDS_VIEW_ID,
  MAO_COMPARISON_FRONT_COMPONENT_ID,
  OPPORTUNITY_RECORD_PAGE_ID,
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
      universalIdentifier: 'a3000001-0001-4000-8000-000000000001',
      title: 'Deal Summary',
      position: 0,
      icon: 'IconTargetArrow',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000001',
          title: 'Deal Summary Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: DEAL_SUMMARY_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000002',
      title: 'Underwriting',
      position: 50,
      icon: 'IconChartLine',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000002',
          title: 'Underwriting Fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: DEAL_UNDERWRITING_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000008',
      title: 'Exit Strategy & MAO',
      position: 60,
      icon: 'IconTarget',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        // The comparison panel leads: it carries the gate reasons and comp
        // counts that the raw rollup fields below cannot show.
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000009',
          title: 'Exit Path Comparison',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              MAO_COMPARISON_FRONT_COMPONENT_ID,
          },
        },
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000008',
          title: 'MAO by Exit Path',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: DEAL_EXIT_MAO_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000007',
      title: 'Contracts',
      position: 75,
      icon: 'IconFileSignature',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000007',
          title: 'Contract & E-Signature',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: DEAL_CONTRACT_FIELDS_VIEW_ID,
            newFieldDefaultVisibility: false,
          },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000003',
      title: 'Timeline',
      position: 100,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000004',
      title: 'Tasks',
      position: 150,
      icon: 'IconCheckbox',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000004',
          title: 'Tasks',
          type: 'TASKS',
          configuration: { configurationType: 'TASKS' },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000005',
      title: 'Notes',
      position: 200,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000005',
          title: 'Notes',
          type: 'NOTES',
          configuration: { configurationType: 'NOTES' },
        },
      ],
    },
    {
      universalIdentifier: 'a3000001-0001-4000-8000-000000000006',
      title: 'Files',
      position: 250,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'a3000002-0001-4000-8000-000000000006',
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
