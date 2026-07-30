import { env, type ContactChannel } from '../config/env.ts';
import { queryOne } from '../db/pool.ts';
import { hashPayload } from '../lib/hash.ts';
import { createLogger } from '../lib/logger.ts';
import { uuidV5 } from '../lib/uuid.ts';
import {
  evaluateCandidate,
  loadCandidates,
  recordWithhold,
  type PromotionCandidate,
  type WithholdReason,
} from './gate.ts';
import { createTwentyClient, toMicros, TWENTY_OBJECTS } from './twenty-client.ts';

const logger = createLogger('promote');

export type PromotionPlanEntry = {
  parcelExternalId: string;
  ownerExternalId: string | null;
  county: string;
  apn: string;
  score: number | null;
  reasonPromoted: string;
  propertyPayload: Record<string, unknown>;
  personPayload: Record<string, unknown>;
  distressEventPayload: Record<string, unknown> | null;
};

export type PromotionSummary = {
  runId: string;
  dryRun: boolean;
  evaluated: number;
  promoted: number;
  unchanged: number;
  withheld: number;
  failed: number;
  withholdsByReason: Record<string, number>;
  plan: PromotionPlanEntry[];
  failures: { parcelExternalId: string; error: string }[];
};

// Land use codes are per-CAD, so mapping is deliberately coarse: get the class
// roughly right and let a human refine it, rather than pretend to know that
// Harris code "C1" means the same as Bexar's.
const derivePropertyClass = (candidate: PromotionCandidate): string => {
  const improvement = candidate.improvement_value ?? 0;

  if (improvement <= 5000) {
    return 'LAND';
  }

  return 'COMMERCIAL';
};

const buildAddress = (
  street: string | null,
  city: string | null,
  state: string | null,
  postcode: string | null,
): Record<string, unknown> => ({
  addressStreet1: street ?? '',
  addressStreet2: null,
  addressCity: city ?? '',
  addressState: state ?? 'TX',
  addressPostcode: postcode ?? '',
  addressCountry: 'United States',
});

const buildPlanEntry = (
  candidate: PromotionCandidate,
  namespace: string,
): PromotionPlanEntry => {
  // Seed grammar is shared across all writers — see
  // re-acquisition/shared/twenty-writes.mjs before changing these.
  const propertyId = uuidV5(
    `property:parcel:${candidate.parcel_external_id}`,
    namespace,
  );
  const personId =
    candidate.owner_external_id === null
      ? null
      : uuidV5(`person:owner:${candidate.owner_external_id}`, namespace);

  // No `name` key: property's label identifier is propertyAddress; the REST
  // API has no real name column to write (DRIFT.md).
  const propertyPayload: Record<string, unknown> = {
    id: propertyId,
    propertyAddress: buildAddress(
      candidate.situs_street,
      candidate.situs_city,
      candidate.situs_state,
      candidate.situs_postcode,
    ),
    apn: candidate.apn_raw,
    county: candidate.county_name,
    countyFips: candidate.county_fips,
    propertyClass: derivePropertyClass(candidate),
    legalDescription: candidate.legal_description,
    // Written to the engine-owned external id field so promotion is idempotent
    // even if someone re-creates the Twenty record by hand.
    engineParcelId: candidate.parcel_external_id,
    motivationScore: candidate.score,
    isAbsentee: candidate.is_absentee,
    lastDistressEventAt: candidate.latest_event_date,
    mailingAddress: buildAddress(
      candidate.mailing_street,
      candidate.mailing_city,
      candidate.mailing_state,
      candidate.mailing_postcode,
    ),
  };

  if (candidate.acreage !== null) {
    propertyPayload.acreage = candidate.acreage;
  }

  if (candidate.land_market_value !== null) {
    propertyPayload.cadLandMarketValue = toMicros(candidate.land_market_value);
  }

  const personPayload: Record<string, unknown> = {
    id: personId,
    name: {
      firstName: candidate.owner_first_name ?? '',
      // Entities have no first/last split, so the whole registry name goes in
      // lastName — the label identifier stays correct instead of blank.
      lastName:
        candidate.owner_entity_type === 'individual'
          ? (candidate.owner_last_name ?? '')
          : (candidate.owner_name_raw ?? ''),
    },
    contactRole: ['SELLER'],
    engineOwnerId: candidate.owner_external_id,
    skipTraceStatus: 'NOT_REQUESTED',
    parcelCount: 1,
  };

  const distressEventPayload =
    candidate.latest_event_type === null
      ? null
      : {
          id: uuidV5(
            `distressEvent:${candidate.parcel_external_id}:latest`,
            namespace,
          ),
          name: `${candidate.latest_event_type} ${candidate.latest_event_date ?? 'undated'}`,
          type: candidate.latest_event_type.toUpperCase(),
          eventDate: candidate.latest_event_date,
          countyFips: candidate.county_fips,
          propertyId,
        };

  return {
    parcelExternalId: candidate.parcel_external_id,
    ownerExternalId: candidate.owner_external_id,
    county: candidate.county_name,
    apn: candidate.apn_raw,
    score: candidate.score,
    reasonPromoted: `score ${candidate.score} >= threshold, ${candidate.active_event_count} active distress event(s), latest ${candidate.latest_event_type ?? 'unknown'} ${candidate.latest_event_date ?? '(undated, currently listed)'}`,
    propertyPayload,
    personPayload,
    distressEventPayload,
  };
};

