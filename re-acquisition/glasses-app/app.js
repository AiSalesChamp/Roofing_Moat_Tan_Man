// Field Jarvis lens app: glance at pending drafts, pinch to confirm.
//
// State machine: HOME → LIST → CARD → (confirm/discard) → RESULT → LIST.
// The lens NEVER edits fields — editing is phone work. Here the choice is
// confirm as-drafted, skip (leave for the phone), or discard.

import { onInput } from './input.js';

// Served same-origin from the field-loop sidecar (/glasses/). A standalone
// dev server can point elsewhere with ?api=http://host:4680.
const API_BASE = new URLSearchParams(location.search).get('api') || '';
const SECRET = new URLSearchParams(location.search).get('secret') || '';

const state = {
  screen: 'HOME', // HOME | LIST | CARD | RESULT
  drafts: [],
  listIndex: 0,
  // Pinned when a CARD opens: the background poll may reorder/replace
  // state.drafts while the user is reading, so confirm/discard must act on
  // the draft that is ON SCREEN, never on a list index.
  activeDraft: null,
  fieldOffset: 0,
  actionIndex: 0, // 0 confirm, 1 skip, 2 discard
  result: null,
  online: false,
};

const $screen = document.getElementById('screen');
const $hints = document.getElementById('hints');
const $conn = document.getElementById('conn');
const $clock = document.getElementById('clock');

