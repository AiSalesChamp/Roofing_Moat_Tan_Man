import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_COUNTY_MULTIPLIER,
  DEFAULT_OFFER_AGGRESSIVENESS,
} from './constants';
import {
  computeRealizedValueRatio,
  computeSuggestedOffer,
  normalizeCountyKey,
} from './suggested-offer';

test('returns null when the CAD land value is missing', () => {
  assert.equal(computeSuggestedOffer({ cadLandMarketValue: null }), null);
  assert.equal(computeSuggestedOffer({ cadLandMarketValue: undefined }), null);
});

test('returns null for a zero or negative CAD land value', () => {
  assert.equal(computeSuggestedOffer({ cadLandMarketValue: 0 }), null);
  assert.equal(computeSuggestedOffer({ cadLandMarketValue: -50_000 }), null);
});

test('returns null for a non-finite CAD land value', () => {
  assert.equal(computeSuggestedOffer({ cadLandMarketValue: Number.NaN }), null);
  assert.equal(
    computeSuggestedOffer({ cadLandMarketValue: Number.POSITIVE_INFINITY }),
    null,
  );
});

test('falls back to the default multiplier for an unmapped county', () => {
  const result = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    county: 'Nowhere',
  });

  assert.ok(result !== null);
  assert.equal(result.countyMultiplierSource, 'DEFAULT');
  assert.equal(result.countyMultiplier, DEFAULT_COUNTY_MULTIPLIER);
  assert.equal(result.offerAggressiveness, DEFAULT_OFFER_AGGRESSIVENESS);
  assert.equal(
    result.suggestedOffer,
    100_000 * DEFAULT_COUNTY_MULTIPLIER * DEFAULT_OFFER_AGGRESSIVENESS,
  );
});

test('the county map beats the default', () => {
  const result = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    county: 'Bastrop',
  });

  assert.ok(result !== null);
  assert.equal(result.countyMultiplierSource, 'COUNTY_MAP');
  assert.equal(result.countyMultiplier, 1.0);
});

test('the override beats the county map', () => {
  const result = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    county: 'Bastrop',
    countyMultiplierOverride: 1.45,
  });

  assert.ok(result !== null);
  assert.equal(result.countyMultiplierSource, 'OVERRIDE');
  assert.equal(result.countyMultiplier, 1.45);
});

test('an unusable override falls through instead of zeroing the offer', () => {
  for (const override of [0, -1, Number.NaN]) {
    const result = computeSuggestedOffer({
      cadLandMarketValue: 100_000,
      county: 'Bastrop',
      countyMultiplierOverride: override,
    });

    assert.ok(result !== null, `override ${override} produced no result`);
    assert.equal(result.countyMultiplierSource, 'COUNTY_MAP');
  }
});

test('county lookup ignores case, padding and a trailing "County"', () => {
  for (const county of ['bastrop', '  BASTROP  ', 'Bastrop County']) {
    const result = computeSuggestedOffer({
      cadLandMarketValue: 100_000,
      county,
    });

    assert.ok(result !== null);
    assert.equal(
      result.countyMultiplierSource,
      'COUNTY_MAP',
      `"${county}" did not map`,
    );
  }
});

test('normalizeCountyKey strips the county suffix once, not the name', () => {
  assert.equal(normalizeCountyKey(' hays county '), 'HAYS');
  assert.equal(normalizeCountyKey('County Line'), 'COUNTY LINE');
});

test('aggressiveness is clamped to 0-1', () => {
  const high = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    offerAggressiveness: 4,
  });
  const low = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    offerAggressiveness: -2,
  });

  assert.ok(high !== null && low !== null);
  assert.equal(high.offerAggressiveness, 1);
  assert.equal(low.offerAggressiveness, 0);
  assert.equal(low.suggestedOffer, 0);
});

test('a non-finite aggressiveness uses the default rather than producing NaN', () => {
  const result = computeSuggestedOffer({
    cadLandMarketValue: 100_000,
    offerAggressiveness: Number.NaN,
  });

  assert.ok(result !== null);
  assert.equal(result.offerAggressiveness, DEFAULT_OFFER_AGGRESSIVENESS);
  assert.ok(Number.isFinite(result.suggestedOffer));
});

test('no combination of inputs yields a NaN offer', () => {
  const badNumbers = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    -1,
  ];

  for (const override of badNumbers) {
    for (const aggressiveness of badNumbers) {
      const result = computeSuggestedOffer({
        cadLandMarketValue: 100_000,
        county: 'Hays',
        countyMultiplierOverride: override,
        offerAggressiveness: aggressiveness,
      });

      assert.ok(result !== null);
      assert.ok(
        Number.isFinite(result.suggestedOffer),
        `override=${override} aggressiveness=${aggressiveness} produced ${result.suggestedOffer}`,
      );
    }
  }
});

test('realized value ratio needs both a closed price and a CAD value', () => {
  assert.equal(computeRealizedValueRatio(null, 100_000), null);
  assert.equal(computeRealizedValueRatio(120_000, null), null);
  assert.equal(computeRealizedValueRatio(120_000, 0), null);
  assert.equal(computeRealizedValueRatio(0, 100_000), null);
  assert.equal(computeRealizedValueRatio(Number.NaN, 100_000), null);
});

test('realized value ratio is closed price over CAD value', () => {
  assert.equal(computeRealizedValueRatio(120_000, 100_000), 1.2);
});
