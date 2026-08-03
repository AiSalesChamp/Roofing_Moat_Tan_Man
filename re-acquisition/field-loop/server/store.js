// Draft store + eval log on node:sqlite (zero native deps, Node ≥22.5).
//
// Drafts are a SIDECAR, not a shadow CRM: confirmed data lives in Twenty
// only. What this DB owns is the pending queue and the append-only eval log
// (extraction vs human correction) — the corpus that earns autonomy.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transcript TEXT,
  extraction_json TEXT NOT NULL,
  final_extraction_json TEXT,
  autonomy_json TEXT,
  commit_result_json TEXT,
  error TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_source ON drafts(kind, source_id);

CREATE TABLE IF NOT EXISTS eval_events (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eval_events_created ON eval_events(created_at);

CREATE TABLE IF NOT EXISTS autonomy_overrides (
  path TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  note TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const DRAFT_STATUSES = new Set([
  'pending',
  'confirmed',
  'auto_committed',
  'discarded',
  'failed',
]);

const rowToDraft = (row) =>
  row && {
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    status: row.status,
    transcript: row.transcript,
    extraction: JSON.parse(row.extraction_json),
    finalExtraction: row.final_extraction_json ? JSON.parse(row.final_extraction_json) : null,
    autonomy: row.autonomy_json ? JSON.parse(row.autonomy_json) : null,
    commitResult: row.commit_result_json ? JSON.parse(row.commit_result_json) : null,
    error: row.error,
    meta: row.meta_json ? JSON.parse(row.meta_json) : null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };

export class FieldLoopStore {
  constructor(dbPath) {
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(SCHEMA);
  }

  close() {
    this.db.close();
  }

  // Upsert by (kind, sourceId): re-running extraction on the same call
  // replaces its still-pending draft instead of stacking duplicates.
  createDraft({ kind, sourceId, transcript, extraction, autonomy, meta }) {
    const existing = this.db
      .prepare(`SELECT * FROM drafts WHERE kind = ? AND source_id = ?`)
      .get(kind, sourceId);
    if (existing && existing.status !== 'pending') {
      return { draft: rowToDraft(existing), created: false };
    }
    const id = existing?.id ?? randomUUID();
    const createdAt = existing?.created_at ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO drafts (id, kind, source_id, status, transcript, extraction_json, autonomy_json, meta_json, created_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           transcript = excluded.transcript,
           extraction_json = excluded.extraction_json,
           autonomy_json = excluded.autonomy_json,
           meta_json = excluded.meta_json`,
      )
      .run(
        id,
        kind,
        sourceId,
        transcript ?? null,
        JSON.stringify(extraction),
        autonomy ? JSON.stringify(autonomy) : null,
        meta ? JSON.stringify(meta) : null,
        createdAt,
      );
    return { draft: this.getDraft(id), created: !existing };
  }

  getDraft(id) {
    return rowToDraft(this.db.prepare(`SELECT * FROM drafts WHERE id = ?`).get(id));
  }

  listDrafts({ status, limit = 100 } = {}) {
    // status accepts a comma-separated list, e.g. 'pending,failed' — review
    // clients need failed drafts too (they are confirm-retryable).
    const statuses = status
      ? String(status).split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    for (const s of statuses || []) {
      if (!DRAFT_STATUSES.has(s)) throw new Error(`Unknown status: ${s}`);
    }
    const rows = statuses?.length
      ? this.db
          .prepare(
            `SELECT * FROM drafts WHERE status IN (${statuses.map(() => '?').join(',')})
             ORDER BY created_at DESC LIMIT ?`,
          )
          .all(...statuses, limit)
      : this.db.prepare(`SELECT * FROM drafts ORDER BY created_at DESC LIMIT ?`).all(limit);
    return rows.map(rowToDraft);
  }

  resolveDraft(id, { status, finalExtraction, commitResult, error, resolvedBy }) {
    if (!DRAFT_STATUSES.has(status)) throw new Error(`Unknown status: ${status}`);
    this.db
      .prepare(
        `UPDATE drafts SET status = ?, final_extraction_json = ?, commit_result_json = ?,
         error = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`,
      )
      .run(
        status,
        finalExtraction ? JSON.stringify(finalExtraction) : null,
        commitResult ? JSON.stringify(commitResult) : null,
        error ?? null,
        new Date().toISOString(),
        resolvedBy ?? null,
        id,
      );
    return this.getDraft(id);
  }

  // Append-only eval log. One event per human resolution (or auto-commit).
  logEvalEvent({ draftId, kind, action, fields }) {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO eval_events (id, draft_id, kind, action, fields_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, draftId, kind, action, JSON.stringify(fields), new Date().toISOString());
    return id;
  }

  listEvalEvents({ limit = 1000 } = {}) {
    return this.db
      .prepare(`SELECT * FROM eval_events ORDER BY created_at DESC LIMIT ?`)
      .all(limit)
      .map((row) => ({
        id: row.id,
        draftId: row.draft_id,
        kind: row.kind,
        action: row.action,
        fields: JSON.parse(row.fields_json),
        createdAt: row.created_at,
      }));
  }

  // Accuracy math only trusts human-graded events; discards carry judgment
  // about the capture, not per-field correctness, and auto-commits would
  // let the model grade itself.
  listGradedEvents() {
    return this.listEvalEvents({ limit: 100000 }).filter((e) =>
      ['confirm', 'confirm_edited'].includes(e.action),
    );
  }

  getAutonomyOverrides() {
    const rows = this.db.prepare(`SELECT path, enabled FROM autonomy_overrides`).all();
    return Object.fromEntries(rows.map((r) => [r.path, r.enabled === 1]));
  }

  setAutonomyOverride(path, enabled, note) {
    this.db
      .prepare(
        `INSERT INTO autonomy_overrides (path, enabled, note, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET enabled = excluded.enabled, note = excluded.note, updated_at = excluded.updated_at`,
      )
      .run(path, enabled ? 1 : 0, note ?? null, new Date().toISOString());
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    return row ? row.value : fallback;
  }

  setSetting(key, value) {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, String(value));
  }
}
