// End-to-end API test of the draft-and-confirm loop against a fake Twenty
// writer: submit → review → confirm/edit/discard → eval log → autonomy ratchet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import { createFieldLoopServer } from '../server/server.js';

class FakeWriter {
  constructor() {
    this.calls = [];
  }
  async request(method, path) {
    this.calls.push({ method, path });
    return { data: { properties: [] } };
  }
  async upsert(objectPlural, record) {
    this.calls.push({ upsert: objectPlural, record });
    return { ...record };
  }
  async writeSellerCallExtraction(extraction, transcript) {
    this.calls.push({ writeSellerCall: extraction, transcript });
    return { propertyId: 'p1', opportunityId: 'o1' };
  }
}

const sellerExtraction = (callId, overrides = {}) => ({
  documentMeta: { transcriptComplete: true, noExtractableContent: false },
  identity: {},
  disposition: {
    timelineToSell: 'next month',
    propertyConditionNotes: 'roof fair',
    ...overrides,
  },
  extractionMeta: { externalCallId: callId },
});

async function startLoop(t, { env = {}, writer = new FakeWriter() } = {}) {
  const { server, store } = createFieldLoopServer({
    dbPath: ':memory:',
    env: { TWENTY_API_KEY: 'test-key', ...env },
    writerFactory: () => writer,
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    store.close();
  });
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  return { base, call, store, writer };
}

test('draft lifecycle: submit → pending → confirm → committed + eval logged', async (t) => {
  const { call, store, writer } = await startLoop(t);

  const created = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'call-1',
    transcript: 'hello',
    extraction: sellerExtraction('call-1'),
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.decision, 'pending');
  const draftId = created.json.draft.id;
  assert.ok(created.json.draft.fields.some((f) => f.path === 'disposition.timelineToSell'));

  const listed = await call('GET', '/api/drafts?status=pending');
  assert.equal(listed.json.drafts.length, 1);

  const confirmed = await call('POST', `/api/drafts/${draftId}/confirm`, {});
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.json.draft.status, 'confirmed');
  assert.equal(confirmed.json.edited, false);
  assert.ok(writer.calls.some((c) => c.writeSellerCall));

  const events = store.listEvalEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'confirm');
  assert.ok(events[0].fields.every((f) => f.status === 'confirmed'));

  // resolved drafts refuse a second confirm
  const again = await call('POST', `/api/drafts/${draftId}/confirm`, {});
  assert.equal(again.status, 409);
});

test('edited confirm grades corrections and commits the edited extraction', async (t) => {
  const { call, writer } = await startLoop(t);
  const original = sellerExtraction('call-2', {
    askingPrice: { value: 220000, quote: 'two-twenty' },
  });
  const { json: created } = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'call-2',
    extraction: original,
  });
  const edited = structuredClone(original);
  edited.disposition.askingPrice.value = 215000;

  const confirmed = await call('POST', `/api/drafts/${created.draft.id}/confirm`, {
    extraction: edited,
  });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.json.edited, true);
  const priceGrade = confirmed.json.gradedFields.find(
    (f) => f.path === 'disposition.askingPrice.value',
  );
  assert.equal(priceGrade.status, 'corrected');
  const write = writer.calls.find((c) => c.writeSellerCall);
  assert.equal(write.writeSellerCall.disposition.askingPrice.value, 215000);
});

test('discard logs judgment but never writes to the CRM', async (t) => {
  const { call, store, writer } = await startLoop(t);
  const { json: created } = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'junk-call',
    extraction: sellerExtraction('junk-call'),
  });
  const discarded = await call('POST', `/api/drafts/${created.draft.id}/discard`, {
    reason: 'wrong number',
  });
  assert.equal(discarded.status, 200);
  assert.equal(discarded.json.draft.status, 'discarded');
  assert.equal(writer.calls.length, 0);
  assert.equal(store.listEvalEvents()[0].action, 'discard');
  // discards do not feed the accuracy ratchet
  assert.equal(store.listGradedEvents().length, 0);
});

test('schema-invalid extraction is rejected with 422', async (t) => {
  const { call } = await startLoop(t);
  const bad = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'bad-1',
    extraction: { identity: {} }, // missing required blocks
  });
  assert.equal(bad.status, 422);
});

