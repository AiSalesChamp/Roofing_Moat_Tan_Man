import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  INSPECTION_CONDITION_FIELD_ID,
  INSPECTION_DATE_FIELD_ID,
  INSPECTION_FINDINGS_FIELD_ID,
  INSPECTION_TYPE_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'propertyInspection',
  namePlural: 'propertyInspections',
  labelSingular: 'Property Inspection',
  labelPlural: 'Property Inspections',
  description: 'Site visit, drive-by, or due diligence inspection',
  icon: 'IconClipboardCheck',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: INSPECTION_TYPE_FIELD_ID,
  fields: [
    {
      universalIdentifier: INSPECTION_TYPE_FIELD_ID,
      type: FieldType.SELECT,
      name: 'inspectionType',
      label: 'Inspection Type',
      icon: 'IconEye',
      defaultValue: "'DRIVE_BY'",
      options: [
        { id: 'c1000001-0001-4000-8000-000000000001', value: 'DRIVE_BY', label: 'Drive By', position: 0, color: 'gray' },
        { id: 'c1000001-0001-4000-8000-000000000002', value: 'WALKTHROUGH', label: 'Walkthrough', position: 1, color: 'blue' },
        { id: 'c1000001-0001-4000-8000-000000000003', value: 'ENVIRONMENTAL', label: 'Environmental', position: 2, color: 'orange' },
        { id: 'c1000001-0001-4000-8000-000000000004', value: 'SURVEY', label: 'Survey', position: 3, color: 'green' },
        { id: 'c1000001-0001-4000-8000-000000000005', value: 'PHASE_I', label: 'Phase I', position: 4, color: 'purple' },
      ],
    },
    {
      universalIdentifier: INSPECTION_DATE_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'inspectionDate',
      label: 'Inspection Date',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: INSPECTION_FINDINGS_FIELD_ID,
      type: FieldType.RICH_TEXT,
      name: 'findingsSummary',
      label: 'Findings Summary',
      icon: 'IconNotes',
      isNullable: true,
    },
    {
      universalIdentifier: INSPECTION_CONDITION_FIELD_ID,
      type: FieldType.SELECT,
      name: 'conditionRating',
      label: 'Condition Rating',
      icon: 'IconStar',
      isNullable: true,
      options: [
        { id: 'c1000002-0001-4000-8000-000000000001', value: 'EXCELLENT', label: 'Excellent', position: 0, color: 'green' },
        { id: 'c1000002-0001-4000-8000-000000000002', value: 'GOOD', label: 'Good', position: 1, color: 'blue' },
        { id: 'c1000002-0001-4000-8000-000000000003', value: 'FAIR', label: 'Fair', position: 2, color: 'yellow' },
        { id: 'c1000002-0001-4000-8000-000000000004', value: 'POOR', label: 'Poor', position: 3, color: 'orange' },
        { id: 'c1000002-0001-4000-8000-000000000005', value: 'UNINHABITABLE', label: 'Uninhabitable', position: 4, color: 'red' },
      ],
    },
  ],
});
