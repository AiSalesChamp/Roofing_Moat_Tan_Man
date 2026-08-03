// Field-loop HTTP server: draft store API + eval/autonomy API + static host
// for the review surfaces (dashboard, glasses app, capture PWA).
//
// Zero-dependency: node:http + node:sqlite. Start with `node server/server.js`
// (or `npm start` from field-loop/).

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FieldLoopStore } from './store.js';
import { gradeExtractions, flattenExtraction, isEmptyValue, labelForPath } from './fields.js';
import { computeFieldStats, decideDraft, fieldEligibility, riskClassForPath } from './policy.js';
import { commitDraft, twentyConfigured } from './commit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIELD_LOOP_ROOT = join(__dirname, '..');
const RE_ACQUISITION_ROOT = join(FIELD_LOOP_ROOT, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const DEAL_STAGE_ORDER = [
  'SOURCED',
  'QUALIFYING',
  'OFFER_OUT',
  'UNDER_CONTRACT',
  'DUE_DILIGENCE',
  'ACQUIRED',
  'DISPOSITION',
  'EXIT_CLOSED',
  'DEAD',
];

const VALID_KINDS = new Set(['seller-call', 'site-memo']);

// Schema validation reuses the runner's AJV validator when its node_modules
// are installed; otherwise falls back to a structural check so the sidecar
// never hard-fails on a missing dev dependency.
let validateExtractionFn = null;
async function validateExtraction(extraction, kind) {
  if (!validateExtractionFn) {
    try {
      const mod = await import('../../acquisition-voice/runner/validate.js');
      validateExtractionFn = mod.validateExtraction;
    } catch {
      validateExtractionFn = (data, dataKind) => {
        const required =
          dataKind === 'site-memo'
            ? ['identity', 'siteFindings', 'extractionMeta']
            : ['identity', 'disposition', 'extractionMeta'];
        for (const key of required) {
          if (!data || typeof data[key] !== 'object') {
            throw new Error(`Schema validation failed (fallback): missing ${key}`);
          }
        }
        return data;
      };
    }
  }
  return validateExtractionFn(extraction, kind);
}

export function createFieldLoopServer({
  dbPath = process.env.FIELD_LOOP_DB || join(FIELD_LOOP_ROOT, 'data', 'field-loop.db'),
  env = process.env,
  writerFactory,
} = {}) {
  const store = new FieldLoopStore(dbPath);

  const autonomyEnabled = () => store.getSetting('autonomy_enabled', '1') === '1';

  const draftView = (draft) => {
    if (!draft) return null;
    const stats = computeFieldStats(store.listGradedEvents());
    const overrides = store.getAutonomyOverrides();
    const extraction = draft.finalExtraction || draft.extraction;
    const fields = flattenExtraction(extraction)
      .filter((leaf) => !isEmptyValue(leaf.value))
      .map((leaf) => ({
        path: leaf.path,
        label: labelForPath(leaf.path),
        value: leaf.value,
        ...(leaf.quote ? { quote: leaf.quote } : {}),
        riskClass: riskClassForPath(leaf.path),
        autonomyEligible: fieldEligibility(leaf.path, stats, overrides).eligible,
      }));
    return { ...draft, fields };
  };

  async function handleCreateDraft(body) {
    const { kind = 'seller-call', sourceId, transcript, extraction, meta } = body;
    if (!VALID_KINDS.has(kind)) throw httpError(400, `kind must be one of: ${[...VALID_KINDS]}`);
    if (!sourceId) throw httpError(400, 'sourceId is required');
    if (!extraction || typeof extraction !== 'object') {
      throw httpError(400, 'extraction object is required');
    }
    try {
      await validateExtraction(extraction, kind);
    } catch (err) {
      throw httpError(422, err.message);
    }

    const stats = computeFieldStats(store.listGradedEvents());
    const overrides = store.getAutonomyOverrides();
    const autonomy = decideDraft(extraction, stats, overrides, {
      autonomyEnabled: autonomyEnabled(),
    });
    const { draft, created } = store.createDraft({
      kind,
      sourceId,
      transcript,
      extraction,
      autonomy,
      meta,
    });

    if (draft.status !== 'pending') {
      // Same source already resolved — idempotent replay, nothing to do.
      return { draft: draftView(draft), created: false, decision: 'already_resolved' };
    }

    if (autonomy.decision === 'auto_commit') {
      try {
        const commitResult = await commitDraft(draft, { env, writerFactory });
        // Audit event logged only AFTER a successful commit: a failed
        // auto-commit leaves the draft 'failed' with NO event, so a later
        // human confirm still enters the eval log normally.
        store.logEvalEvent({
          draftId: draft.id,
          kind,
          action: 'auto_commit',
          fields: gradeExtractions(extraction, extraction),
        });
        const resolved = store.resolveDraft(draft.id, {
          status: 'auto_committed',
          finalExtraction: extraction,
          commitResult,
          resolvedBy: 'autonomy-policy',
        });
        return { draft: draftView(resolved), created, decision: 'auto_commit' };
      } catch (err) {
        const failed = store.resolveDraft(draft.id, { status: 'failed', error: err.message });
        return { draft: draftView(failed), created, decision: 'auto_commit_failed' };
      }
    }
    return { draft: draftView(draft), created, decision: 'pending' };
  }

  async function handleConfirm(id, body = {}) {
    const draft = store.getDraft(id);
    if (!draft) throw httpError(404, 'Draft not found');
    if (!['pending', 'failed'].includes(draft.status)) {
      throw httpError(409, `Draft is ${draft.status}, not confirmable`);
    }
    const finalExtraction = body.extraction || draft.finalExtraction || draft.extraction;
    if (body.extraction) {
      try {
        await validateExtraction(finalExtraction, draft.kind);
      } catch (err) {
        throw httpError(422, err.message);
      }
    }
    const graded = gradeExtractions(draft.extraction, finalExtraction);
    const edited = graded.some((g) => g.status !== 'confirmed');

    try {
      const commitResult = await commitDraft(
        { ...draft, finalExtraction },
        { env, writerFactory },
      );
      // Eval logged only on successful resolution: exactly one event per
      // draft (a confirmed draft cannot be re-confirmed), and a failed-commit
      // retry grades the human's LATEST edits, not the first attempt's.
      store.logEvalEvent({
        draftId: draft.id,
        kind: draft.kind,
        action: edited ? 'confirm_edited' : 'confirm',
        fields: graded,
      });
      const resolved = store.resolveDraft(draft.id, {
        status: 'confirmed',
        finalExtraction,
        commitResult,
        resolvedBy: body.resolvedBy || 'human',
      });
      return { draft: draftView(resolved), edited, gradedFields: graded };
    } catch (err) {
      store.resolveDraft(draft.id, { status: 'failed', finalExtraction, error: err.message });
      throw httpError(502, `Twenty commit failed: ${err.message}`);
    }
  }

  function handleDiscard(id, body = {}) {
    const draft = store.getDraft(id);
    if (!draft) throw httpError(404, 'Draft not found');
    if (!['pending', 'failed'].includes(draft.status)) {
      throw httpError(409, `Draft is ${draft.status}, not discardable`);
    }
    // A failed confirm may have persisted the operator's edits — the discard
    // audit event must preserve them (original vs final values ride along).
    const graded = gradeExtractions(
      draft.extraction,
      draft.finalExtraction || draft.extraction,
    ).map((g) => ({ ...g, status: 'discarded' }));
    // Discard resolves immediately; the status change guarantees one event.
    store.logEvalEvent({ draftId: draft.id, kind: draft.kind, action: 'discard', fields: graded });
    const resolved = store.resolveDraft(draft.id, {
      status: 'discarded',
      resolvedBy: body.resolvedBy || 'human',
      commitResult: body.reason ? { reason: body.reason } : null,
    });
    return { draft: draftView(resolved) };
  }

  function accuracyReport() {
    const stats = computeFieldStats(store.listGradedEvents());
    const overrides = store.getAutonomyOverrides();
    const fields = Object.keys(stats)
      .sort()
      .map((path) => ({
        path,
        label: labelForPath(path),
        ...stats[path],
        ...fieldEligibility(path, stats, overrides),
      }));
    const totals = fields.reduce(
      (acc, f) => ({ samples: acc.samples + f.samples, correct: acc.correct + f.correct }),
      { samples: 0, correct: 0 },
    );
    return {
      fields,
      overall: {
        samples: totals.samples,
        correct: totals.correct,
        accuracy: totals.samples ? totals.correct / totals.samples : 0,
      },
      gradedEvents: store.listGradedEvents().length,
      autonomyEnabled: autonomyEnabled(),
    };
  }

  async function pipelineGlance() {
    if (!twentyConfigured(env)) throw httpError(503, 'TWENTY_API_KEY not configured');
    const apiUrl = (env.TWENTY_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(
      `${apiUrl}/rest/opportunities?limit=200&order_by=updatedAt[DescNullsLast]`,
      { headers: { Authorization: `Bearer ${env.TWENTY_API_KEY}` } },
    );
    if (!res.ok) throw httpError(502, `Twenty read failed: ${res.status}`);
    const json = await res.json();
    const records = json?.data?.opportunities || [];
    const stages = Object.fromEntries(DEAL_STAGE_ORDER.map((s) => [s, []]));
    for (const opp of records) {
      const stage = stages[opp.dealStage] ? opp.dealStage : 'SOURCED';
      stages[stage].push({
        id: opp.id,
        name: opp.name,
        askingPrice: opp.askingPrice?.amountMicros
          ? opp.askingPrice.amountMicros / 1_000_000
          : null,
        updatedAt: opp.updatedAt,
      });
    }
    return { stageOrder: DEAL_STAGE_ORDER, stages };
  }

  // --- HTTP plumbing ---

  const STATIC_MOUNTS = [
    { prefix: '/glasses', root: join(RE_ACQUISITION_ROOT, 'glasses-app'), index: 'index.html' },
    { prefix: '/app', root: join(RE_ACQUISITION_ROOT, 'property-capture', 'pwa'), index: 'index.html' },
    { prefix: '/dashboard', root: join(FIELD_LOOP_ROOT, 'public'), index: 'dashboard.html' },
  ];

  function serveStatic(req, res, pathname) {
    for (const mount of STATIC_MOUNTS) {
      if (pathname === mount.prefix) {
        res.writeHead(302, { Location: `${mount.prefix}/` });
        res.end();
        return true;
      }
      if (!pathname.startsWith(`${mount.prefix}/`)) continue;
      const rel = pathname.slice(mount.prefix.length + 1) || mount.index;
      const rootResolved = resolve(mount.root);
      const filePath = normalize(resolve(rootResolved, rel));
      // Separator-boundary check: bare startsWith would also admit sibling
      // directories whose names merely extend the root as a string prefix.
      if (filePath !== rootResolved && !filePath.startsWith(rootResolved + sep)) {
        res.writeHead(403).end('Forbidden');
        return true;
      }
      const target =
        existsSync(filePath) && statSync(filePath).isFile()
          ? filePath
          : join(mount.root, mount.index);
      if (!existsSync(target)) {
        res.writeHead(404).end('Not found');
        return true;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(target)] || 'application/octet-stream' });
      res.end(readFileSync(target));
      return true;
    }
    return false;
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Field-Loop-Secret');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    const sendJson = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
    };

    try {
      if (pathname.startsWith('/api/')) {
        const secret = env.FIELD_LOOP_SECRET;
        if (secret && req.headers['x-field-loop-secret'] !== secret) {
          return sendJson(401, { error: 'Invalid or missing X-Field-Loop-Secret' });
        }

        if (req.method === 'GET' && pathname === '/api/health') {
          return sendJson(200, {
            ok: true,
            twentyConfigured: twentyConfigured(env),
            autonomyEnabled: autonomyEnabled(),
            pendingDrafts: store.listDrafts({ status: 'pending' }).length,
          });
        }
        if (req.method === 'POST' && pathname === '/api/drafts') {
          return sendJson(201, await handleCreateDraft(await readBody(req)));
        }
        if (req.method === 'GET' && pathname === '/api/drafts') {
          const status = url.searchParams.get('status') || undefined;
          const limit = Number(url.searchParams.get('limit') || 100);
          return sendJson(200, {
            drafts: store.listDrafts({ status, limit }).map(draftView),
          });
        }
        const draftMatch = pathname.match(/^\/api\/drafts\/([\w-]+)(?:\/(confirm|discard))?$/);
        if (draftMatch) {
          const [, id, action] = draftMatch;
          if (req.method === 'GET' && !action) {
            const draft = draftView(store.getDraft(id));
            return draft ? sendJson(200, { draft }) : sendJson(404, { error: 'Draft not found' });
          }
          if (req.method === 'POST' && action === 'confirm') {
            return sendJson(200, await handleConfirm(id, await readBody(req)));
          }
          if (req.method === 'POST' && action === 'discard') {
            return sendJson(200, handleDiscard(id, await readBody(req)));
          }
        }
        if (req.method === 'GET' && pathname === '/api/evals/accuracy') {
          return sendJson(200, accuracyReport());
        }
        if (req.method === 'GET' && pathname === '/api/evals/events') {
          const limit = Number(url.searchParams.get('limit') || 200);
          return sendJson(200, { events: store.listEvalEvents({ limit }) });
        }
        if (req.method === 'GET' && pathname === '/api/autonomy') {
          return sendJson(200, {
            autonomyEnabled: autonomyEnabled(),
            overrides: store.getAutonomyOverrides(),
            report: accuracyReport().fields,
          });
        }
        if (req.method === 'POST' && pathname === '/api/autonomy/overrides') {
          const body = await readBody(req);
          if (!body.path || typeof body.enabled !== 'boolean') {
            return sendJson(400, { error: 'path and enabled(boolean) required' });
          }
          store.setAutonomyOverride(body.path, body.enabled, body.note);
          return sendJson(200, { overrides: store.getAutonomyOverrides() });
        }
        if (req.method === 'POST' && pathname === '/api/autonomy/enabled') {
          const body = await readBody(req);
          store.setSetting('autonomy_enabled', body.enabled ? '1' : '0');
          return sendJson(200, { autonomyEnabled: autonomyEnabled() });
        }
        if (req.method === 'GET' && pathname === '/api/pipeline') {
          return sendJson(200, await pipelineGlance());
        }
        return sendJson(404, { error: `No route: ${req.method} ${pathname}` });
      }

      if (pathname === '/') {
        res.writeHead(302, { Location: '/dashboard/' });
        return res.end();
      }
      if (serveStatic(req, res, pathname)) return;
      res.writeHead(404).end('Not found');
    } catch (err) {
      const status = err.statusCode || 500;
      // Sidecar responses stay generic on 500 — no stack traces to clients.
      sendJson(status, { error: err.statusCode ? err.message : 'Internal error' });
      if (!err.statusCode) console.error('[field-loop]', err);
    }
  });

  return { server, store };
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const MAX_BODY_BYTES = 5 * 1024 * 1024;
function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(httpError(413, 'Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolvePromise({});
      try {
        resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(httpError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.FIELD_LOOP_PORT || 4680);
  const { server } = createFieldLoopServer();
  server.listen(port, () => {
    console.log(`field-loop listening on http://127.0.0.1:${port}`);
    console.log(`  dashboard: http://127.0.0.1:${port}/dashboard/`);
    console.log(`  glasses:   http://127.0.0.1:${port}/glasses/`);
    console.log(`  pwa:       http://127.0.0.1:${port}/app/`);
  });
}