test('autonomy ratchet: low-risk drafts auto-commit after 20 clean confirms; high-risk still holds', async (t) => {
  const { call, store } = await startLoop(t);

  // 20 clean confirms = exactly the sample floor for low-risk fields
  for (let i = 0; i < 20; i++) {
    const { json } = await call('POST', '/api/drafts', {
      kind: 'seller-call',
      sourceId: `train-${i}`,
      extraction: sellerExtraction(`train-${i}`),
    });
    assert.equal(json.decision, 'pending', `draft ${i} pends while accuracy is unearned`);
    const confirmed = await call('POST', `/api/drafts/${json.draft.id}/confirm`, {});
    assert.equal(confirmed.status, 200);
  }

  const accuracy = await call('GET', '/api/evals/accuracy');
  const timeline = accuracy.json.fields.find((f) => f.path === 'disposition.timelineToSell');
  assert.equal(timeline.samples, 20);
  assert.equal(timeline.eligible, true);

  // low-risk-only draft now auto-commits
  const auto = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'auto-1',
    extraction: sellerExtraction('auto-1'),
  });
  assert.equal(auto.json.decision, 'auto_commit');
  assert.equal(auto.json.draft.status, 'auto_committed');
  // auto-commits are logged but never feed accuracy (no self-grading)
  assert.ok(store.listEvalEvents().some((e) => e.action === 'auto_commit'));
  assert.equal(store.listGradedEvents().length, 20);

  // a high-risk field (asking price) holds the draft for a human
  const held = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'held-1',
    extraction: sellerExtraction('held-1', {
      askingPrice: { value: 100000, quote: 'one hundred' },
    }),
  });
  assert.equal(held.json.decision, 'pending');

  // kill switch pauses all autonomy
  await call('POST', '/api/autonomy/enabled', { enabled: false });
  const paused = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'auto-2',
    extraction: sellerExtraction('auto-2'),
  });
  assert.equal(paused.json.decision, 'pending');
});

test('failed commit → 502, no eval logged; retry with NEW edits grades the retry, once', async (t) => {
  let failures = 1;
  const writer = new FakeWriter();
  const originalWrite = writer.writeSellerCallExtraction.bind(writer);
  writer.writeSellerCallExtraction = async (...args) => {
    if (failures-- > 0) throw new Error('Twenty is down');
    return originalWrite(...args);
  };
  const { call, store } = await startLoop(t, { writer });

  const original = sellerExtraction('flaky-1');
  const { json: created } = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'flaky-1',
    extraction: original,
  });
  const first = await call('POST', `/api/drafts/${created.draft.id}/confirm`, {});
  assert.equal(first.status, 502);
  assert.equal(store.getDraft(created.draft.id).status, 'failed');
  assert.equal(store.listEvalEvents().length, 0, 'failed commit logs nothing');

  // The human edits differently on the retry — the log must reflect THAT.
  const edited = structuredClone(original);
  edited.disposition.timelineToSell = 'two months';
  const retry = await call('POST', `/api/drafts/${created.draft.id}/confirm`, {
    extraction: edited,
  });
  assert.equal(retry.status, 200);
  assert.equal(retry.json.draft.status, 'confirmed');
  const events = store.listEvalEvents();
  assert.equal(events.length, 1, 'one human judgment = one eval event');
  assert.equal(events[0].action, 'confirm_edited');
  const timeline = events[0].fields.find((f) => f.path === 'disposition.timelineToSell');
  assert.equal(timeline.status, 'corrected', 'retry grading reflects the latest edits');
});

