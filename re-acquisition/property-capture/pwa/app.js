import { getSetting, setSetting, saveCapture, listCaptures, deleteCapture } from './db.js';
import { processQueue, syncCapture } from './sync.js';
import { sha256, uuid, nowIso, getTimezone, reverseGeocode } from './utils.js';
import {
  listPendingDrafts,
  confirmDraft,
  discardDraft,
  getPipeline,
  buildEditedExtraction,
  renderDraftCard,
  renderPipeline,
} from './review.js';

const photos = [];
let mediaRecorder = null;
let audioChunks = [];
let recordStart = null;
let recordTimer = null;

const $ = (sel) => document.querySelector(sel);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('nav.tabs button').forEach((b) => b.classList.remove('active'));
  $(`#screen-${name}`).classList.add('active');
  document.querySelector(`nav.tabs button[data-screen="${name}"]`).classList.add('active');
  if (name === 'queue') renderQueue();
  if (name === 'review') renderReview();
  if (name === 'pipeline') renderPipelineScreen();
}

function updateNetwork() {
  const online = navigator.onLine;
  const bar = $('#network-bar');
  const badge = $('#online-status');
  bar.textContent = online ? 'Online — sync enabled' : 'Offline — captures queued locally';
  bar.className = `status-bar ${online ? 'online' : 'offline'}`;
  badge.textContent = online ? 'ONLINE' : 'OFFLINE';
  badge.className = `badge ${online ? 'DONE' : 'PENDING'}`;
  if (online) processQueue(saveCapture, listCaptures).then(() => renderQueue());
}

function renderPhotoGrid() {
  const grid = $('#photo-grid');
  grid.innerHTML = '';
  photos.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(p.blob);
    const btn = document.createElement('button');
    btn.className = 'remove';
    btn.textContent = '×';
    btn.onclick = () => {
      photos.splice(i, 1);
      renderPhotoGrid();
    };
    div.append(img, btn);
    grid.appendChild(div);
  });
  $('#photo-count').textContent = photos.length;
  $('#btn-photo').disabled = photos.length >= 5;
}

async function loadSettings() {
  $('#field-loop-url').value = await getSetting('fieldLoopUrl', 'http://127.0.0.1:4680');
  $('#field-loop-secret').value = await getSetting('fieldLoopSecret', '');
  $('#media-gateway-url').value = await getSetting(
    'mediaGatewayUrl',
    'http://127.0.0.1:3081',
  );
  $('#n8n-url').value = await getSetting('n8nBaseUrl', 'http://127.0.0.1:5678');
  $('#webhook-secret').value = await getSetting('webhookSecret', '');
  let repId = await getSetting('repId', '');
  if (!repId) {
    repId = uuid();
    await setSetting('repId', repId);
  }
  $('#rep-id').value = repId;
}

async function saveSettings() {
  const secret = $('#webhook-secret').value;
  await setSetting('fieldLoopUrl', $('#field-loop-url').value.trim() || 'http://127.0.0.1:4680');
  await setSetting('fieldLoopSecret', $('#field-loop-secret').value);
  await setSetting('mediaGatewayUrl', $('#media-gateway-url').value.trim());
  await setSetting('n8nBaseUrl', $('#n8n-url').value.trim());
  await setSetting('webhookSecret', secret);
  await setSetting('mediaGatewaySecret', secret);
  await setSetting('repId', $('#rep-id').value.trim() || uuid());
  alert('Settings saved');
}

async function useGps() {
  if (!navigator.geolocation) {
    alert('Geolocation not available');
    return;
  }
  $('#btn-gps').textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const addr = await reverseGeocode(lat, lng);
      if (addr) {
        if (addr.street1) $('#street1').value = addr.street1;
        if (addr.city) $('#city').value = addr.city;
        if (addr.state) $('#state').value = addr.state.slice(0, 2).toUpperCase();
        if (addr.zip) $('#zip').value = addr.zip;
      }
      window._lastGeo = { lat, lng, accuracyM: pos.coords.accuracy };
      $('#btn-gps').textContent = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    },
    () => {
      alert('Could not get GPS');
      $('#btn-gps').textContent = 'Use GPS location';
    },
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

