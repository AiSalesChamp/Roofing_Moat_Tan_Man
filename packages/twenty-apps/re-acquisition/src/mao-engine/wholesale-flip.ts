import { computeFairValuePerAcre, countUsableComps } from './comp-weighting';
import { DEFAULT_WHOLESALE_FEE_PCT } from './constants';
import { CompInput, ExitPathResult } from './types';

export type WholesaleFlipInput = {
  comps: CompInput[];
  subjectAcreage: number | null;
  wholesaleFee: number;
  wholesaleFeePct?: number;
  asOfDate?: Date;
};

// MAO = (Fair Value x 0.60-0.70) - Wholesale Fee
// Fair Value = comp-weighted average price/acre x subject acreage.
export const computeWholesaleFlipMao = (
  input: WholesaleFlipInput,
): ExitPathResult => {
  const {
    comps,
    subjectAcreage,
    wholesaleFee,
    wholesaleFeePct = DEFAULT_WHOLESALE_FEE_PCT,
    asOfDate = new Date(),
  } = input;

  if (!subjectAcreage || subjectAcreage <= 0) {
    return {
      mao: null,
      gateStatus: 'NOT_APPLICABLE',
      gateReason: 'Missing subject acreage',
      inputsUsed: { subjectAcreage },
      confidence: 'LOW',
      insufficientData: true,
    };
  }

  const fairValuePerAcre = computeFairValuePerAcre(comps, subjectAcreage, asOfDate);
  if (fairValuePerAcre === null) {
    return {
      mao: null,
      gateStatus: 'NOT_APPLICABLE',
      gateReason: 'No comparable sales available',
      inputsUsed: { subjectAcreage, compCount: comps.length },
      confidence: 'LOW',
      insufficientData: true,
    };
  }

  const fairValue = subjectAcreage * fairValuePerAcre;
  const mao = fairValue * wholesaleFeePct - wholesaleFee;
  const usableCompCount = countUsableComps(comps, subjectAcreage, asOfDate);

  return {
    mao,
    gateStatus: 'NOT_APPLICABLE',
    gateReason: null,
    inputsUsed: {
      fairValuePerAcre,
      fairValue,
      wholesaleFeePct,
      wholesaleFee,
      compCount: comps.length,
      usableCompCount,
    },
    confidence: usableCompCount >= 3 ? 'HIGH' : 'MEDIUM',
  };
};
