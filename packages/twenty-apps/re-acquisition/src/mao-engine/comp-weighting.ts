import {
  RECENCY_HALF_LIFE_MONTHS,
  UNKNOWN_RECENCY_WEIGHT,
} from './constants';
import { CompInput, RatingValue } from './types';

const RATING_WEIGHTS: Record<RatingValue, number> = {
  GOOD: 1.0,
  FAIR: 0.6,
  POOR: 0.3,
  UNKNOWN: 0.5,
};

const AVG_DAYS_PER_MONTH = 30.4375;

const monthsBetween = (from: Date, to: Date): number =>
  Math.max(0, (to.getTime() - from.getTime()) / (AVG_DAYS_PER_MONTH * 86_400_000));

// An unparseable date yields NaN from getTime(), which would propagate through
// the whole weighted average and silently null out the MAO — fall back to the
// unknown-date weight instead.
const recencyDecay = (saleDate: CompInput['saleDate'], asOfDate: Date): number => {
  if (saleDate === null || saleDate === undefined) return UNKNOWN_RECENCY_WEIGHT;

  const parsedSaleDate = new Date(saleDate);
  if (Number.isNaN(parsedSaleDate.getTime())) return UNKNOWN_RECENCY_WEIGHT;

  return Math.pow(
    0.5,
    monthsBetween(parsedSaleDate, asOfDate) / RECENCY_HALF_LIFE_MONTHS,
  );
};

const acreageSimilarity = (compAcreage: number, subjectAcreage: number): number => {
  if (compAcreage <= 0 || subjectAcreage <= 0) return 0.5;
  return 1 / (1 + Math.abs(Math.log(compAcreage / subjectAcreage)));
};

const ratingWeight = (rating: RatingValue | undefined): number =>
  RATING_WEIGHTS[rating ?? 'UNKNOWN'];

export const weightComp = (
  comp: CompInput,
  subjectAcreage: number,
  asOfDate: Date,
): number =>
  recencyDecay(comp.saleDate, asOfDate) *
  acreageSimilarity(comp.acreage, subjectAcreage) *
  ratingWeight(comp.roadAccessRating) *
  ratingWeight(comp.buildabilityRating);

// A comp with no recorded price is not a $0 sale, it is an absent data point.
// Averaging it in as zero would drag fair value down without bound.
const hasUsablePrice = (comp: CompInput): boolean =>
  Number.isFinite(comp.pricePerAcre) && comp.pricePerAcre > 0;

// Weighted average of pricePerAcre, weighted by recency, acreage similarity,
// road access, and buildability — never plain sqft (raw land pricing does
// not track sqft the way improved property does).
export const computeFairValuePerAcre = (
  comps: CompInput[],
  subjectAcreage: number,
  asOfDate: Date = new Date(),
): number | null => {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const comp of comps) {
    if (!hasUsablePrice(comp)) continue;

    const weight = weightComp(comp, subjectAcreage, asOfDate);
    if (!Number.isFinite(weight) || weight <= 0) continue;

    weightedSum += weight * comp.pricePerAcre;
    weightTotal += weight;
  }

  return weightTotal === 0 ? null : weightedSum / weightTotal;
};

// Comps that actually contribute to the weighted average. Confidence must be
// derived from this, not from the raw input length — otherwise three priceless
// rows read as HIGH confidence.
export const countUsableComps = (
  comps: CompInput[],
  subjectAcreage: number,
  asOfDate: Date = new Date(),
): number =>
  comps.filter((comp) => {
    if (!hasUsablePrice(comp)) return false;

    const weight = weightComp(comp, subjectAcreage, asOfDate);

    return Number.isFinite(weight) && weight > 0;
  }).length;
