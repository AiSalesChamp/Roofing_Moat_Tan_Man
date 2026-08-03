import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FieldLoopStore } from '../server/store.js';

const extraction = { identity: {}, disposition: { timelineToSell: 'soon' }, extractionMeta: { externalCallId: 'c1' } };

const freshStore = (t) => {
  const store = new FieldLoopStore(':memory:');
  t.after(() => store.close());
  return store;
};

test('createDraft + getDraft round-trip', (t) => {
  const store = freshStore(t);
  const { draft, created } = store.createDraft({
    kind: 'seller-call',
    sourceId: 'call-1',
    transcript: 'hello',
    extraction,
    autonomy: { decision: 'pending' },
    meta: { source: 'test' },
  });
  assert.ok(created);
  assert.equal(draft.status, 'pending');
  const fetched = store.getDraft(draft.id);
  assert.deepEqual(fetched.extraction, extraction);
  assert.equal(fetched.meta.source, 'test');
});

test('createDraft is idempotent per (kind, sourceId) while pending', (t) => {
  const store = freshStore(t);
  const first = store.createDraft({ kind: 'seller-call', sourceId: 'call-1', extraction });
  const updatedExtraction = { ...extraction, disposition: { timelineToSell: 'next week' } };
  const second = store.createDraft({
    kind: 'seller-call',
    sourceId: 'call-1',
    extraction: updatedExtraction,
  });
  assert.equal(second.created, false);
  assert.equal(second.draft.id, first.draft.id);
  assert.equal(second.draft.extraction.disposition.timelineToSell, 'next week');
  assert.equal(store.listDrafts().length, 1);
});

test('resolved drafts are not overwritten by replayed submissions', (t) => {
  const store = freshStore(t);
  const { draft } = store.createDraft({ kind: 'seller-call', sourceId: 'call-1', extraction });
  store.resolveDraft(draft.id, { status: 'confirmed', finalExtraction: extraction });
  const replay = store.createDraft({ kind: 'seller-call', sourceId: 'call-1', extraction });
  assert.equal(replay.created, false);
  assert.equal(replay.draft.status, 'confirmed');
});

test('listDrafts filters by status and rejects unknown statuses', (t) => {
  const store = freshStore(t);
  const a = store.createDraft({ kind: 'seller-call', sourceId: 'a', extraction }).draft;
  store.createDraft({ kind: 'seller-call', sourceId: 'b', extraction });
  store.resolveDraft(a.id, { status: 'discarded' });
  assert.equal(store.listDrafts({ status: 'pending' }).length, 1);
  assert.equal(store.listDrafts({ status: 'discarded' }).length, 1);
  assert.throws(() => store.listDrafts({ status: 'bogus' }));
});

test('eval log: append and graded-events filter', (t) => {
  const store = freshStore(t);
  const { draft } = store.createDraft({ kind: 'seller-call', sourceId: 'call-1', extraction });
  store.logEvalEvent({
    draftId: draft.id,
    kind: 'seller-call',
    action: 'confirm',
    fields: [{ path: 'disposition.timelineToSell', status: 'confirmed' }],
  });
  store.logEvalEvent({ draftId: 'other', kind: 'seller-call', action: 'discard', fields: [] });
  store.logEvalEvent({ draftId: 'auto', kind: 'seller-call', action: 'auto_commit', fields: [] });

  assert.equal(store.listEvalEvents().length, 3);
  // accuracy only trusts human-graded confirms — no self-grading, no discards
  const graded = store.listGradedEvents();
  assert.equal(graded.length, 1);
  assert.equal(graded[0].action, 'confirm');
});

test('autonomy overrides and settings persist', (t) => {
  const store = freshStore(t);
  store.setAutonomyOverride('disposition.askingPrice.value', true, 'earned it');
  assert.deepEqual(store.getAutonomyOverrides(), { 'disposition.askingPrice.value': true });
  store.setAutonomyOverride('disposition.askingPrice.value', false);
  assert.deepEqual(store.getAutonomyOverrides(), { 'disposition.askingPrice.value': false });

  assert.equal(store.getSetting('autonomy_enabled', '1'), '1');
  store.setSetting('autonomy_enabled', '0');
  assert.equal(store.getSetting('autonomy_enabled', '1'), '0');
});
