import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAO_FORMULA_VERSION,
  compPricePerAcre,
  computeMao,
  median,
  normalizeRatio,
  toCurrency,
  toDollars,
} from './mao-engine';

const usd = (dollars: number) => ({
  amountMicros: dollars * 1_000_000,
  currencyCode: 'USD',
});

const assertClose = (
  actual: number | null,
  expected: number,
  label: string,
) => {
  assert.ok(actual != null, `${label}: expected ${expected}, got null`);
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `${label}: expected ${expected}, got ${actual}`,
  );
};

describe('helpers', () => {
  it('median handles empty, odd, and even inputs', () => {
    assert.equal(median([]), null);
    assert.equal(median([5]), 5);
    assert.equal(median([10, 1, 3]), 3);
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  it('toDollars and toCurrency round-trip micros', () => {
    assert.equal(toDollars(null), null);
    assert.equal(toDollars({ amountMicros: null }), null);
    assert.equal(toDollars(usd(640_000)), 640_000);
    assert.deepEqual(toCurrency(368_000), {
      amountMicros: 368_000_000_000,
      currencyCode: 'USD',
    });
  });

  it('compPricePerAcre prefers explicit value, else derives, else null', () => {
    assert.equal(
      compPricePerAcre({ pricePerAcre: usd(12_000), salePrice: usd(100_000), acreage: 10 }),
      12_000,
    );
    assert.equal(compPricePerAcre({ salePrice: usd(100_000), acreage: 10 }), 10_000);
    assert.equal(compPricePerAcre({ salePrice: usd(100_000) }), null);
    assert.equal(compPricePerAcre({ acreage: 10 }), null);
  });

  it('normalizeRatio reads >1 as a percentage and clamps to 0..1', () => {
    assert.equal(normalizeRatio(null, 0.5), 0.5);
    assert.equal(normalizeRatio(undefined, 0.6), 0.6);
    assert.equal(normalizeRatio(0.65, 0.5), 0.65);
    assert.equal(normalizeRatio(80, 0.5), 0.8);
    assert.equal(normalizeRatio(1, 0.5), 1);
    assert.equal(normalizeRatio(150, 0.5), 1);
    assert.equal(normalizeRatio(-2, 0.5), 0);
  });
});

describe('wholesale / flip', () => {
  it('uses the 70% ARV rule when an ARV exists', () => {
    const result = computeMao(
      { arv: usd(465_000), rehabEstimate: usd(20_000), assignmentFee: usd(10_000) },
      {},
      [],
      null,
    );
    // 465000 * 0.7 - 20000 - 10000
    assertClose(result.maoWholesaleFlip, 295_500, 'ARV branch');
    assert.equal(result.recommendedExitType, 'WHOLESALE_FLIP');
    assertClose(result.suggestedOffer, 295_500 * 0.925, 'suggested offer');
  });

  it('discounts comp-derived market value for raw land', () => {
    const result = computeMao(
      { offerAggressiveness: 0.8 },
      { acreage: 10 },
      [
        { pricePerAcre: usd(10_000) },
        { pricePerAcre: usd(20_000) },
        { pricePerAcre: usd(30_000) },
      ],
      null,
    );
    // median 20000/ac * 10 ac * (0.5 + 0.15*0.8)
    assertClose(result.maoWholesaleFlip, 200_000 * 0.62, 'comp branch');
  });

  it('treats offerAggressiveness 80 the same as 0.8', () => {
    const asFraction = computeMao(
      { offerAggressiveness: 0.8 },
      { acreage: 10, cadLandMarketValue: usd(200_000) },
      [],
      null,
    );
    const asPercent = computeMao(
      { offerAggressiveness: 80 },
      { acreage: 10, cadLandMarketValue: usd(200_000) },
      [],
      null,
    );
    assert.equal(asFraction.maoWholesaleFlip, asPercent.maoWholesaleFlip);
    assertClose(asPercent.maoWholesaleFlip, 200_000 * 0.62, 'percent input');
  });

  it('falls back to CAD land market value when no comps exist', () => {
    const result = computeMao({}, { acreage: 3, cadLandMarketValue: usd(640_000) }, [], null);
    // 640000 * (0.5 + 0.15*0.5) = 640000 * 0.575
    assertClose(result.maoWholesaleFlip, 368_000, 'CAD fallback');
  });

  it('applies the county multiplier and assignment fee on the land branch', () => {
    const result = computeMao(
      { countyMultiplierOverride: 1.2, assignmentFee: usd(15_000) },
      { cadLandMarketValue: usd(100_000) },
      [],
      null,
    );
    assertClose(result.maoWholesaleFlip, 100_000 * 0.575 * 1.2 - 15_000, 'multiplier');
  });

  it('returns null with no ARV, comps, or CAD value', () => {
    const result = computeMao({}, {}, [], null);
    assert.equal(result.maoWholesaleFlip, null);
    assert.equal(result.recommendedExitType, 'INSUFFICIENT_DATA');
    assert.equal(result.suggestedOffer, null);
  });

  it('ignores zero/negative acreage from integer truncation', () => {
    const result = computeMao(
      {},
      { acreage: 0, cadLandMarketValue: usd(100_000) },
      [{ pricePerAcre: usd(50_000) }],
      null,
    );
    // acreage unusable -> comp value cannot scale -> CAD fallback
    assertClose(result.maoWholesaleFlip, 57_500, 'zero acreage');
    assert.equal(result.gateReason, 'No usable acreage on linked property');
  });
});

describe('entitle & hold', () => {
  it('computes realized post-entitlement value minus carry, holding, margin', () => {
    const result = computeMao(
      {
        postEntitlementValue: usd(2_000_000),
        entitlementCarryCost: usd(150_000),
        holdingCostEstimate: usd(50_000),
        targetMargin: usd(100_000),
      },
      {},
      [],
      null,
    );
    // 2000000*0.6 - 150000 - 50000 - 100000
    assertClose(result.maoEntitleHold, 900_000, 'entitle & hold');
  });

  it('honors realizedValueRatio overrides, including percent scale', () => {
    const result = computeMao(
      { postEntitlementValue: usd(2_000_000), realizedValueRatio: 75 },
      {},
      [],
      null,
    );
    assertClose(result.maoEntitleHold, 1_500_000, 'percent ratio');
  });

  it('is null without a post-entitlement value', () => {
    const result = computeMao({}, { cadLandMarketValue: usd(100_000) }, [], null);
    assert.equal(result.maoEntitleHold, null);
  });
});

describe('hyperscale gate', () => {
  const passingInfra = {
    interconnectionStatus: 'CONFIRMED',
    substationDistanceMiles: 1.5,
    waterAccess: 'LIKELY',
  };

  it('stays NOT_EVALUATED with no infrastructure signal', () => {
    const result = computeMao({}, { acreage: 25 }, [], null);
    assert.equal(result.gateStatus, 'NOT_EVALUATED');
    assert.equal(result.gateReason, 'No infrastructure signal recorded for property');
    assert.equal(result.maoHyperscale, null);
  });

  it('hard-rejects under 20 acres', () => {
    const result = computeMao({}, { acreage: 10 }, [], passingInfra);
    assert.equal(result.gateStatus, 'HARD_REJECTED');
    assert.equal(result.gateReason, '10 acres < 20 minimum');
    assert.equal(result.maoHyperscale, null);
  });

  it('hard-rejects NO_PATH interconnection', () => {
    const result = computeMao(
      {},
      { acreage: 25 },
      [],
      { ...passingInfra, interconnectionStatus: 'NO_PATH' },
    );
    assert.equal(result.gateStatus, 'HARD_REJECTED');
    assert.equal(result.gateReason, 'No interconnection path');
  });

  it('hard-rejects distant or unknown substations', () => {
    const far = computeMao(
      {},
      { acreage: 25 },
      [],
      { ...passingInfra, substationDistanceMiles: 5 },
    );
    assert.equal(far.gateStatus, 'HARD_REJECTED');
    assert.equal(far.gateReason, 'Substation 5 mi > 2 mi max');

    const unknown = computeMao(
      {},
      { acreage: 25 },
      [],
      { ...passingInfra, substationDistanceMiles: null },
    );
    assert.equal(unknown.gateStatus, 'HARD_REJECTED');
    assert.equal(unknown.gateReason, 'Substation unknown mi > 2 mi max');
  });

  it('hard-rejects when water access is NONE', () => {
    const result = computeMao(
      {},
      { acreage: 25 },
      [],
      { ...passingInfra, waterAccess: 'NONE' },
    );
    assert.equal(result.gateStatus, 'HARD_REJECTED');
    assert.equal(result.gateReason, 'No water access');
  });

  it('prices from power/fiber-adjacent comps when the gate passes', () => {
    const result = computeMao(
      {},
      { acreage: 25 },
      [
        { pricePerAcre: usd(40_000), isPowerFiberAdjacent: true },
        { pricePerAcre: usd(10_000) },
      ],
      passingInfra,
    );
    assert.equal(result.gateStatus, 'PASSED');
    // 40000/ac * 25 ac * 0.575
    assertClose(result.maoHyperscale, 575_000, 'adjacent comps');
    // beats wholesale (median 25000/ac * 25 * 0.575 = 359375)
    assert.equal(result.recommendedExitType, 'HYPERSCALE_DISPOSITION');
    assertClose(result.suggestedOffer, 575_000 * 0.925, 'suggested offer');
  });

  it('applies the 1.5x premium over ordinary comps when no adjacent comps exist', () => {
    const result = computeMao(
      {},
      { acreage: 25 },
      [{ pricePerAcre: usd(10_000) }],
      passingInfra,
    );
    // 10000 * 1.5 * 25 * 0.575
    assertClose(result.maoHyperscale, 215_625, 'premium path');
  });

  it('falls back to post-entitlement value with no comps at all', () => {
    const result = computeMao(
      { postEntitlementValue: usd(3_000_000) },
      { acreage: 25 },
      [],
      passingInfra,
    );
    // 3000000 * 0.6
    assertClose(result.maoHyperscale, 1_800_000, 'PEV fallback');
  });
});

describe('audit snapshot', () => {
  it('records the formula version and full input set', () => {
    const result = computeMao(
      { offerAggressiveness: 80 },
      { acreage: 3, cadLandMarketValue: usd(640_000) },
      [{ pricePerAcre: usd(10_000) }],
      null,
    );
    assert.equal(result.inputsSnapshot.formulaVersion, MAO_FORMULA_VERSION);
    assert.equal(result.inputsSnapshot.compCount, 1);
    assert.equal(result.inputsSnapshot.aggressiveness, 0.8);
    assert.equal(result.inputsSnapshot.gateReason, 'No infrastructure signal recorded for property');
    assert.equal(result.candidates.length, 3);
  });
});
