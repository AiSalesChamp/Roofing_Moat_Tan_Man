import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  CONTACT_CONSENT_CAPTURED_AT_FIELD_ID,
  CONTACT_CONSENT_CHANNEL_FIELD_ID,
  CONTACT_CONSENT_EXPIRES_AT_FIELD_ID,
  CONTACT_CONSENT_NAME_FIELD_ID,
  CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  CONTACT_CONSENT_SOURCE_FIELD_ID,
  CONTACT_CONSENT_STATUS_FIELD_ID,
  CONTACT_CONSENT_VENDOR_FIELD_ID,
} from 'src/constants/lead-engine-identifiers';

// Per-person, per-channel consent state.
//
// Stock `person.doNotContact` is a single boolean: it cannot express "stop texting
// me but mail is fine", carries no provenance, and has no expiry. Under the Texas
// Data Privacy and Security Act (eff. July 2024) an opt-out must be honoured across
// targeted advertising and sale of personal data, with a 30-day cure period and
// $7,500 per violation — which means the system has to be able to show WHEN a
// request arrived, WHERE it came from, and WHICH channels it covered.
//
// One row per (person, channel). CHANNEL 'ALL' is what an unscoped request lands on.
export default defineObject({
  universalIdentifier: CONTACT_CONSENT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'contactConsent',
  namePlural: 'contactConsents',
  labelSingular: 'Contact Consent',
  labelPlural: 'Contact Consents',
  description: 'Per-person, per-channel contact permission and opt-out state',
  icon: 'IconShieldLock',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: CONTACT_CONSENT_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: CONTACT_CONSENT_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Consent',
      icon: 'IconShieldLock',
    },
    {
      universalIdentifier: CONTACT_CONSENT_CHANNEL_FIELD_ID,
      type: FieldType.SELECT,
      name: 'channel',
      label: 'Channel',
      icon: 'IconSend',
      defaultValue: "'ALL'",
      options: [
        {
          id: 'a1000008-0001-4000-8000-000000000001',
          value: 'ALL',
          label: 'All Channels',
          position: 0,
          color: 'red',
        },
        {
          id: 'a1000008-0001-4000-8000-000000000002',
          value: 'MAIL',
          label: 'Mail',
          position: 1,
          color: 'blue',
        },
        {
          id: 'a1000008-0001-4000-8000-000000000003',
          value: 'PHONE',
          label: 'Phone',
          position: 2,
          color: 'green',
        },
        {
          id: 'a1000008-0001-4000-8000-000000000004',
          value: 'SMS',
          label: 'SMS',
          position: 3,
          color: 'turquoise',
        },
        {
          id: 'a1000008-0001-4000-8000-000000000005',
          value: 'EMAIL',
          label: 'Email',
          position: 4,
          color: 'purple',
        },
        {
          id: 'a1000008-0001-4000-8000-000000000006',
          value: 'ADS',
          label: 'Ad Audiences',
          position: 5,
          color: 'orange',
        },
      ],
    },
    {
      universalIdentifier: CONTACT_CONSENT_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconCircleCheck',
      defaultValue: "'ALLOWED'",
      options: [
        {
          id: 'a1000008-0002-4000-8000-000000000001',
          value: 'ALLOWED',
          label: 'Allowed',
          position: 0,
          color: 'green',
        },
        {
          id: 'a1000008-0002-4000-8000-000000000002',
          value: 'OPTED_OUT',
          label: 'Opted Out',
          position: 1,
          color: 'red',
        },
        {
          id: 'a1000008-0002-4000-8000-000000000003',
          value: 'DNC_LISTED',
          label: 'DNC Listed',
          position: 2,
          color: 'red',
        },
        {
          id: 'a1000008-0002-4000-8000-000000000004',
          value: 'LITIGATOR_FLAGGED',
          label: 'Litigator Flagged',
          position: 3,
          color: 'red',
        },
        {
          id: 'a1000008-0002-4000-8000-000000000005',
          value: 'BOUNCED',
          label: 'Bounced',
          position: 4,
          color: 'orange',
        },
        {
          id: 'a1000008-0002-4000-8000-000000000006',
          value: 'DECEASED',
          label: 'Deceased',
          position: 5,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: CONTACT_CONSENT_SOURCE_FIELD_ID,
      type: FieldType.TEXT,
      name: 'source',
      label: 'Source',
      icon: 'IconInfoCircle',
      isNullable: true,
    },
    {
      // Which vendor supplied the underlying identifier. Required for data-broker
      // compliance, and it is also how vendor quality gets scored later.
      universalIdentifier: CONTACT_CONSENT_VENDOR_FIELD_ID,
      type: FieldType.TEXT,
      name: 'provenanceVendor',
      label: 'Provenance Vendor',
      icon: 'IconBuildingStore',
      isNullable: true,
    },
    {
      universalIdentifier: CONTACT_CONSENT_CAPTURED_AT_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'capturedAt',
      label: 'Captured At',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: CONTACT_CONSENT_EXPIRES_AT_FIELD_ID,
      type: FieldType.DATE_TIME,
      name: 'expiresAt',
      label: 'Expires At',
      icon: 'IconClockOff',
      isNullable: true,
    },
  ],
});
