import { distressEventExternalId } from '../../lib/external-id.ts';
import { sha256Hex } from '../../lib/hash.ts';
import { politeFetch } from '../../lib/http/polite-client.ts';
import { createLogger } from '../../lib/logger.ts';
import { normalizeAddress } from '../../normalize/address.ts';
import { normalizeApn } from '../../normalize/apn.ts';
import { resolveCountyFips } from '../../normalize/county.ts';
import type {
  DiscoveredTarget,
  DistressAdapter,
  DistressEventType,
  FetchedTarget,
  NormalizedDistressEvent,
} from '../types.ts';

const logger = createLogger('adapter:lgbs');

const BASE_URL = 'https://taxsales.lgbs.com';
const API_PATH = '/api/property_sales/';
const PAGE_SIZE = 500;

// The API serves more than Texas — a sample of 1000 came back 77% Pennsylvania.
// Filtering server-side AND asserting client-side, because a silently ignored
// query parameter would quietly fill the engine with out-of-state parcels.
const STATE = 'TX';

type LgbsRecord = {
  uid: number;
  sale_id: number | null;
  state: string;
  county: string;
  cause_nbr: string;
  precinct: string;
  sale_date: string | null;
  sale_date_only: string | null;
  sale_type: string;
  status: string;
  account_nbr: string;
  prop_address_one: string;
  prop_address_two: string;
  prop_city: string;
  prop_state: string;
  prop_zipcode: string;
  value: string | null;
  minimum_bid: string | null;
  sale_notes: string;
  geometry: { type: string; coordinates: [number, number] } | null;
};

const pageUrl = (offset: number): string =>
  `${BASE_URL}${API_PATH}?state=${STATE}&limit=${PAGE_SIZE}&offset=${offset}`;

const discover = async (): Promise<DiscoveredTarget[]> => {
  // One cheap request to learn the result count, then emit one target per page.
  // Paging is part of discovery rather than fetch so that a mid-run failure
  // resumes at page granularity.
  const probe = await politeFetch(`${BASE_URL}${API_PATH}?state=${STATE}&limit=1`);
  const parsed = JSON.parse(probe.body) as { count: number };
  const total = parsed.count;
  const pages = Math.ceil(total / PAGE_SIZE);

  logger.info('discovered', { total, pages });

  return Array.from({ length: pages }, (_unused, index) => ({
    id: `lgbs-tx-page-${index}`,
    url: pageUrl(index * PAGE_SIZE),
    label: `LGBS TX page ${index + 1}/${pages}`,
    countyNameRaw: undefined,
    meta: { offset: index * PAGE_SIZE, total },
  }));
};

const fetchTarget = async (target: DiscoveredTarget): Promise<FetchedTarget> => {
  const response = await politeFetch(target.url, { accept: 'application/json' });

  return {
    target,
    status: response.status,
    contentType: response.contentType,
    contentHash: sha256Hex(response.body),
    rawText: response.body,
    extractionStatus: response.body === '' ? 'empty' : 'ok',
  };
};

const parse = (fetched: FetchedTarget): Record<string, unknown>[] => {
  const payload = JSON.parse(fetched.rawText) as { results?: LgbsRecord[] };

  return (payload.results ?? []) as unknown as Record<string, unknown>[];
};

// sale_type values observed live: STRUCK OFF, SALE, FUTURE SALE, RESALE.
//
// Note what is NOT here: notice_of_trustee_sale. LGBS posts *tax* foreclosure
// sales. Deed-of-trust NOTS filings live with the county clerk and are not
// covered by either Phase 0 source — which matters, because NOTS carries the
// heaviest weight in the score. See README "known signal gaps".
const mapSaleType = (saleType: string): DistressEventType => {
  const normalized = saleType.trim().toUpperCase();

  // A resale is the taxing unit reselling property it already took, so it is
  // struck-off inventory rather than a fresh foreclosure.
  if (normalized === 'STRUCK OFF' || normalized === 'RESALE') {
    return 'struck_off';
  }

  return 'tax_sale';
};

const toNumber = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalize = async (
  records: Record<string, unknown>[],
  fetched: FetchedTarget,
): Promise<NormalizedDistressEvent[]> => {
  const events: NormalizedDistressEvent[] = [];

  for (const raw of records) {
    const record = raw as unknown as LgbsRecord;

    // Client-side assertion of the server-side filter.
    if (record.state !== STATE) {
      continue;
    }

    const countyFips = await resolveCountyFips(record.county);
    const apnRaw = record.account_nbr.trim();
    const apnNormalized = apnRaw === '' ? undefined : normalizeApn(apnRaw, countyFips);

    const addressLine = [record.prop_address_one, record.prop_address_two]
      .filter((part) => part.trim() !== '')
      .join(' ');

    const situs = normalizeAddress({
      street: addressLine === '' ? undefined : addressLine,
      city: record.prop_city === '' ? undefined : record.prop_city,
      state: record.prop_state === '' ? undefined : record.prop_state,
      postcode: record.prop_zipcode === '' ? undefined : record.prop_zipcode,
    });

    const type = mapSaleType(record.sale_type);
    const saleDate = record.sale_date_only ?? undefined;

    events.push({
      // uid is the source's own stable record id — the best possible doc ref.
      externalId: distressEventExternalId({
        sourceName: 'lgbs',
        countyFips,
        type,
        eventDate: saleDate,
        sourceDocRef: String(record.uid),
        apnNormalized,
      }),
      type,
      countyNameRaw: record.county,
      countyFips,
      apnRaw: apnRaw === '' ? undefined : apnRaw,
      apnNormalized,
      // Most rows are FUTURE SALE with a null date. event_date stays null rather
      // than being backfilled with today — the gate treats a currently-listed
      // undated event as active via last_seen_at instead of inventing a date.
      eventDate: saleDate,
      saleDate,
      causeNumber: record.cause_nbr.trim() === '' ? undefined : record.cause_nbr.trim(),
      defendantNameRaw: undefined,
      propertyAddressRaw: situs.raw === '' ? undefined : situs.raw,
      situs: {
        street: situs.street,
        city: situs.city,
        state: situs.state,
        postcode: situs.postcode,
      },
      adjudgedValue: toNumber(record.value),
      minimumBid: toNumber(record.minimum_bid),
      saleStatusRaw: record.status,
      saleNotes: record.sale_notes === '' ? undefined : record.sale_notes,
      longitude: record.geometry?.coordinates[0],
      latitude: record.geometry?.coordinates[1],
      sourceName: 'lgbs',
      sourceUrl: `${BASE_URL}/property_detail/${record.uid}`,
      sourceDocRef: String(record.uid),
      // Structured JSON from the publisher's own API. Not 1.0 because sale_type
      // is mapped onto our enum rather than stated in our terms.
      confidence: 0.95,
      rawPayload: raw,
    });
  }

  return events;
};

export const lgbsAdapter: DistressAdapter = {
  sourceName: 'lgbs',
  kind: 'distress_listing',
  provides:
    'Statewide TX tax sale + struck-off listings with APN, situs address, adjudged value, ' +
    'minimum bid and a point geometry. Provides NO owner name and NO mailing address.',
  discover,
  fetch: fetchTarget,
  parse,
  normalize,
};