function setupRecorder() {
  const btn = $('#btn-record');

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const hash = await sha256(blob);
        const duration = recordStart ? (Date.now() - recordStart) / 1000 : 0;
        window._audioBlob = blob;
        window._audioMeta = {
          pendingMediaId: uuid(),
          filename: 'memo.webm',
          container: 'm4a',
          durationSec: duration,
          sha256: hash,
        };
        $('#voice-status').textContent = `Recorded ${duration.toFixed(1)}s — ready`;
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      recordStart = Date.now();
      btn.classList.add('recording');
      btn.textContent = 'Recording… release to stop';
      recordTimer = setInterval(() => {
        const s = ((Date.now() - recordStart) / 1000).toFixed(0);
        btn.textContent = `Recording… ${s}s`;
      }, 500);
    } catch {
      alert('Microphone access denied');
    }
  };

  const stop = () => {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.stop();
      clearInterval(recordTimer);
      btn.classList.remove('recording');
      btn.textContent = 'Hold to record';
    }
  };

  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', stop);
  btn.addEventListener('mouseleave', stop);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); start(); });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); stop(); });
}

async function saveToQueue() {
  const street1 = $('#street1').value.trim();
  if (!street1) {
    alert('Street address is required');
    return;
  }
  if (!window._audioBlob && photos.length === 0) {
    alert('Add at least one photo or voice memo');
    return;
  }

  const captureId = uuid();
  const photoRecords = await Promise.all(
    photos.map(async (p, i) => ({
      blob: p.blob,
      meta: {
        pendingMediaId: uuid(),
        filename: `photo-${i}.jpg`,
        mimeType: p.blob.type || 'image/jpeg',
        sha256: await sha256(p.blob),
      },
    })),
  );

  const record = {
    captureId,
    state: 'PENDING',
    createdAt: nowIso(),
    capturedAt: nowIso(),
    timezone: getTimezone(),
    captureOrigin: $('#capture-origin').value,
    address: {
      street1,
      city: $('#city').value.trim(),
      state: $('#state').value.trim().toUpperCase(),
      zip: $('#zip').value.trim(),
    },
    geo: window._lastGeo || null,
    clientNotes: $('#notes').value.trim(),
    photos: photoRecords,
    audioBlob: window._audioBlob || null,
    audioMeta: window._audioMeta || null,
    attempts: 0,
  };

  await saveCapture(record);
  photos.length = 0;
  window._audioBlob = null;
  window._audioMeta = null;
  $('#street1').value = '';
  $('#city').value = '';
  $('#state').value = '';
  $('#zip').value = '';
  $('#notes').value = '';
  $('#voice-status').textContent = 'Hold record to capture voice notes';
  renderPhotoGrid();
  alert('Saved to queue');
  if (navigator.onLine) {
    try {
      await syncCapture(record, { onProgress: (u) => saveCapture(u) });
      await saveCapture(record);
    } catch {
      /* queued for retry */
    }
  }
  showScreen('queue');
}

async function renderQueue() {
  const list = await listCaptures();
  const el = $('#queue-list');
  if (!list.length) {
    el.innerHTML = '<p style="color:var(--muted)">No captures yet.</p>';
    return;
  }
  el.innerHTML = list
    .map(
      (item) => `
    <div class="queue-item" data-id="${item.captureId}">
      <div class="addr">${item.address?.street1 || 'No address'}</div>
      <div class="meta">
        <span class="badge ${item.state}">${item.state}</span>
        ${item.photos?.length || 0} photos
        ${item.audioBlob || item.audioMeta ? ' · voice' : ''}
        ${item.lastError ? `<br><span style="color:var(--danger)">${item.lastError}</span>` : ''}
      </div>
      <button type="button" class="btn secondary retry-btn" data-id="${item.captureId}" style="margin-top:8px">Retry</button>
      ${item.state === 'DONE' ? `<button type="button" class="btn secondary delete-btn" data-id="${item.captureId}" style="margin-top:4px">Remove</button>` : ''}
    </div>`,
    )
    .join('');

  el.querySelectorAll('.retry-btn').forEach((btn) => {
    btn.onclick = async () => {
      const item = list.find((i) => i.captureId === btn.dataset.id);
      if (!item) return;
      try {
        await syncCapture(item, { onProgress: (u) => saveCapture(u) });
        await saveCapture(item);
      } catch {
        await saveCapture(item);
      }
      renderQueue();
    };
  });

  el.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.onclick = async () => {
      await deleteCapture(btn.dataset.id);
      renderQueue();
    };
  });
}

