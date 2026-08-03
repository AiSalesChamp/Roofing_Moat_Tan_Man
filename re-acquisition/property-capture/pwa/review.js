// Review queue + pipeline glance against the field-loop sidecar.
//
// The review card is the product: extraction shown per field, editable,
// confirm in one tap. Every confirm/edit/discard feeds the eval log that
// earns the autonomy ratchet.

import { getSetting } from './db.js';

export async function getFieldLoopConfig() {
  const fieldLoopUrl = (
    await getSetting('fieldLoopUrl', 'http://127.0.0.1:4680')
  ).replace(/\/$/, '');
  const fieldLoopSecret = await getSetting('fieldLoopSecret', '');
  return { fieldLoopUrl, fieldLoopSecret };
}

async function api(path, { method = 'GET', body } = {}) {
  const { fieldLoopUrl, fieldLoopSecret } = await getFieldLoopConfig();
  const res = await fetch(`${fieldLoopUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(fieldLoopSecret ? { 'X-Field-Loop-Secret': fieldLoopSecret } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `field-loop ${res.status}`);
  return json;
}

// Includes failed drafts: they stay reviewable and confirm = retry.
export const listPendingDrafts = () =>
  api('/api/drafts?status=pending,failed').then((r) => r.drafts);
export const confirmDraft = (id, extraction) =>
  api(`/api/drafts/${id}/confirm`, { method: 'POST', body: extraction ? { extraction } : {} });
export const discardDraft = (id) =>
  api(`/api/drafts/${id}/discard`, { method: 'POST', body: {} });
export const getPipeline = () => api('/api/pipeline');

// --- extraction editing helpers ---

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export function setByPath(obj, path, value) {
  const parts = path.split('.');
  let node = obj;
  for (const part of parts.slice(0, -1)) {
    if (node[part] === null || node[part] === undefined || typeof node[part] !== 'object') {
      node[part] = {};
    }
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
  return obj;
}

export function parseFieldInput(originalValue, text) {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (Array.isArray(originalValue)) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (typeof originalValue === 'number') {
    const num = Number(trimmed.replace(/[$,]/g, ''));
    return Number.isNaN(num) ? originalValue : num;
  }
  if (typeof originalValue === 'boolean') return trimmed.toLowerCase() === 'true';
  return trimmed;
}

export const displayValue = (value) =>
  Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);

// Rebuild the final extraction from the card's inputs. The base must match
// what the card RENDERS: failed drafts render finalExtraction (edits already
// saved by the failed commit), so rebuilding from draft.extraction would
// silently drop those edits on retry.
export function buildEditedExtraction(draft, container) {
  const extraction = deepClone(draft.finalExtraction || draft.extraction);
  let edited = false;
  container.querySelectorAll('input[data-path]').forEach((input) => {
    const path = input.dataset.path;
    const field = draft.fields.find((f) => f.path === path);
    const newValue = parseFieldInput(field?.value, input.value);
    if (displayValue(newValue) !== displayValue(field?.value)) {
      edited = true;
      setByPath(extraction, path, newValue);
    }
  });
  return { extraction, edited };
}

// --- rendering ---

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function draftTitle(draft) {
  const street = draft.fields.find((f) => f.path === 'identity.propertyAddress.street1');
  return street?.value || draft.sourceId;
}

export function renderDraftCard(draft) {
  const kindLabel = draft.kind === 'site-memo' ? 'Site memo' : 'Seller call';
  const when = new Date(draft.createdAt).toLocaleString();
  const failed = draft.status === 'failed';
  const rows = draft.fields
    .map(
      (f) => `
    <div class="field-row">
      <div class="field-label">
        ${esc(f.label)}
        <span class="pill risk-${f.riskClass}">${f.riskClass}</span>
        ${f.autonomyEligible ? '<span class="pill auto">auto-ready</span>' : ''}
      </div>
      <input data-path="${esc(f.path)}" value="${esc(displayValue(f.value))}" autocomplete="off" />
      ${f.quote ? `<div class="field-quote">“${esc(f.quote)}”</div>` : ''}
    </div>`,
    )
    .join('');
  return `
    <div class="draft-card" data-draft-id="${esc(draft.id)}">
      <div class="draft-head">
        <div>
          <div class="addr">${esc(draftTitle(draft))}</div>
          <div class="meta">${kindLabel} · ${esc(when)}</div>
        </div>
        <span class="badge ${failed ? 'FAILED' : 'PENDING'}">${failed ? 'RETRY' : 'DRAFT'}</span>
      </div>
      ${failed && draft.error ? `<div class="draft-error">Commit failed: ${esc(draft.error)}</div>` : ''}
      ${rows || '<p class="draft-empty">No extracted fields.</p>'}
      <div class="draft-actions">
        <button type="button" class="btn primary confirm-draft-btn">${failed ? 'Retry → CRM' : 'Confirm → CRM'}</button>
        <button type="button" class="btn danger discard-draft-btn">Discard</button>
      </div>
    </div>`;
}

export function renderPipeline(data) {
  const labels = {
    SOURCED: 'Sourced', QUALIFYING: 'Qualifying', OFFER_OUT: 'Offer Out',
    UNDER_CONTRACT: 'Under Contract', DUE_DILIGENCE: 'Due Diligence',
    ACQUIRED: 'Acquired', DISPOSITION: 'Disposition', EXIT_CLOSED: 'Exit Closed', DEAD: 'Dead',
  };
  return data.stageOrder
    .map((stage) => {
      const deals = data.stages[stage] || [];
      const items = deals
        .slice(0, 5)
        .map(
          (d) => `<div class="pipe-deal">${esc(d.name)}${
            d.askingPrice ? ` <span class="pipe-price">$${d.askingPrice.toLocaleString()}</span>` : ''
          }</div>`,
        )
        .join('');
      return `
      <div class="pipe-stage${deals.length ? '' : ' empty'}">
        <div class="pipe-head">${labels[stage] || stage} <span class="pipe-count">${deals.length}</span></div>
        ${items}${deals.length > 5 ? `<div class="pipe-more">+${deals.length - 5} more</div>` : ''}
      </div>`;
    })
    .join('');
}
