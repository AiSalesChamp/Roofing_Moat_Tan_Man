import { computeFairValuePerAcre, countUsableComps } from './comp-weighting';
import { DEFAULT_MAX_TIMELINE_MONTHS, HYPERSCALE_RISK_DISCOUNTS } from './constants';
import { CompInput, ExitPathResult, InterconnectionStatus } from './types';

export type HyperscaleDispositionInput = {
  interconnectionStatus: InterconnectionStatus;
  estimatedTimelineMonths: number | null;
  maxReasonableTimelineMonths?: number;
  corridorComps: CompInput[];
  subjectAcreage: number | null;
  holdingCost: number;
  asOfDate?: Date;
};

// HARD GATE: no confirmable interconnection path within a reasonable
// timeline auto-rejects this exit path regardless of price or acreage —
// power infrastructure lead times run years longer than construction
// timelines, so an unconfirmed-power site is not viable no matter how cheap.
//
// MAO = (comp value of power/fiber-adjacent parcels in corridor)
//       x risk discount for unconfirmed interconnection - Holding Costs
export const computeHyperscaleDispositionMao = (
  input: HyperscaleDispositionInput,
): ExitPathResult => {
  const {
    interconnectionStatus,
    estimatedTimelineMonths,
    maxReasonableTimelineMonths = DEFAULT_MAX_TIMELINE_MONTHS,
    corridorComps,
    subjectAcreage,
    holdingCost,
    asOfDate = new Date(),
  } = input;

  if (interconnectionStatus === 'NO_PATH') {
    return {
      mao: null,
      gateStatus: 'HARD_REJECTED',
      gateReason: 'No confirmable interconnection path',
      inputsUsed: { interconnectionStatus },
      confidence: 'HIGH',
    };
  }

  const timelineWithinReason =
    estimatedTimelineMonths != null &&
    estimatedTimelineMonths <= maxReasonableTimelineMonths;

  if (interconnectionStatus === 'UNCONFIRMED' && !timelineWithinReason) {
    return {
      mao: null,
      gateStatus: 'HARD_REJECTED',
      gateReason: `Unconfirmed interconnection with no timeline within ${maxReasonableTimelineMonths} months`,
      inputsUsed: { interconnectionStatus, estimatedTimelineMonths, maxReasonableTimelineMonths },
      confidence: 'HIGH',
    };
  }

  if (!subjectAcreage || subjectAcreage <= 0) {
    return {
      mao: null,
      gateStatus: 'PASSED',
      gateReason: 'Missing subject acreage',
      inputsUsed: { subjectAcreage },
      confidence: 'LOW',
      insufficientData: true,
    };
  }

  let comps = corridorComps.filter((comp) => comp.isPowerFiberAdjacent);
  let confidence: ExitPathResult['confidence'] = 'HIGH';
  let usedFallbackComps = false;
  if (comps.length === 0) {
    comps = corridorComps;
    confidence = 'LOW';
    usedFallbackComps = true;
  }

  const fairValuePerAcre = computeFairValuePerAcre(comps, subjectAcreage, asOfDate);
  if (fairValuePerAcre === null) {
    return {
      mao: null,
      gateStatus: 'PASSED',
      gateReason: 'No corridor comparable sales available',
      inputsUsed: { subjectAcreage, compCount: comps.length },
      confidence: 'LOW',
      insufficientData: true,
    };
  }

  const corridorValue = subjectAcreage * fairValuePerAcre;
  const riskDiscountFactor = HYPERSCALE_RISK_DISCOUNTS[interconnectionStatus];
  const mao = corridorValue * riskDiscountFactor - holdingCost;
  const usableCompCount = countUsableComps(comps, subjectAcreage, asOfDate);

  return {
    mao,
    gateStatus: 'PASSED',
    gateReason: null,
    inputsUsed: {
      corridorValue,
      riskDiscountFactor,
      holdingCost,
      compCount: comps.length,
      usableCompCount,
      usedFallbackComps,
    },
    // Corridor-adjacent comps only earn HIGH once there are enough of them;
    // a single power-adjacent sale is a data point, not a market.
    confidence:
      confidence === 'HIGH' && usableCompCount < 3 ? 'MEDIUM' : confidence,
  };
};