// --- Review queue (field-loop drafts) ---

async function refreshReviewCount() {
  const badge = $('#review-count');
  try {
    const drafts = await listPendingDrafts();
    badge.textContent = drafts.length;
    badge.classList.toggle('hidden', drafts.length === 0);
  } catch {
    badge.classList.add('hidden');
  }
}

async function renderReview() {
  const list = $('#review-list');
  const status = $('#review-status');
  list.innerHTML = '<p style="color:var(--muted)">Loading drafts…</p>';
  let drafts;
  try {
    drafts = await listPendingDrafts();
  } catch (err) {
    status.className = 'status-bar offline';
    status.textContent = `Field-loop unreachable: ${err.message}`;
    list.innerHTML =
      '<p style="color:var(--muted)">Start the sidecar: <code>node re-acquisition/field-loop/server/server.js</code>, or set its URL in Settings.</p>';
    return;
  }
  status.className = 'status-bar online';
  status.textContent = drafts.length
    ? `${drafts.length} draft${drafts.length === 1 ? '' : 's'} awaiting confirm`
    : 'Review queue is clear';
  list.innerHTML = drafts.length
    ? drafts.map(renderDraftCard).join('')
    : '<p style="color:var(--muted)">Nothing to review. New voice extractions land here first.</p>';

  list.querySelectorAll('.draft-card').forEach((card) => {
    const id = card.dataset.draftId;
    const draft = drafts.find((d) => d.id === id);
    card.querySelector('.confirm-draft-btn').onclick = async () => {
      const { extraction, edited } = buildEditedExtraction(draft, card);
      card.querySelector('.confirm-draft-btn').disabled = true;
      try {
        await confirmDraft(id, edited ? extraction : null);
        card.remove();
      } catch (err) {
        alert(`Confirm failed: ${err.message}`);
        card.querySelector('.confirm-draft-btn').disabled = false;
      }
      refreshReviewCount();
    };
    card.querySelector('.discard-draft-btn').onclick = async () => {
      if (!confirm('Discard this draft? Nothing is written to the CRM.')) return;
      try {
        await discardDraft(id);
        card.remove();
      } catch (err) {
        alert(`Discard failed: ${err.message}`);
      }
      refreshReviewCount();
    };
  });
  refreshReviewCount();
}

// --- Pipeline glance (read-only from Twenty via field-loop) ---

async function renderPipelineScreen() {
  const el = $('#pipeline-list');
  el.innerHTML = '<p style="color:var(--muted)">Loading pipeline…</p>';
  try {
    el.innerHTML = renderPipeline(await getPipeline());
  } catch (err) {
    el.innerHTML = `<p style="color:var(--muted)">Pipeline unavailable: ${err.message}.<br>
      The field-loop sidecar needs <code>TWENTY_API_KEY</code> to read the CRM.</p>`;
  }
}

document.querySelectorAll('nav.tabs button').forEach((btn) => {
  btn.onclick = () => showScreen(btn.dataset.screen);
});

$('#btn-gps').onclick = useGps;
$('#btn-photo').onclick = () => $('#camera-input').click();
$('#camera-input').onchange = (e) => {
  const file = e.target.files?.[0];
  if (file && photos.length < 5) {
    photos.push({ blob: file });
    renderPhotoGrid();
  }
  e.target.value = '';
};
$('#btn-save').onclick = saveToQueue;
$('#btn-save-settings').onclick = saveSettings;
$('#btn-sync-all').onclick = async () => {
  await processQueue(saveCapture, listCaptures);
  renderQueue();
};

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

$('#btn-pipeline-refresh').onclick = renderPipelineScreen;

setupRecorder();
loadSettings();
updateNetwork();
renderPhotoGrid();
refreshReviewCount();
setInterval(refreshReviewCount, 30000);
