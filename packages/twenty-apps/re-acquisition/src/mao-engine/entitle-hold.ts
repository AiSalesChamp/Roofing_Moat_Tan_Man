import { ENTITLEMENT_RISK_DISCOUNTS } from './constants';
import { ExitPathResult, ZoningTrajectory } from './types';

export type EntitleHoldInput = {
  postEntitlementValue: number | null;
  zoningTrajectory: ZoningTrajectory;
  entitlementCarryCost: number;
  holdingCost: number;
  targetMargin: number;
};

// MAO = (Post-Entitlement Value x entitlement-risk discount)
//       - Entitlement Carry Costs - Holding Costs - Target Margin
export const computeEntitleHoldMao = (
  input: EntitleHoldInput,
): ExitPathResult => {
  const {
    postEntitlementValue,
    zoningTrajectory,
    entitlementCarryCost,
    holdingCost,
    targetMargin,
  } = input;

  if (!postEntitlementValue || postEntitlementValue <= 0) {
    return {
      mao: null,
      gateStatus: 'NOT_APPLICABLE',
      gateReason: 'Missing post-entitlement value',
      inputsUsed: { postEntitlementValue },
      confidence: 'LOW',
      insufficientData: true,
    };
  }

  const riskDiscountFactor = ENTITLEMENT_RISK_DISCOUNTS[zoningTrajectory];
  const mao =
    postEntitlementValue * riskDiscountFactor -
    entitlementCarryCost -
    holdingCost -
    targetMargin;

  return {
    mao,
    gateStatus: 'NOT_APPLICABLE',
    gateReason: null,
    inputsUsed: {
      postEntitlementValue,
      zoningTrajectory,
      riskDiscountFactor,
      entitlementCarryCost,
      holdingCost,
      targetMargin,
    },
    confidence: zoningTrajectory === 'UNKNOWN' ? 'LOW' : 'MEDIUM',
  };
};
