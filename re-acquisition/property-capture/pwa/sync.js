import { getSetting } from './db.js';

const BACKOFF_BASE = 1000;
const BACKOFF_CAP = 300000;

export async function getConfig() {
  const n8nBaseUrl = (
    await getSetting('n8nBaseUrl', 'http://127.0.0.1:5678')
  ).replace(/\/$/, '');
  // Prefer media-gateway for real Twenty GraphQL uploads (Path A default)
  const mediaGatewayUrl = (
    await getSetting('mediaGatewayUrl', 'http://127.0.0.1:3081')
  ).replace(/\/$/, '');
  const webhookSecret = await getSetting('webhookSecret', '');
  const mediaGatewaySecret = await getSetting(
    'mediaGatewaySecret',
    webhookSecret,
  );
  const repId = await getSetting('repId', crypto.randomUUID());
  return {
    n8nBaseUrl,
    mediaGatewayUrl,
    webhookSecret,
    mediaGatewaySecret,
    repId,
  };
}

export async function uploadMedia(blob, meta, config) {
  const form = new FormData();
  form.append('file', blob, meta.filename);
  form.append('metadata', JSON.stringify(meta));

  const headers = {};
  const secret = config.mediaGatewaySecret || config.webhookSecret;
  if (secret) headers['X-Webhook-Secret'] = secret;
  headers['Idempotency-Key'] = meta.pendingMediaId;

  // Direct to media-gateway → Twenty GraphQL (avoids stub fileIds)
  const uploadUrl = config.mediaGatewayUrl
    ? `${config.mediaGatewayUrl}/upload`
    : `${config.n8nBaseUrl}/webhook/re-capture/media`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: form,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Media upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.error || `Media upload ${res.status}`);
  return json;
}

export async function submitBundle(bundle, config) {
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': bundle.captureId,
  };
  if (config.webhookSecret) headers['X-Webhook-Secret'] = config.webhookSecret;

  const res = await fetch(`${config.n8nBaseUrl}/webhook/re-capture/bundle`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bundle),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Bundle submit failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.error || `Bundle submit ${res.status}`);
  return json;
}

export function backoffMs(attempt) {
  return Math.random() * Math.min(BACKOFF_CAP, BACKOFF_BASE * 2 ** attempt);
}

export async function syncCapture(record, { onProgress } = {}) {
  const config = await getConfig();
  record.state = record.state || 'PENDING';
  record.attempts = record.attempts || 0;

  if (record.state === 'DONE') return record;

  try {
    record.state = 'UPLOADING_MEDIA';
    onProgress?.(record);

    const mediaItems = [
      ...(record.audioBlob
        ? [{ key: 'audio', blob: record.audioBlob, meta: record.audioMeta }]
        : []),
      ...(record.photos || []).map((p, i) => ({
        key: `photo-${i}`,
        blob: p.blob,
        meta: p.meta,
      })),
    ];

    for (const item of mediaItems) {
      if (item.meta.fileId) continue;
      const result = await uploadMedia(item.blob, item.meta, config);
      item.meta.fileId = result.fileId;
      if (item.key === 'audio') record.audioMeta = item.meta;
      else {
        const idx = Number(item.key.split('-')[1]);
        record.photos[idx].meta = item.meta;
      }
    }

    record.state = 'SUBMITTING';
    onProgress?.(record);

    const bundle = buildBundle(record, config);
    const result = await submitBundle(bundle, config);
    record.state = 'DONE';
    record.result = result;
    record.attempts = 0;
    onProgress?.(record);
    return record;
  } catch (err) {
    record.attempts += 1;
    record.lastError = err.message;
    record.state = record.attempts >= 10 ? 'FAILED' : 'PENDING';
    onProgress?.(record);
    throw err;
  }
}

function buildBundle(record, config) {
  const address = record.address || {};
  return {
    captureId: record.captureId,
    schemaVersion: '2.0',
    repId: config.repId,
    capturedAt: record.capturedAt,
    timezone: record.timezone,
    deviceType: 'PHONE',
    deviceModel: navigator.userAgent.slice(0, 128),
    appVersion: '0.1.0',
    networkType: navigator.onLine ? 'WIFI' : 'OFFLINE',
    captureOrigin: record.captureOrigin || 'DRIVE_BY',
    geo: record.geo || null,
    target: {
      matchHints: {
        address: {
          street1: address.street1 || '',
          city: address.city || '',
          state: address.state || '',
          zip: address.zip || '',
        },
      },
    },
    audio: {
      fileId: record.audioMeta?.fileId || null,
      pendingMediaId: record.audioMeta?.fileId ? null : record.audioMeta?.pendingMediaId,
      filename: record.audioMeta?.filename || 'memo.webm',
      codec: 'aac',
      container: record.audioMeta?.container || 'm4a',
      durationSec: record.audioMeta?.durationSec || 0,
      audioChannel: 'MONO',
      language: 'en-US',
      sha256: record.audioMeta?.sha256 || '',
    },
    photos: (record.photos || []).map((p, i) => ({
      fileId: p.meta?.fileId || null,
      pendingMediaId: p.meta?.fileId ? null : p.meta?.pendingMediaId,
      filename: p.meta?.filename || `photo-${i}.jpg`,
      mimeType: p.meta?.mimeType || 'image/jpeg',
      sequenceIndex: i,
      sha256: p.meta?.sha256 || '',
      caption: p.meta?.caption || '',
    })),
    clientNotes: record.clientNotes || '',
  };
}

export async function processQueue(saveFn, listFn) {
  if (!navigator.onLine) return;
  const items = await listFn();
  const pending = items.filter((i) => ['PENDING', 'UPLOADING_MEDIA', 'SUBMITTING', 'FAILED'].includes(i.state));

  for (const item of pending) {
    if (item.state === 'FAILED' && item.attempts >= 10) continue;
    try {
      await syncCapture(item, {
        onProgress: (updated) => saveFn(updated),
      });
      await saveFn(item);
    } catch {
      await saveFn(item);
      await new Promise((r) => setTimeout(r, backoffMs(item.attempts)));
    }
  }
}
