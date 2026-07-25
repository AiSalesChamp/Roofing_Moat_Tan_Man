import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeWholesaleFlipMao } from './wholesale-flip';
import { CompInput } from './types';

const asOf = new Date('2026-07-25T00:00:00Z');

test('flags insufficient data with zero comps', () => {
  const result = computeWholesaleFlipMao({
    comps: [],
    subjectAcreage: 10,
    wholesaleFee: 5_000,
    asOfDate: asOf,
  });
  assert.equal(result.mao, null);
  assert.equal(result.insufficientData, true);
});

test('flags insufficient data with missing acreage', () => {
  const result = computeWholesaleFlipMao({
    comps: [{ pricePerAcre: 50_000, saleDate: '2026-06-01', acreage: 10 }],
    subjectAcreage: null,
    wholesaleFee: 5_000,
    asOfDate: asOf,
  });
  assert.equal(result.mao, null);
  assert.equal(result.insufficientData, true);
});

test('computes MAO as fairValue * feePct - wholesaleFee', () => {
  const comps: CompInput[] = [
    { pricePerAcre: 50_000, saleDate: '2026-06-01', acreage: 10, roadAccessRating: 'GOOD', buildabilityRating: 'GOOD' },
  ];
  const result = computeWholesaleFlipMao({
    comps,
    subjectAcreage: 10,
    wholesaleFee: 5_000,
    wholesaleFeePct: 0.65,
    asOfDate: asOf,
  });
  // fairValue ~= 10 * 50,000 = 500,000; mao = 500,000*0.65 - 5,000 = 320,000
  assert.ok(result.mao !== null);
  assert.ok(Math.abs(result.mao! - 320_000) < 1000, `expected ~320000, got ${result.mao}`);
});

test('confidence is HIGH with 3+ comps, MEDIUM with fewer', () => {
  const comp: CompInput = { pricePerAcre: 50_000, saleDate: '2026-06-01', acreage: 10 };
  const one = computeWholesaleFlipMao({ comps: [comp], subjectAcreage: 10, wholesaleFee: 0, asOfDate: asOf });
  const three = computeWholesaleFlipMao({ comps: [comp, comp, comp], subjectAcreage: 10, wholesaleFee: 0, asOfDate: asOf });
  assert.equal(one.confidence, 'MEDIUM');
  assert.equal(three.confidence, 'HIGH');
});
