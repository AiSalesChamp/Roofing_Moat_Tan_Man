// Shared Twenty write helpers: deterministic ids and composite field shapes.
//
// This is the single authority for how records get their ids. Every writer —
// acquisition-voice runner, re-lead-engine promotion, n8n Code nodes — must
// produce ids the same way or the same real-world entity lands in Twenty
// twice. n8n Code nodes cannot import this file; their inline code mirrors the
// seed grammar below, and any change here must be mirrored there
// (re-acquisition/n8n-workflows/*.json).
//
// Seed grammar (uuidv5 over UUID_NAMESPACE):
//   property:parcel:<parcelExternalId>     county-verified identity (engine),
//                                          parcelExternalId = tx-<fips>-<apn>
//   property:addr:<street|city|state|zip>  field-capture fallback, lowercased
//   person:owner:<ownerExternalId>         engine registry identity
//   person:phone:<e164>                    voice/capture identity
//   person:name:<normalized full name>     last resort
//   opportunity:<sourceId>                 callId or captureId
//   <label>:<sourceId>                     transcripts, notes, tasks, targets
//
// Parcel seeds and address seeds cannot collide-match each other; when a
// capture-path writer knows the APN it should look the property up by APN
// first (resolvePropertyIdByApn) instead of minting an address-seeded id.

import { createHash } from 'node:crypto';

export const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// RFC 4122 version-5 UUID (SHA-1, name-based). Zero-dependency so both the
// runner and the lead engine can share it.
export const uuidV5 = (name, namespace = UUID_NAMESPACE) => {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(Buffer.from(String(name), 'utf8'))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

export const addressKey = (address) =>
  [
    address?.addressStreet1,
    address?.addressCity,
    address?.addressState,
    address?.addressPostcode,
  ]
    .map(normalize)
    .join('|');

export const seeds = {
  propertyFromParcel: (parcelExternalId) =>
    `property:parcel:${normalize(parcelExternalId)}`,
  propertyFromAddress: (address) => `property:addr:${addressKey(address)}`,
  personFromOwner: (ownerExternalId) =>
    `person:owner:${normalize(ownerExternalId)}`,
  personFromPhone: (phoneE164) =>
    `person:phone:${String(phoneE164 ?? '').replace(/[^\d+]/g, '')}`,
  personFromName: (fullName) =>
    `person:name:${normalize(fullName).replace(/\s+/g, ' ')}`,
  opportunity: (sourceId) => `opportunity:${sourceId}`,
  labeled: (label, sourceId) => `${label}:${sourceId}`,
};

export const deterministicId = (seed) => uuidV5(seed);

// REST response unwrap: Twenty nests created/updated records under the
// singular object name. Naive `plural.slice(0, -1)` produces 'propertie' and
// 'peopl' — this map gets irregulars right.
const SINGULAR_BY_PLURAL = {
  properties: 'property',
  people: 'person',
  opportunities: 'opportunity',
  companies: 'company',
  callTranscripts: 'callTranscript',
  callLogs: 'callLog',
  comparableSales: 'comparableSale',
  propertyInspections: 'propertyInspection',
  distressEvents: 'distressEvent',
  contactConsents: 'contactConsent',
  dataSources: 'dataSource',
  maoCalculations: 'maoCalculation',
  infrastructureSignals: 'infrastructureSignal',
  notes: 'note',
  noteTargets: 'noteTarget',
  tasks: 'task',
  taskTargets: 'taskTarget',
  attachments: 'attachment',
};

export const singularOf = (plural) =>
  SINGULAR_BY_PLURAL[plural] ?? (plural.endsWith('s') ? plural.slice(0, -1) : plural);

export const unwrapRestRecord = (result, objectPlural) =>
  result?.data?.[singularOf(objectPlural)] ??
  result?.data?.[objectPlural.slice(0, -1)] ??
  result?.data ??
  result;

// --- Composite field shapes (REST payloads) ---

export const toAddress = (addr) => {
  if (!addr) return null;
  if (addr.addressStreet1) return addr;
  return {
    addressStreet1: addr.street1 || '',
    addressStreet2: addr.street2 || null,
    addressCity: addr.city || '',
    addressState: addr.state || '',
    addressPostcode: addr.zip || '',
    addressCountry: addr.country || 'United States',
  };
};

export const toCurrency = (value) => {
  if (value == null) return null;
  const num = typeof value === 'object' ? value.value : value;
  if (num == null || Number.isNaN(Number(num))) return null;
  return {
    amountMicros: Math.round(Number(num) * 1_000_000),
    currencyCode: 'USD',
  };
};

export const toRichText = (markdown) =>
  markdown ? { markdown: String(markdown), blocknote: null } : null;

export const toPhones = (e164) => {
  if (!e164) return null;
  const digits = String(e164).replace(/\D/g, '');
  const national = digits.startsWith('1') ? digits.slice(1) : digits;
  return {
    primaryPhoneNumber: national,
    primaryPhoneCountryCode: 'US',
    primaryPhoneCallingCode: '+1',
    additionalPhones: null,
  };
};

export const toFullName = (fullName) => {
  if (!fullName) return null;
  if (typeof fullName === 'object') {
    return fullName.firstName || fullName.lastName ? fullName : null;
  }
  const parts = String(fullName).trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

// Capture-path dedupe against engine-promoted parcels: when the APN is known,
// prefer the existing property record over minting an address-seeded id.
// `fetchJson(path)` must GET `${TWENTY_API_URL}${path}` with auth and return
// parsed JSON.
export const resolvePropertyIdByApn = async (fetchJson, apn) => {
  if (!apn) return null;
  const encoded = encodeURIComponent(String(apn).trim());
  const result = await fetchJson(
    `/rest/properties?filter=apn[eq]:${encoded}&limit=1`,
  );
  const records =
    result?.data?.properties ?? result?.data ?? [];
  return Array.isArray(records) && records[0]?.id ? records[0].id : null;
};
