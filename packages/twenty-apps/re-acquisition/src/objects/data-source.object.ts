import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  DATA_SOURCE_BASE_URL_FIELD_ID,
  DATA_SOURCE_COUNTY_FIPS_FIELD_ID,
  DATA_SOURCE_LAST_COUNT_FIELD_ID,
  DATA_SOURCE_LAST_RUN_FIELD_ID,
  DATA_SOURCE_NAME_FIELD_ID,
  DATA_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  DATA_SOURCE_SLA_HOURS_FIELD_ID,
  DATA_SOURCE_STATUS_FIELD_ID,
  DATA_SOURCE_VENDOR_PLATFORM_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';

// Scraper provenance and health, mirrored from the engine so the CRM can show WHY
// the lead flow slowed down without anyone opening a terminal. The engine remains
// the system of record; this is a read-only projection it pushes.
export default defineObject({
  universalIdentifier: DATA_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dataSource',
  namePlural: 'dataSources',
  labelSingular: 'Data Source',
  labelPlural: 'Data Sources',
  description: 'A public records source feeding the lead engine, with freshness and health',
  icon: 'IconDatabase',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: DATA_SOURCE_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: DATA_SOURCE_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Source Name',
      icon: 'IconDatabase',
    },
    {
      universalIdentifier: DATA_SOURCE_COUNTY_FIPS_FIELD_ID,
      type: FieldType.TEXT,
      name: 'countyFips',
      label: 'County FIPS',
      icon: 'IconMap',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_VENDOR_PLATFORM_FIELD_ID,
      type: FieldType.TEXT,
      name: 'vendorPlatform',
      label: 'Vendor / Platform',
      icon: 'IconBuildingStore',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_BASE_URL_FIELD_ID,
      type: FieldType.LINKS,
      name: 'baseUrl',
      label: 'Base URL',
      icon: 'IconLink',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_LAST_RUN_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'lastSuccessfulRunAt',
      label: 'Last Successful Run',
      icon: 'IconClockCheck',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_LAST_COUNT_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'lastRecordCount',
      label: 'Last Record Count',
      icon: 'IconListNumbers',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_SLA_HOURS_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'freshnessSlaHours',
      label: 'Freshness SLA (hours)',
      icon: 'IconHourglass',
      isNullable: true,
    },
    {
      universalIdentifier: DATA_SOURCE_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconActivity',
      defaultValue: "'HEALTHY'",
      options: [
        {
          id: 'a1000009-0001-4000-8000-000000000001',
          value: 'HEALTHY',
          label: 'Healthy',
          position: 0,
          color: 'green',
        },
        {
          id: 'a1000009-0001-4000-8000-000000000002',
          value: 'STALE',
          label: 'Stale',
          position: 1,
          color: 'orange',
        },
        {
          id: 'a1000009-0001-4000-8000-000000000003',
          value: 'FAILING',
          label: 'Failing',
          position: 2,
          color: 'red',
        },
        {
          id: 'a1000009-0001-4000-8000-000000000004',
          value: 'DISABLED',
          label: 'Disabled',
          position: 3,
          color: 'gray',
        },
      ],
    },
  ],
});
