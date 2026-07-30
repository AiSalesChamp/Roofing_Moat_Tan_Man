import {
  CONFIDENCE_WEIGHTED_RULES,
  MAX_SCORE,
  SCORE_WEIGHTS,
  SCORING_THRESHOLDS,
  WEIGHTS_VERSION,
  type ScoreRuleName,
} from '../config/scoring.ts';
import { query, queryOne } from '../db/pool.ts';
import { createLogger } from '../lib/logger.ts';

const logger = createLogger('score');

type ParcelScoringInput = {
  parcel_id: string;
  county_fips: string;
  improvement_value: number | null;
  deed_date: string | null;
  acreage: number | null;
  is_absentee: boolean | null;
  has_active_nots: boolean;
  active_tax_sale_confidence: number | null;
  active_struck_off_confidence: number | null;
  probate_confidence: number | null;
  lien_confidence: number | null;
  code_violation_confidence: number | null;
  delinquent_year_count: number;
};

// Undated events are the norm on LGBS: most rows are FUTURE SALE with a null
// sale date. An event with no date counts as active when the listing was seen in
// the current crawl window, which is what "still posted" actually means. Dating
// it "today" instead would make every score look freshly urgent forever.
const SCORING_QUERY = `
WITH active_events AS (
  SELECT d.*
    FROM distress_events d
   WHERE d.parcel_id IS NOT NULL
     AND (
       (d.event_date IS NOT NULL AND d.event_date >= current_date - ($1::int || ' days')::interval)
       OR (d.event_date IS NULL
           AND d.updated_at >= now() - ($1::int || ' days')::interval
           AND COALESCE(d.sale_status_raw, '') NOT ILIKE '%cancel%')
     )
),
per_parcel AS (
  SELECT
    parcel_id,
    bool_or(type = 'notice_of_trustee_sale') AS has_active_nots,
    max(CASE WHEN type = 'tax_sale' THEN confidence END) AS active_tax_sale_confidence,
    max(CASE WHEN type = 'struck_off' THEN confidence END) AS active_struck_off_confidence,
    max(CASE WHEN type = 'probate' THEN confidence END) AS probate_confidence,
    max(CASE WHEN type = 'lien' THEN confidence END) AS lien_confidence,
    max(CASE WHEN type = 'code_violation' THEN confidence END) AS code_violation_confidence,
    -- Distinct years across ALL events for the parcel, not just active ones:
    -- multi-year delinquency is a history, so history is what it must read.
    (
      SELECT count(DISTINCT COALESCE(
               extract(year FROM d2.event_date)::int,
               extract(year FROM d2.sale_date)::int
             ))
        FROM distress_events d2
       WHERE d2.parcel_id = active_events.parcel_id
         AND d2.type IN ('tax_sale', 'struck_off')
         AND COALESCE(d2.event_date, d2.sale_date) IS NOT NULL
    )::int AS delinquent_year_count
  FROM active_events
  GROUP BY parcel_id
)
SELECT
  p.id AS parcel_id,
  p.county_fips,
  p.improvement_value,
  p.deed_date::text AS deed_date,
  p.acreage,
  poc.is_absentee,
  e.has_active_nots,
  e.active_tax_sale_confidence,
  e.active_struck_off_confidence,
  e.probate_confidence,
  e.lien_confidence,
  e.code_violation_confidence,
  COALESCE(e.delinquent_year_count, 0) AS delinquent_year_count
FROM per_parcel e
JOIN parcels p ON p.id = e.parcel_id
LEFT JOIN parcel_owner_current poc ON poc.parcel_id = p.id
`;

export type ScoreBreakdown = Partial<Record<ScoreRuleName, number>>;

export type ScoredParcel = {
  parcelId: string;
  score: number;
  rawScore: number;
  breakdown: ScoreBreakdown;
};

const applyRule = (
  breakdown: ScoreBreakdown,
  rule: ScoreRuleName,
  confidence: number | null | undefined,
): void => {
  const weight = SCORE_WEIGHTS[rule];
  const multiplier = CONFIDENCE_WEIGHTED_RULES.includes(rule) ? (confidence ?? 0) : 1;
  const contribution = weight * multiplier;

  if (contribution > 0) {
    breakdown[rule] = Math.round(contribution * 100) / 100;
  }
};

export const scoreParcel = (input: ParcelScoringInput): ScoredParcel => {
  const breakdown: ScoreBreakdown = {};

  if (input.has_active_nots) {
    applyRule(breakdown, 'activeNoticeOfTrusteeSale', 1);
  }

  if (input.delinquent_year_count >= SCORING_THRESHOLDS.multiYearDelinquencyMinYears) {
    // Weighted by the strongest supporting event's confidence — the years came
    // from those events, so the claim is only as good as they are.
    applyRule(
      breakdown,
      'multiYearTaxDelinquency',
      Math.max(
        input.active_tax_sale_confidence ?? 0,
        input.active_struck_off_confidence ?? 0,
      ),
    );
  }

  applyRule(breakdown, 'taxSale', input.active_tax_sale_confidence);
  applyRule(breakdown, 'struckOff', input.active_struck_off_confidence);
  applyRule(breakdown, 'probate', input.probate_confidence);
  applyRule(breakdown, 'lien', input.lien_confidence);
  applyRule(breakdown, 'codeViolation', input.code_violation_confidence);

  if (input.is_absentee === true) {
    applyRule(breakdown, 'absenteeOwner', 1);
  }

  if (input.deed_date !== null) {
    const heldYears =
      (Date.now() - new Date(input.deed_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (heldYears >= SCORING_THRESHOLDS.longTenureYears) {
      applyRule(breakdown, 'longTenure', 1);
    }
  }

  if (
    input.improvement_value !== null &&
    input.improvement_value <= SCORING_THRESHOLDS.unimprovedMaxImprovementValue
  ) {
    applyRule(breakdown, 'vacantUnimproved', 1);
  }

  const rawScore = Object.values(breakdown).reduce((total, value) => total + value, 0);

  return {
    parcelId: input.parcel_id,
    // Clamped, but rawScore is kept in the breakdown so a parcel scoring 140 is
    // distinguishable from one scoring exactly 100 when tuning.
    score: Math.min(MAX_SCORE, Math.round(rawScore)),
    rawScore: Math.round(rawScore * 100) / 100,
    breakdown,
  };
};

export const scoreAllParcels = async (
  lookbackDays: number,
): Promise<{ scored: number; version: string }> => {
  const rows = await query<ParcelScoringInput>(SCORING_QUERY, [lookbackDays]);

  for (const row of rows) {
    const scored = scoreParcel(row);

    await queryOne(
      `INSERT INTO lead_scores (parcel_id, score, weights_version, breakdown)
       VALUES ($1, $2, $3, $4)`,
      [
        scored.parcelId,
        scored.score,
        WEIGHTS_VERSION,
        JSON.stringify({ ...scored.breakdown, __rawScore: scored.rawScore }),
      ],
    );
  }

  logger.info('scoring complete', { scored: rows.length, version: WEIGHTS_VERSION });

  return { scored: rows.length, version: WEIGHTS_VERSION };
};
