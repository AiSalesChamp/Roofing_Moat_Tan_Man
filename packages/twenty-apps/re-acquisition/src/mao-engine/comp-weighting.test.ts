import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeFairValuePerAcre, countUsableComps } from './comp-weighting';
import { CompInput } from './types';

const asOf = new Date('2026-07-25T00:00:00Z');

test('returns null with zero comps', () => {
  assert.equal(computeFairValuePerAcre([], 10, asOf), null);
});

test('returns the exact price when a single comp matches subject acreage', () => {
  const comps: CompInput[] = [
    {
      pricePerAcre: 50_000,
      saleDate: '2026-06-01',
      acreage: 10,
      roadAccessRating: 'GOOD',
      buildabilityRating: 'GOOD',
    },
  ];
  const result = computeFairValuePerAcre(comps, 10, asOf);
  assert.ok(result !== null);
  assert.ok(Math.abs(result! - 50_000) < 1);
});

test('weights recent comps higher than stale comps', () => {
  const recent: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-07-01',
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const stale: CompInput = {
    pricePerAcre: 10_000,
    saleDate: '2020-01-01',
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const result = computeFairValuePerAcre([recent, stale], 10, asOf);
  assert.ok(result !== null);
  assert.ok(result! > 55_000, `expected recency-weighted value to skew toward the recent comp, got ${result}`);
});

test('weights acreage-similar comps higher than dissimilar comps', () => {
  const similar: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-06-01',
    acreage: 9,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const dissimilar: CompInput = {
    pricePerAcre: 10_000,
    saleDate: '2026-06-01',
    acreage: 400,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const result = computeFairValuePerAcre([similar, dissimilar], 10, asOf);
  assert.ok(result !== null);
  assert.ok(result! > 55_000, `expected acreage-similarity to skew toward the similar comp, got ${result}`);
});

test('rates POOR ratings lower than GOOD', () => {
  const good: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-06-01',
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const poor: CompInput = {
    pricePerAcre: 10_000,
    saleDate: '2026-06-01',
    acreage: 10,
    roadAccessRating: 'POOR',
    buildabilityRating: 'POOR',
  };
  const result = computeFairValuePerAcre([good, poor], 10, asOf);
  assert.ok(result !== null);
  assert.ok(result! > 55_000, `expected rating weighting to skew toward the GOOD comp, got ${result}`);
});

test('ignores comps with no recorded price rather than averaging them as zero', () => {
  const priced: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-06-01',
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const priceless: CompInput = { ...priced, pricePerAcre: 0 };

  const result = computeFairValuePerAcre([priced, priceless], 10, asOf);

  assert.ok(result !== null);
  assert.ok(
    Math.abs(result! - 100_000) < 1,
    `expected the priceless comp to be ignored, got ${result}`,
  );
});

test('returns null when no comp carries a usable price', () => {
  const priceless: CompInput = {
    pricePerAcre: 0,
    saleDate: '2026-06-01',
    acreage: 10,
  };

  assert.equal(computeFairValuePerAcre([priceless], 10, asOf), null);
});

test('an unparseable sale date does not poison the average with NaN', () => {
  const broken: CompInput = {
    pricePerAcre: 80_000,
    saleDate: 'not-a-date',
    acreage: 10,
  };

  const result = computeFairValuePerAcre([broken], 10, asOf);

  assert.ok(result !== null);
  assert.ok(Number.isFinite(result!), `expected a finite value, got ${result}`);
});

test('an undated comp never outranks a comp that closed this month', () => {
  const undated: CompInput = {
    pricePerAcre: 10_000,
    saleDate: null,
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };
  const fresh: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-07-01',
    acreage: 10,
    roadAccessRating: 'GOOD',
    buildabilityRating: 'GOOD',
  };

  const result = computeFairValuePerAcre([undated, fresh], 10, asOf);

  assert.ok(result !== null);
  assert.ok(
    result! > 55_000,
    `expected the dated comp to dominate the undated one, got ${result}`,
  );
});

test('counts only comps that actually contribute weight', () => {
  const usable: CompInput = {
    pricePerAcre: 100_000,
    saleDate: '2026-06-01',
    acreage: 10,
  };
  const priceless: CompInput = { ...usable, pricePerAcre: 0 };

  assert.equal(countUsableComps([usable, priceless, usable], 10, asOf), 2);
});
