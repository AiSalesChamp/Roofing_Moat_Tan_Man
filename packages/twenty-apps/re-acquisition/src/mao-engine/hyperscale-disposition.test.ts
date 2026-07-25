import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeHyperscaleDispositionMao } from './hyperscale-disposition';
import { CompInput } from './types';

const asOf = new Date('2026-07-25T00:00:00Z');

const corridorComps: CompInput[] = [
  {
    pricePerAcre: 200_000,
    saleDate: '2026-06-01',
    acreage: 40,
    isPowerFiberAdjacent: true,
  },
];

test('NO_PATH hard-rejects regardless of price or acreage', () => {
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'NO_PATH',
    estimatedTimelineMonths: null,
    corridorComps,
    subjectAcreage: 500,
    holdingCost: 0,
    asOfDate: asOf,
  });
  assert.equal(result.mao, null);
  assert.equal(result.gateStatus, 'HARD_REJECTED');
});

test('UNCONFIRMED with no timeline hard-rejects', () => {
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'UNCONFIRMED',
    estimatedTimelineMonths: null,
    corridorComps,
    subjectAcreage: 40,
    holdingCost: 0,
    asOfDate: asOf,
  });
  assert.equal(result.mao, null);
  assert.equal(result.gateStatus, 'HARD_REJECTED');
});

test('UNCONFIRMED with timeline beyond the max reasonable window hard-rejects', () => {
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'UNCONFIRMED',
    estimatedTimelineMonths: 48,
    maxReasonableTimelineMonths: 36,
    corridorComps,
    subjectAcreage: 40,
    holdingCost: 0,
    asOfDate: asOf,
  });
  assert.equal(result.mao, null);
  assert.equal(result.gateStatus, 'HARD_REJECTED');
});

test('UNCONFIRMED with timeline inside the window passes the gate and computes a discounted MAO', () => {
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'UNCONFIRMED',
    estimatedTimelineMonths: 12,
    maxReasonableTimelineMonths: 36,
    corridorComps,
    subjectAcreage: 40,
    holdingCost: 100_000,
    asOfDate: asOf,
  });
  assert.equal(result.gateStatus, 'PASSED');
  assert.ok(result.mao !== null);
  // corridorValue ~= 40 * 200,000 = 8,000,000; mao = 8,000,000*0.45 - 100,000 = 3,500,000
  assert.ok(Math.abs(result.mao! - 3_500_000) < 50_000, `got ${result.mao}`);
});

test('CONFIRMED interconnection passes and applies the 0.95 discount', () => {
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'CONFIRMED',
    estimatedTimelineMonths: 6,
    corridorComps,
    subjectAcreage: 40,
    holdingCost: 0,
    asOfDate: asOf,
  });
  assert.equal(result.gateStatus, 'PASSED');
  assert.ok(Math.abs(result.mao! - 7_600_000) < 50_000, `got ${result.mao}`);
});

test('falls back to the full comp set at LOW confidence when no corridor comps are flagged', () => {
  const nonCorridorComps: CompInput[] = [
    { pricePerAcre: 200_000, saleDate: '2026-06-01', acreage: 40, isPowerFiberAdjacent: false },
  ];
  const result = computeHyperscaleDispositionMao({
    interconnectionStatus: 'CONFIRMED',
    estimatedTimelineMonths: 6,
    corridorComps: nonCorridorComps,
    subjectAcreage: 40,
    holdingCost: 0,
    asOfDate: asOf,
  });
  assert.equal(result.confidence, 'LOW');
  assert.equal(result.inputsUsed.usedFallbackComps, true);
});
