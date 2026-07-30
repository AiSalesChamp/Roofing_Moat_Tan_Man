import { isChannelEnabled, type ContactChannel } from '../config/env.ts';
import { query, queryOne } from '../db/pool.ts';
import { checkSuppression } from '../compliance/suppression.ts';

// The promotion threshold. All four conditions must hold:
//   1. at least one distress event inside the lookback window
//   2. motivation score at or above the configured minimum
//   3. a resolvable mailing address
//   4. the owner is not suppressed for the intended channel
//
// Everything that fails is written to promotion_withholds with the reason, because
// the withhold log is the only honest way to tune the threshold later.

export type WithholdReason =
  | 'no_distress_event'
  | 'distress_event_too_old'
  | 'score_below_threshold'
  | 'no_mailing_address'
  | 'no_owner_resolved'
  | 'suppressed'
  | 'channel_disabled';

export type PromotionCandidate = {
  parcel_id: string;
  parcel_external_id: string;
  county_fips: string;
  county_name: string;
  apn_raw: string;
  apn_normalized: string;
  situs_street: string | null;
  situs_city: string | null;
  situs_state: string | null;
  situs_postcode: string | null;
  legal_description: string | null;
  acreage: number | null;
  land_market_value: number | null;
  improvement_value: number | null;
  land_use_code: string | null;
  deed_date: string | null;

  owner_id: string | null;
  owner_external_id: string | null;
  owner_name_raw: string | null;
  owner_entity_type: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  mailing_street: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_postcode: string | null;
  is_absentee: boolean | null;

  score: number | null;
  score_breakdown: Record<string, number> | null;

  active_event_count: number;
  latest_event_date: string | null;
  latest_event_type: string | null;
  last_distress_seen_at: string | null;
};

const CANDIDATE_QUERY = `
WITH active AS (
  SELECT
    d.parcel_id,
    count(*)::int AS active_event_count,
    max(COALESCE(d.event_date, d.sale_date)) AS latest_event_date,
    max(d.updated_at) AS last_distress_seen_at,
    (array_agg(d.type::text ORDER BY COALESCE(d.event_date, d.sale_date) DESC NULLS LAST))[1]
      AS latest_event_type
  FROM distress_events d
  WHERE d.parcel_id IS NOT NULL
    AND COALESCE(d.sale_status_raw, '') NOT ILIKE '%cancel%'
    AND (
      COALESCE(d.event_date, d.sale_date) >= current_date - ($1::int || ' days')::interval
      OR (
        COALESCE(d.event_date, d.sale_date) IS NULL
        AND d.updated_at >= now() - ($1::int || ' days')::interval
      )
    )
  GROUP BY d.parcel_id
)
SELECT
  p.id AS parcel_id,
  p.external_id AS parcel_external_id,
  p.county_fips,
  c.name AS county_name,
  p.apn_raw,
  p.apn_normalized,
  p.situs_street, p.situs_city, p.situs_state, p.situs_postcode,
  p.legal_description, p.acreage, p.land_market_value, p.improvement_value,
  p.land_use_code, p.deed_date::text AS deed_date,
  o.id AS owner_id,
  o.external_id AS owner_external_id,
  o.name_raw AS owner_name_raw,
  o.entity_type::text AS owner_entity_type,
  o.first_name AS owner_first_name,
  o.last_name AS owner_last_name,
  o.mailing_street, o.mailing_city, o.mailing_state, o.mailing_postcode,
  poc.is_absentee,
  s.score,
  s.breakdown AS score_breakdown,
  COALESCE(a.active_event_count, 0) AS active_event_count,
  a.latest_event_date::text AS latest_event_date,
  a.latest_event_type,
  a.last_distress_seen_at::text AS last_distress_seen_at
FROM parcels p
JOIN counties c ON c.fips = p.county_fips
LEFT JOIN active a ON a.parcel_id = p.id
LEFT JOIN parcel_owner_current poc ON poc.parcel_id = p.id
LEFT JOIN owners o ON o.id = poc.owner_id
LEFT JOIN lead_scores_latest s ON s.parcel_id = p.id
-- Only parcels with some distress history are worth evaluating at all; the rest
-- would produce millions of no_distress_event withhold rows every run.
WHERE EXISTS (SELECT 1 FROM distress_events d WHERE d.parcel_id = p.id)
`;

export type GateDecision =
  | { promote: true; candidate: PromotionCandidate }
  | { promote: false; candidate: PromotionCandidate; reason: WithholdReason; detail: string };

export const evaluateCandidate = async (
  candidate: PromotionCandidate,
  options: { minScore: number; lookbackDays: number; channel: ContactChannel },
): Promise<GateDecision> => {
  if (!isChannelEnabled(options.channel)) {
    return {
      promote: false,
      candidate,
      reason: 'channel_disabled',
      detail: `channel ${options.channel} is disabled by configuration`,
    };
  }

  if (candidate.active_event_count === 0) {
    // The parcel has distress history (the query requires it) but nothing inside
    // the window, so the distinction is age, not absence.
    return {
      promote: false,
      candidate,
      reason: 'distress_event_too_old',
      detail: `no distress event within ${options.lookbackDays} days`,
    };
  }

  if (candidate.owner_id === null) {
    return {
      promote: false,
      candidate,
      reason: 'no_owner_resolved',
      detail: 'no current owner on this parcel — appraisal roll not loaded for this county',
    };
  }

  // A PO Box is a resolvable mailing address; a street with no number is not.
  const hasMailingAddress =
    candidate.mailing_street !== null &&
    candidate.mailing_street.trim() !== '' &&
    candidate.mailing_postcode !== null;

  if (!hasMailingAddress) {
    return {
      promote: false,
      candidate,
      reason: 'no_mailing_address',
      detail: 'owner has no deliverable mailing address',
    };
  }

  if (candidate.score === null || candidate.score < options.minScore) {
    return {
      promote: false,
      candidate,
      reason: 'score_below_threshold',
      detail: `score ${candidate.score ?? 'unscored'} < ${options.minScore}`,
    };
  }

  const mailingFingerprint = [
    candidate.mailing_street,
    candidate.mailing_city,
    candidate.mailing_state,
    candidate.mailing_postcode,
  ]
    .map((part) => part ?? '')
    .join('|')
    .toUpperCase();

  const suppression = await checkSuppression({
    ownerId: candidate.owner_id,
    identifiers: [{ kind: 'mailing_address', value: mailingFingerprint }],
    channel: options.channel,
  });

  if (suppression.suppressed) {
    return {
      promote: false,
      candidate,
      reason: 'suppressed',
      detail: suppression.reason ?? 'suppressed',
    };
  }

  return { promote: true, candidate };
};

export const loadCandidates = async (lookbackDays: number): Promise<PromotionCandidate[]> =>
  query<PromotionCandidate>(CANDIDATE_QUERY, [lookbackDays]);

export const recordWithhold = async (
  parcelId: string,
  reason: WithholdReason,
  detail: string,
  channel: ContactChannel,
): Promise<void> => {
  await queryOne(
    `INSERT INTO promotion_withholds (parcel_id, reason, detail, channel)
     VALUES ($1, $2, $3, $4)`,
    [parcelId, reason, JSON.stringify({ detail }), channel],
  );
};