export const runPromotion = async (options: {
  dryRun: boolean;
  minScore?: number;
  lookbackDays?: number;
  channel?: ContactChannel;
  limit?: number;
}): Promise<PromotionSummary> => {
  const minScore = options.minScore ?? env.promotion.minScore;
  const lookbackDays = options.lookbackDays ?? env.promotion.lookbackDays;
  const channel = options.channel ?? env.promotion.defaultChannel;
  const namespace = env.uuidNamespace;

  const runRow = await queryOne<{ id: string }>(
    `INSERT INTO promotion_runs (dry_run, min_score, lookback_days, channel)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [options.dryRun, minScore, lookbackDays, channel],
  );

  if (runRow === undefined) {
    throw new Error('failed to create promotion run');
  }

  const summary: PromotionSummary = {
    runId: runRow.id,
    dryRun: options.dryRun,
    evaluated: 0,
    promoted: 0,
    unchanged: 0,
    withheld: 0,
    failed: 0,
    withholdsByReason: {},
    plan: [],
    failures: [],
  };

  const client = options.dryRun ? undefined : createTwentyClient();
  const candidates = await loadCandidates(lookbackDays);

  for (const candidate of candidates) {
    summary.evaluated += 1;

    const decision = await evaluateCandidate(candidate, { minScore, lookbackDays, channel });

    if (!decision.promote) {
      summary.withheld += 1;
      summary.withholdsByReason[decision.reason] =
        (summary.withholdsByReason[decision.reason] ?? 0) + 1;

      // Withholds are logged even on a dry run: the point of --dry-run is to see
      // the decision, and the reason distribution IS the decision.
      await recordWithhold(candidate.parcel_id, decision.reason as WithholdReason, decision.detail, channel);
      continue;
    }

    const entry = buildPlanEntry(candidate, namespace);

    if (options.limit !== undefined && summary.plan.length >= options.limit) {
      break;
    }

    summary.plan.push(entry);

    if (options.dryRun || client === undefined) {
      summary.promoted += 1;
      continue;
    }

    try {
      // Skip the write when nothing changed. Twenty's timeline records every
      // update, so a no-op write is not free — it is noise in the record's history.
      const payloadHash = hashPayload({
        property: entry.propertyPayload,
        person: entry.personPayload,
        distress: entry.distressEventPayload,
      });

      const existing = await queryOne<{ last_payload_hash: string | null }>(
        `SELECT last_payload_hash FROM twenty_sync_state
          WHERE entity_kind = 'parcel' AND external_id = $1`,
        [entry.parcelExternalId],
      );

      if (existing?.last_payload_hash === payloadHash) {
        summary.unchanged += 1;
        continue;
      }

      const property = await client.upsert(TWENTY_OBJECTS.properties, entry.propertyPayload);
      const person = await client.upsert(TWENTY_OBJECTS.people, entry.personPayload);

      if (entry.distressEventPayload !== null) {
        await client.upsert(TWENTY_OBJECTS.distressEvents, entry.distressEventPayload);
      }

      await recordSyncState('parcel', entry.parcelExternalId, 'properties', property.id, payloadHash);

      if (entry.ownerExternalId !== null) {
        await recordSyncState('owner', entry.ownerExternalId, 'people', person.id, payloadHash);
      }

      summary.promoted += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({ parcelExternalId: entry.parcelExternalId, error: String(error) });
      logger.error('promotion failed', {
        parcelExternalId: entry.parcelExternalId,
        error: String(error),
      });
    }
  }

  await queryOne(
    `UPDATE promotion_runs
        SET finished_at = now(), status = 'succeeded',
            evaluated = $2, promoted = $3, updated = $4, withheld = $5, failed = $6
      WHERE id = $1`,
    [
      summary.runId,
      summary.evaluated,
      summary.promoted,
      summary.unchanged,
      summary.withheld,
      summary.failed,
    ],
  );

  return summary;
};

const recordSyncState = async (
  entityKind: 'parcel' | 'owner' | 'distress_event',
  externalId: string,
  twentyObject: string,
  twentyRecordId: string,
  payloadHash: string,
): Promise<void> => {
  await queryOne(
    `INSERT INTO twenty_sync_state
       (entity_kind, external_id, twenty_object, twenty_record_id, last_payload_hash,
        last_pushed_at, last_status)
     VALUES ($1, $2, $3, $4, $5, now(), 'ok')
     ON CONFLICT (entity_kind, external_id) DO UPDATE SET
       twenty_record_id = EXCLUDED.twenty_record_id,
       last_payload_hash = EXCLUDED.last_payload_hash,
       last_pushed_at = now(),
       last_status = 'ok',
       last_error = NULL,
       updated_at = now()`,
    [entityKind, externalId, twentyObject, twentyRecordId, payloadHash],
  );
};
