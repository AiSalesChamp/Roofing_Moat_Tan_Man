import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  INFRA_ASSESSED_DATE_FIELD_ID,
  INFRA_FIBER_DISTANCE_FIELD_ID,
  INFRA_INTERCONNECTION_STATUS_FIELD_ID,
  INFRA_NOTES_FIELD_ID,
  INFRA_SIGNAL_NAME_FIELD_ID,
  INFRA_SUBSTATION_DISTANCE_FIELD_ID,
  INFRA_TIMELINE_MONTHS_FIELD_ID,
  INFRA_TRANSMISSION_DISTANCE_FIELD_ID,
  INFRA_WATER_ACCESS_FIELD_ID,
  INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/underwriting-identifiers';

// Power/fiber/water proximity assessment per parcel. Feeds the hyperscale
// gate: a parcel with no interconnection path is hard-rejected for the
// hyperscale disposition exit regardless of price.
export default defineObject({
  universalIdentifier: INFRASTRUCTURE_SIGNAL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'infrastructureSignal',
  namePlural: 'infrastructureSignals',
  labelSingular: 'Infrastructure Signal',
  labelPlural: 'Infrastructure Signals',
  description: 'Power, fiber, and water proximity signals for hyperscale exit underwriting',
  icon: 'IconBolt',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: INFRA_SIGNAL_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: INFRA_SIGNAL_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      icon: 'IconBolt',
      isNullable: true,
    },
    {
      universalIdentifier: INFRA_INTERCONNECTION_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'interconnectionStatus',
      label: 'Interconnection Status',
      icon: 'IconPlugConnected',
      isNullable: true,
      options: [
        { id: 'f100000b-0003-4000-8000-000000000001', value: 'CONFIRMED', label: 'Confirmed', position: 0, color: 'green' },
        { id: 'f100000b-0003-4000-8000-000000000002', value: 'QUEUE_POSITION_SECURED', label: 'Queue Position Secured', position: 1, color: 'turquoise' },
        { id: 'f100000b-0003-4000-8000-000000000003', value: 'STUDY_IN_PROGRESS', label: 'Study In Progress', position: 2, color: 'blue' },
        { id: 'f100000b-0003-4000-8000-000000000004', value: 'UNCONFIRMED', label: 'Unconfirmed', position: 3, color: 'gray' },
        { id: 'f100000b-0003-4000-8000-000000000005', value: 'NO_PATH', label: 'No Path', position: 4, color: 'red' },
      ],
    },
    {
      // Decimals matter: the hyperscale gate is "<2 miles to 161kV+", and
      // 1.5 mi is not expressible as an integer.
      universalIdentifier: INFRA_SUBSTATION_DISTANCE_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'substationDistanceMiles',
      label: 'Substation Distance (mi)',
      icon: 'IconBolt',
      isNullable: true,
      universalSettings: { decimals: 2 },
    },
    {
      universalIdentifier: INFRA_TRANSMISSION_DISTANCE_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'transmissionLineDistanceMiles',
      label: 'Transmission Line Distance (mi)',
      icon: 'IconLineDashed',
      isNullable: true,
      universalSettings: { decimals: 2 },
    },
    {
      universalIdentifier: INFRA_FIBER_DISTANCE_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'fiberDistanceMiles',
      label: 'Fiber Distance (mi)',
      icon: 'IconNetwork',
      isNullable: true,
      universalSettings: { decimals: 2 },
    },
    {
      universalIdentifier: INFRA_WATER_ACCESS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'waterAccess',
      label: 'Water Access',
      icon: 'IconDroplet',
      isNullable: true,
      options: [
        { id: 'f100000b-0007-4000-8000-000000000001', value: 'CONFIRMED', label: 'Confirmed', position: 0, color: 'green' },
        { id: 'f100000b-0007-4000-8000-000000000002', value: 'LIKELY', label: 'Likely', position: 1, color: 'turquoise' },
        { id: 'f100000b-0007-4000-8000-000000000003', value: 'UNKNOWN', label: 'Unknown', position: 2, color: 'gray' },
        { id: 'f100000b-0007-4000-8000-000000000004', value: 'NONE', label: 'None', position: 3, color: 'red' },
      ],
    },
    {
      universalIdentifier: INFRA_TIMELINE_MONTHS_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'estimatedTimelineMonths',
      label: 'Estimated Timeline (months)',
      icon: 'IconCalendarTime',
      isNullable: true,
    },
    {
      universalIdentifier: INFRA_ASSESSED_DATE_FIELD_ID,
      type: FieldType.DATE,
      name: 'assessedDate',
      label: 'Assessed Date',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: INFRA_NOTES_FIELD_ID,
      type: FieldType.TEXT,
      name: 'notes',
      label: 'Notes',
      icon: 'IconNote',
      isNullable: true,
    },
  ],
});
