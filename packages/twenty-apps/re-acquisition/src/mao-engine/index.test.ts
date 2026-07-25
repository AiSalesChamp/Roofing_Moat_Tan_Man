import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeAllExitPaths } from './index';
import { CompInput } from './types';

const asOf = new Date('2026-07-25T00:00:00Z');

const comps: CompInput[] = [
  { pricePerAcre: 50_000, saleDate: '2026-06-01', acreage: 10, roadAccessRating: 'GOOD', buildabilityRating: 'GOOD' },
];

test('picks the highest-MAO path among non-gated paths', () => {
  const result = computeAllExitPaths({
    wholesaleFlip: { comps, subjectAcreage: 10, wholesaleFee: 5_000, asOfDate: asOf },
    entitleHold: {
      postEntitlementValue: 1_000_000,
      zoningTrajectory: 'STABLE',
      entitlementCarryCost: 50_000,
      holdingCost: 20_000,
      targetMargin: 100_000,
    },
    hyperscaleDisposition: {
      interconnectionStatus: 'NO_PATH',
      estimatedTimelineMonths: null,
      corridorComps: comps,
      subjectAcreage: 10,
      holdingCost: 0,
      asOfDate: asOf,
    },
  });

  // wholesale MAO ~320,000; entitle-hold MAO = 630,000; hyperscale hard-rejected.
  assert.equal(result.recommendedExitType, 'ENTITLE_HOLD');
  const hyperscale = result.paths.find((p) => p.exitType === 'HYPERSCALE_DISPOSITION');
  assert.equal(hyperscale?.gateStatus, 'HARD_REJECTED');
});

test('returns INSUFFICIENT_DATA when every path is gated or missing data', () => {
  const result = computeAllExitPaths({
    wholesaleFlip: { comps: [], subjectAcreage: null, wholesaleFee: 0 },
    entitleHold: {
      postEntitlementValue: null,
      zoningTrajectory: 'UNKNOWN',
      entitlementCarryCost: 0,
      holdingCost: 0,
      targetMargin: 0,
    },
    hyperscaleDisposition: {
      interconnectionStatus: 'NO_PATH',
      estimatedTimelineMonths: null,
      corridorComps: [],
      subjectAcreage: null,
      holdingCost: 0,
    },
  });

  assert.equal(result.recommendedExitType, 'INSUFFICIENT_DATA');
});
