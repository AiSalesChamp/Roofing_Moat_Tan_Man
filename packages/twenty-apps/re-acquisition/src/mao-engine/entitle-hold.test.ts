import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeEntitleHoldMao } from './entitle-hold';

test('flags insufficient data with missing post-entitlement value', () => {
  const result = computeEntitleHoldMao({
    postEntitlementValue: null,
    zoningTrajectory: 'STABLE',
    entitlementCarryCost: 10_000,
    holdingCost: 5_000,
    targetMargin: 20_000,
  });
  assert.equal(result.mao, null);
  assert.equal(result.insufficientData, true);
});

test('applies the STABLE discount (0.80) and subtracts costs', () => {
  const result = computeEntitleHoldMao({
    postEntitlementValue: 1_000_000,
    zoningTrajectory: 'STABLE',
    entitlementCarryCost: 50_000,
    holdingCost: 20_000,
    targetMargin: 100_000,
  });
  // 1,000,000 * 0.80 - 50,000 - 20,000 - 100,000 = 630,000
  assert.equal(result.mao, 630_000);
});

test('UPZONING_LIKELY yields a higher MAO than DOWNZONING_RISK for identical inputs', () => {
  const base = {
    postEntitlementValue: 1_000_000,
    entitlementCarryCost: 50_000,
    holdingCost: 20_000,
    targetMargin: 100_000,
  };
  const up = computeEntitleHoldMao({ ...base, zoningTrajectory: 'UPZONING_LIKELY' });
  const down = computeEntitleHoldMao({ ...base, zoningTrajectory: 'DOWNZONING_RISK' });
  assert.ok(up.mao! > down.mao!);
});