const ACTIONS = [
  { key: 'confirm', label: '✓ Confirm' },
  { key: 'skip', label: 'Skip' },
  { key: 'discard', label: '✕ Discard' },
];
const FIELDS_PER_PAGE = 5;

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET ? { 'X-Field-Loop-Secret': SECRET } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function refreshDrafts() {
  try {
    // failed drafts stay reviewable: confirm = retry the CRM commit
    const { drafts } = await api('/api/drafts?status=pending,failed');
    state.drafts = drafts;
    state.online = true;
    if (state.listIndex >= drafts.length) state.listIndex = Math.max(0, drafts.length - 1);
  } catch {
    state.online = false;
  }
  if (state.screen === 'HOME' || state.screen === 'LIST') render();
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const draftTitle = (draft) =>
  draft.fields.find((f) => f.path === 'identity.propertyAddress.street1')?.value || draft.sourceId;

const displayValue = (v) => (Array.isArray(v) ? v.join(', ') : String(v));

function render() {
  $conn.className = `conn ${state.online ? 'ok' : 'bad'}`;
  $clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (state.screen === 'HOME') {
    const n = state.drafts.length;
    $screen.innerHTML = n
      ? `<div class="home-count">${n}</div><div class="home-label">draft${n === 1 ? '' : 's'} ready to confirm</div>`
      : `<div class="home-clear">All clear</div><div class="home-label">no drafts waiting</div>`;
    $hints.textContent = n ? 'pinch to review' : state.online ? 'listening…' : 'reconnecting…';
    return;
  }

  if (state.screen === 'LIST') {
    if (!state.drafts.length) {
      state.screen = 'HOME';
      return render();
    }
    $screen.innerHTML = state.drafts
      .map(
        (d, i) => `
      <div class="list-item${i === state.listIndex ? ' selected' : ''}">
        ${esc(draftTitle(d))}
        <div class="sub">${d.kind === 'site-memo' ? 'site memo' : 'seller call'} · ${d.fields.length} fields${d.status === 'failed' ? ' · RETRY' : ''}</div>
      </div>`,
      )
      .join('');
    $hints.textContent = '↑↓ choose · pinch to open · ← home';
    return;
  }

  if (state.screen === 'CARD') {
    const draft = state.activeDraft;
    if (!draft) {
      state.screen = 'LIST';
      return render();
    }
    const page = draft.fields.slice(state.fieldOffset, state.fieldOffset + FIELDS_PER_PAGE);
    const more = draft.fields.length - state.fieldOffset - page.length;
    $screen.innerHTML = `
      <div class="card-title">${esc(draftTitle(draft))}</div>
      <div class="card-sub">${draft.kind === 'site-memo' ? 'Site memo' : 'Seller call'} draft${
        draft.status === 'failed' ? ' — commit failed, confirm to retry' : ''
      }</div>
      <div class="card-fields">
        ${page
          .map(
            (f) => `
        <div class="card-field">
          <div class="k">${esc(f.label)}</div>
          <div class="v${f.riskClass === 'high' ? ' high' : ''}">${esc(displayValue(f.value))}</div>
        </div>`,
          )
          .join('')}
        ${more > 0 ? `<div class="card-field"><div class="k">↓ ${more} more</div></div>` : ''}
      </div>
      <div class="actions">
        ${ACTIONS.map(
          (a, i) =>
            `<div class="action ${a.key}${i === state.actionIndex ? ' selected' : ''}">${a.label}</div>`,
        ).join('')}
      </div>`;
    $hints.textContent = '↑↓ scroll · ←→ choose action · pinch to fire';
    return;
  }

  if (state.screen === 'RESULT') {
    const ok = state.result?.ok;
    $screen.innerHTML = `
      <div class="result ${ok ? 'ok' : 'err'}">
        <div class="icon">${ok ? '✓' : '!'}</div>
        <div class="msg">${esc(state.result?.message || '')}</div>
      </div>`;
    $hints.textContent = 'pinch to continue';
  }
}

async function fireAction() {
  const draft = state.activeDraft;
  const action = ACTIONS[state.actionIndex].key;
  if (action === 'skip') {
    state.activeDraft = null;
    state.screen = 'LIST';
    return render();
  }
  try {
    if (action === 'confirm') {
      await api(`/api/drafts/${draft.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ resolvedBy: 'glasses' }),
      });
      state.result = { ok: true, message: 'Committed to CRM' };
    } else {
      await api(`/api/drafts/${draft.id}/discard`, {
        method: 'POST',
        body: JSON.stringify({ resolvedBy: 'glasses' }),
      });
      state.result = { ok: true, message: 'Draft discarded' };
    }
    state.drafts = state.drafts.filter((d) => d.id !== draft.id);
    state.listIndex = Math.min(state.listIndex, Math.max(0, state.drafts.length - 1));
  } catch (err) {
    state.result = { ok: false, message: err.message };
  }
  state.activeDraft = null;
  state.screen = 'RESULT';
  render();
}

onInput((action) => {
  if (state.screen === 'HOME') {
    if (action === 'select' && state.drafts.length) {
      state.screen = 'LIST';
      state.listIndex = 0;
    }
  } else if (state.screen === 'LIST') {
    if (action === 'up') state.listIndex = Math.max(0, state.listIndex - 1);
    else if (action === 'down') state.listIndex = Math.min(state.drafts.length - 1, state.listIndex + 1);
    else if (action === 'select') {
      state.screen = 'CARD';
      state.activeDraft = state.drafts[state.listIndex] || null;
      state.fieldOffset = 0;
      state.actionIndex = 0;
    } else if (action === 'back' || action === 'left') state.screen = 'HOME';
  } else if (state.screen === 'CARD') {
    const draft = state.activeDraft;
    const maxOffset = Math.max(0, (draft?.fields.length || 0) - FIELDS_PER_PAGE);
    if (action === 'up') state.fieldOffset = Math.max(0, state.fieldOffset - 1);
    else if (action === 'down') state.fieldOffset = Math.min(maxOffset, state.fieldOffset + 1);
    else if (action === 'left') state.actionIndex = Math.max(0, state.actionIndex - 1);
    else if (action === 'right') state.actionIndex = Math.min(ACTIONS.length - 1, state.actionIndex + 1);
    else if (action === 'select') return fireAction();
    else if (action === 'back') {
      state.activeDraft = null;
      state.screen = 'LIST';
    }
  } else if (state.screen === 'RESULT') {
    if (action === 'select' || action === 'back') {
      state.screen = state.drafts.length ? 'LIST' : 'HOME';
    }
  }
  render();
});

render();
refreshDrafts();
setInterval(refreshDrafts, 5000);
setInterval(render, 30000); // keep the clock honest
