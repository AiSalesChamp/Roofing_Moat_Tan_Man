import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  flattenExtraction,
  gradeExtractions,
  isEmptyValue,
  labelForPath,
  valuesEqual,
} from '../server/fields.js';

const sellerExtraction = () => ({
  documentMeta: { transcriptComplete: true, noExtractableContent: false },
  identity: {
    sellerFullName: { firstName: 'Carlos', lastName: '' },
    sellerEmail: null,
    leadPhoneE164: null,
    propertyAddress: { street1: 'Cave Creek Road', city: '', state: '', zip: '' },
    apn: { value: '123-45-678A', quote: 'Parcel number is 123-45-678A.' },
    leadSource: null,
  },
  disposition: {
    callOutcome: 'CONNECTED',
    sellerMotivation: ['inherited property', 'relocating'],
    askingPrice: { value: 220000, quote: 'around two-twenty' },
    timelineToSell: 'moving next month',
    propertyConditionNotes: null,
    objections: null,
    followUpCommitment: 'call back tomorrow',
    dealTypeHint: ['land'],
  },
  extractionMeta: { externalCallId: 'call-1', modelVersion: null },
});

test('flattenExtraction skips documentMeta/extractionMeta and unwraps evidence', () => {
  const leaves = flattenExtraction(sellerExtraction());
  const paths = leaves.map((l) => l.path);
  assert.ok(!paths.some((p) => p.startsWith('documentMeta')));
  assert.ok(!paths.some((p) => p.startsWith('extractionMeta')));

  const apn = leaves.find((l) => l.path === 'identity.apn.value');
  assert.equal(apn.value, '123-45-678A');
  assert.equal(apn.quote, 'Parcel number is 123-45-678A.');

  const price = leaves.find((l) => l.path === 'disposition.askingPrice.value');
  assert.equal(price.value, 220000);

  const street = leaves.find((l) => l.path === 'identity.propertyAddress.street1');
  assert.equal(street.value, 'Cave Creek Road');
});

test('isEmptyValue treats null/empty string/empty array as empty', () => {
  assert.ok(isEmptyValue(null));
  assert.ok(isEmptyValue(''));
  assert.ok(isEmptyValue([]));
  assert.ok(!isEmptyValue(0));
  assert.ok(!isEmptyValue(false));
  assert.ok(!isEmptyValue('x'));
});

test('valuesEqual is order-insensitive for arrays and trims strings', () => {
  assert.ok(valuesEqual(['a', 'b'], ['b', 'a']));
  assert.ok(valuesEqual(' Land ', 'land'));
  assert.ok(!valuesEqual(['a'], ['a', 'b']));
});

test('gradeExtractions: unedited confirm grades every populated field confirmed', () => {
  const graded = gradeExtractions(sellerExtraction(), sellerExtraction());
  assert.ok(graded.length > 0);
  assert.ok(graded.every((g) => g.status === 'confirmed'));
});

test('gradeExtractions: corrected, removed, added statuses', () => {
  const original = sellerExtraction();
  const edited = sellerExtraction();
  edited.disposition.askingPrice.value = 215000; // corrected
  edited.identity.apn = null; // removed (hallucination deleted)
  edited.disposition.propertyConditionNotes = 'roof is shot'; // added (model missed)

  const byPath = Object.fromEntries(
    gradeExtractions(original, edited).map((g) => [g.path, g.status]),
  );
  assert.equal(byPath['disposition.askingPrice.value'], 'corrected');
  assert.equal(byPath['identity.apn.value'], 'removed');
  assert.equal(byPath['disposition.propertyConditionNotes'], 'added');
  assert.equal(byPath['disposition.timelineToSell'], 'confirmed');
});

test('labelForPath has curated labels and a readable fallback', () => {
  assert.equal(labelForPath('disposition.askingPrice.value'), 'Asking price');
  assert.equal(labelForPath('identity.apn.value'), 'APN');
  assert.equal(labelForPath('some.unknownFieldName'), 'Unknown Field Name');
});
