import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  THRESHOLDS,
  computeFieldStats,
  decideDraft,
  fieldEligibility,
  riskClassForPath,
} from '../server/policy.js';

test('risk classes: financials/identity/stage-adjacent are high, notes are low', () => {
  assert.equal(riskClassForPath('disposition.askingPrice.value'), 'high');
  assert.equal(riskClassForPath('identity.apn.value'), 'high');
  assert.equal(riskClassForPath('identity.propertyAddress.street1'), 'high');
  assert.equal(riskClassForPath('siteFindings.offerIntent'), 'high');
  assert.equal(riskClassForPath('siteFindings.estimatedValue.value'), 'high');
  assert.equal(riskClassForPath('disposition.timelineToSell'), 'low');
  assert.equal(riskClassForPath('disposition.propertyConditionNotes'), 'low');
  assert.equal(riskClassForPath('siteFindings.findingsSummary'), 'low');
});

const eventsFor = (path, { samples, correct }) =>
  Array.from({ length: samples }, (_, i) => ({
    fields: [{ path, status: i < correct ? 'confirmed' : 'corrected' }],
  }));

test('computeFieldStats aggregates confirmed vs miss', () => {
  const stats = computeFieldStats(eventsFor('disposition.timelineToSell', { samples: 10, correct: 9 }));
  assert.equal(stats['disposition.timelineToSell'].samples, 10);
  assert.equal(stats['disposition.timelineToSell'].correct, 9);
  assert.ok(Math.abs(stats['disposition.timelineToSell'].accuracy - 0.9) < 1e-9);
});

test('low-risk field earns autonomy at ≥95% over ≥20 samples — not before', () => {
  const path = 'disposition.timelineToSell';
  const below = computeFieldStats(eventsFor(path, { samples: 19, correct: 19 }));
  assert.equal(fieldEligibility(path, below).eligible, false, '19 samples is not enough');

  const at = computeFieldStats(eventsFor(path, { samples: 20, correct: 19 }));
  assert.equal(fieldEligibility(path, at).eligible, true, '95% at 20 samples qualifies');

  const inaccurate = computeFieldStats(eventsFor(path, { samples: 40, correct: 37 }));
  assert.equal(fieldEligibility(path, inaccurate).eligible, false, '92.5% never qualifies');
});

test('high-risk field needs ≥98% over ≥50 samples AND a manual override', () => {
  const path = 'disposition.askingPrice.value';
  const stats = computeFieldStats(eventsFor(path, { samples: 60, correct: 60 }));
  assert.equal(fieldEligibility(path, stats).eligible, false, 'perfect data alone is not enough');
  assert.equal(
    fieldEligibility(path, stats, { [path]: true }).eligible,
    true,
    'data + manual enable qualifies',
  );
  const weak = computeFieldStats(eventsFor(path, { samples: 49, correct: 49 }));
  assert.equal(
    fieldEligibility(path, weak, { [path]: true }).eligible,
    false,
    'override cannot bypass the sample floor',
  );
});

test('decideDraft: auto-commits only when EVERY populated field is eligible', () => {
  const lowOnly = {
    identity: {},
    disposition: { timelineToSell: 'next month', propertyConditionNotes: 'roof fair' },
  };
  const stats = computeFieldStats([
    ...eventsFor('disposition.timelineToSell', { samples: 25, correct: 25 }),
    ...eventsFor('disposition.propertyConditionNotes', { samples: 25, correct: 25 }),
  ]);
  assert.equal(decideDraft(lowOnly, stats).decision, 'auto_commit');

  const withPrice = {
    ...lowOnly,
    disposition: { ...lowOnly.disposition, askingPrice: { value: 100000, quote: 'q' } },
  };
  assert.equal(
    decideDraft(withPrice, stats).decision,
    'pending',
    'one ineligible high-risk field holds the whole draft',
  );
});

test('decideDraft: kill switch and empty drafts always pend', () => {
  const extraction = { disposition: { timelineToSell: 'soon' } };
  const stats = computeFieldStats(eventsFor('disposition.timelineToSell', { samples: 25, correct: 25 }));
  assert.equal(
    decideDraft(extraction, stats, {}, { autonomyEnabled: false }).decision,
    'pending',
  );
  assert.equal(decideDraft({ identity: {} }, {}).decision, 'pending', 'no fields → no autonomy');
});

test('thresholds stay conservative', () => {
  assert.ok(THRESHOLDS.low.minAccuracy >= 0.95);
  assert.ok(THRESHOLDS.high.minAccuracy >= 0.98);
  assert.ok(THRESHOLDS.high.requiresManualEnable);
});