test('failed auto-commit leaves no eval event, so a later human confirm still gets graded', async (t) => {
  const writer = new FakeWriter();
  const { call, store } = await startLoop(t, { writer });

  // Earn autonomy for the low-risk fields.
  for (let i = 0; i < 20; i++) {
    const { json } = await call('POST', '/api/drafts', {
      kind: 'seller-call',
      sourceId: `earn-${i}`,
      extraction: sellerExtraction(`earn-${i}`),
    });
    await call('POST', `/api/drafts/${json.draft.id}/confirm`, {});
  }

  // Twenty goes down exactly when an auto-commit fires.
  const originalWrite = writer.writeSellerCallExtraction.bind(writer);
  writer.writeSellerCallExtraction = async () => {
    throw new Error('Twenty is down');
  };
  const failed = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'auto-fail-1',
    extraction: sellerExtraction('auto-fail-1'),
  });
  assert.equal(failed.json.decision, 'auto_commit_failed');
  assert.equal(failed.json.draft.status, 'failed');
  assert.equal(
    store.listEvalEvents().filter((e) => e.action === 'auto_commit').length,
    0,
    'failed auto-commit must not log an audit event',
  );

  // Twenty recovers; the human reviews the failed draft — their judgment
  // must enter the ratchet (this was silently dropped before the fix).
  writer.writeSellerCallExtraction = originalWrite;
  const confirmed = await call('POST', `/api/drafts/${failed.json.draft.id}/confirm`, {});
  assert.equal(confirmed.status, 200);
  assert.equal(store.listGradedEvents().length, 21, 'human confirm after failed auto-commit is graded');
});

test('static mounts refuse path traversal on raw (non-normalized) request paths', async (t) => {
  const { base } = await startLoop(t);
  const { port } = new URL(base);
  const raw = await new Promise((resolvePromise, reject) => {
    const socket = (async () => (await import('node:net')).connect(Number(port), '127.0.0.1'))();
    socket.then((s) => {
      let data = '';
      s.on('data', (chunk) => (data += chunk));
      s.on('end', () => resolvePromise(data));
      s.on('error', reject);
      s.end('GET /glasses/../server/store.js HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
    }, reject);
  });
  const statusLine = raw.split('\r\n')[0];
  assert.ok(!/200/.test(statusLine), `traversal must not return 200 (got: ${statusLine})`);
  assert.ok(!raw.includes('FieldLoopStore'), 'server source must not leak');
});

test('missing TWENTY_API_KEY: confirm resolves locally with a recorded skip', async (t) => {
  const { call } = await startLoop(t, { env: { TWENTY_API_KEY: '' } });
  const { json: created } = await call('POST', '/api/drafts', {
    kind: 'seller-call',
    sourceId: 'local-1',
    extraction: sellerExtraction('local-1'),
  });
  const confirmed = await call('POST', `/api/drafts/${created.draft.id}/confirm`, {});
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.json.draft.status, 'confirmed');
  assert.equal(confirmed.json.draft.commitResult.skipped, true);
});

test('shared secret gates the API when configured', async (t) => {
  const { call } = await startLoop(t, { env: { FIELD_LOOP_SECRET: 's3cret' } });
  const denied = await call('GET', '/api/health');
  assert.equal(denied.status, 401);
  const allowed = await call('GET', '/api/health', null, { 'X-Field-Loop-Secret': 's3cret' });
  assert.equal(allowed.status, 200);
});

test('pipeline glance groups Twenty opportunities by dealStage', async (t) => {
  const twentyStub = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        data: {
          opportunities: [
            { id: '1', name: 'Cave Creek — Seller call', dealStage: 'QUALIFYING', askingPrice: { amountMicros: 220000000000 } },
            { id: '2', name: '1200 Industrial', dealStage: 'OFFER_OUT' },
            { id: '3', name: 'Mystery stage', dealStage: 'NOT_A_STAGE' },
          ],
        },
      }),
    );
  });
  await new Promise((resolve) => twentyStub.listen(0, resolve));
  t.after(() => twentyStub.close());

  const { call } = await startLoop(t, {
    env: { TWENTY_API_URL: `http://127.0.0.1:${twentyStub.address().port}` },
  });
  const { status, json } = await call('GET', '/api/pipeline');
  assert.equal(status, 200);
  assert.equal(json.stages.QUALIFYING.length, 1);
  assert.equal(json.stages.QUALIFYING[0].askingPrice, 220000);
  assert.equal(json.stages.OFFER_OUT.length, 1);
  assert.equal(json.stages.SOURCED.length, 1, 'unknown stages fall back to SOURCED');

  // without a key the glance degrades to 503, loop keeps working
  const noKey = await startLoop(t, { env: { TWENTY_API_KEY: '' } });
  const degraded = await noKey.call('GET', '/api/pipeline');
  assert.equal(degraded.status, 503);
});
