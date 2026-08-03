import { test } from 'node:test';
import assert from 'node:assert/strict';

import { commitDraft, twentyConfigured } from '../server/commit.js';
import { writeSiteMemoExtraction } from '../../acquisition-voice/runner/twenty-writer.js';

class RecordingWriter {
  constructor() {
    this.upserts = [];
  }
  async request() {
    return { data: { properties: [] } };
  }
  async upsert(objectPlural, record) {
    this.upserts.push({ objectPlural, record });
    return { ...record };
  }
}

const siteMemoExtraction = {
  documentMeta: { transcriptComplete: true, noExtractableContent: false },
  identity: {
    propertyAddress: { street1: '1200 Industrial Blvd', city: 'Dallas', state: 'TX', zip: '' },
    apn: null,
    propertyClass: 'INDUSTRIAL',
  },
  siteFindings: {
    inspectionType: 'DRIVE_BY',
    conditionRating: 'FAIR',
    accessNotes: 'gate open',
    occupancyObserved: 'single tenant',
    zoningNotes: 'LI zoned',
    environmentalRedFlags: null,
    compsMentioned: [{ address: '1150 Industrial', salePrice: 1100000, saleDate: null }],
    estimatedValue: { value: 1150000, quote: 'offer around 1.15M' },
    offerIntent: true,
    findingsSummary: 'warehouse, fair condition',
  },
  extractionMeta: { externalMemoId: 'memo-1' },
};

test('twentyConfigured requires an API key', () => {
  assert.equal(twentyConfigured({}), false);
  assert.equal(twentyConfigured({ TWENTY_API_KEY: 'k' }), true);
});

test('commitDraft skips (not fails) without credentials', async () => {
  const result = await commitDraft(
    { kind: 'seller-call', extraction: {}, transcript: '' },
    { env: {} },
  );
  assert.equal(result.skipped, true);
});

test('commitDraft rejects unknown kinds', async () => {
  await assert.rejects(
    commitDraft(
      { kind: 'mystery', extraction: {} },
      { env: { TWENTY_API_KEY: 'k' }, writerFactory: () => new RecordingWriter() },
    ),
    /Unsupported draft kind/,
  );
});

test('site-memo write follows the field mapping: property, opportunity, inspection, comps', async () => {
  const writer = new RecordingWriter();
  const result = await writeSiteMemoExtraction(writer, siteMemoExtraction, 'memo body');

  const byObject = Object.fromEntries(writer.upserts.map((u) => [u.objectPlural, u.record]));

  assert.equal(byObject.properties.propertyClass, 'INDUSTRIAL');
  assert.equal(byObject.properties.propertyAddress.addressStreet1, '1200 Industrial Blvd');

  // offerIntent=true advances the deal to OFFER_OUT per twenty-field-mapping.md
  assert.equal(byObject.opportunities.dealStage, 'OFFER_OUT');
  assert.equal(byObject.opportunities.askingPrice.amountMicros, 1150000 * 1_000_000);

  assert.equal(byObject.propertyInspections.inspectionType, 'DRIVE_BY');
  assert.equal(byObject.propertyInspections.conditionRating, 'FAIR');
  assert.match(byObject.propertyInspections.findingsSummary.markdown, /Access:/);

  assert.equal(byObject.comparableSales.salePrice.amountMicros, 1100000 * 1_000_000);
  assert.equal(result.comparableSaleIds.length, 1);

  // deterministic ids: same memo re-committed lands on the same records
  const writer2 = new RecordingWriter();
  const result2 = await writeSiteMemoExtraction(writer2, siteMemoExtraction, 'memo body');
  assert.equal(result2.propertyId, result.propertyId);
  assert.equal(result2.opportunityId, result.opportunityId);
});

test('site-memo without offer intent stays QUALIFYING', async () => {
  const writer = new RecordingWriter();
  const noOffer = structuredClone(siteMemoExtraction);
  noOffer.siteFindings.offerIntent = false;
  await writeSiteMemoExtraction(writer, noOffer, '');
  const opp = writer.upserts.find((u) => u.objectPlural === 'opportunities').record;
  assert.equal(opp.dealStage, 'QUALIFYING');
});
