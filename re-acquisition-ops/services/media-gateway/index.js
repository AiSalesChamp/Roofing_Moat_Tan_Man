// Local media gateway: multipart → Twenty GraphQL uploadFilesFieldFile.
// Binds privately; requires MEDIA_GATEWAY_SECRET on every write.

import busboy from 'busboy';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 3081);
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
const TWENTY_API_URL = (process.env.TWENTY_API_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const MEDIA_GATEWAY_SECRET = process.env.MEDIA_GATEWAY_SECRET || '';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'application/pdf',
]);

let cachedFieldMetadataId = process.env.ATTACHMENT_FILE_FIELD_METADATA_ID || '';

const WHISPER_STT_URL = (process.env.WHISPER_STT_URL || '').replace(/\/$/, '');
const TRANSCRIPT_CACHE_MAX = 200;

// Transcriptions run in the background while the upload response returns.
// Keyed by both fileId and pendingMediaId so callers can use either.
// In-memory only: a gateway restart between upload and bundle submit loses the
// transcript, and GET /transcript then reports 404 (caller falls back to
// manual STT).
const transcriptJobs = new Map();

const rememberTranscriptJob = (keys, job) => {
  for (const key of keys) {
    if (!key) continue;
    transcriptJobs.set(key, job);
    if (transcriptJobs.size > TRANSCRIPT_CACHE_MAX) {
      const oldest = transcriptJobs.keys().next().value;
      transcriptJobs.delete(oldest);
    }
  }
};

const transcribeAudio = async ({ buffer, filename, contentType }) => {
  const form = new FormData();
  form.append('audio_file', new Blob([buffer], { type: contentType }), filename);
  const response = await fetch(
    `${WHISPER_STT_URL}/asr?task=transcribe&encode=true&output=json`,
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    throw new Error(`Whisper STT failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  const text = (payload.text || '').trim();
  if (!text) {
    throw new Error('Whisper STT returned empty transcript');
  }
  return text;
};

const json = (response, statusCode, body) => {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
};

const unauthorized = (response) =>
  json(response, 401, { ok: false, error: 'Unauthorized' });

const readSecret = (request) =>
  request.headers['x-webhook-secret'] ||
  request.headers['x-media-gateway-secret'] ||
  '';

const assertSecret = (request, response) => {
  if (!MEDIA_GATEWAY_SECRET) {
    json(response, 503, {
      ok: false,
      error: 'MEDIA_GATEWAY_SECRET not configured',
    });
    return false;
  }
  if (readSecret(request) !== MEDIA_GATEWAY_SECRET) {
    unauthorized(response);
    return false;
  }
  return true;
};

const metadataQuery = `
  query ResolveAttachmentFileField {
    objects(paging: { first: 200 }) {
      edges {
        node {
          nameSingular
          fieldsList {
            id
            name
            type
          }
        }
      }
    }
  }
`;

const resolveAttachmentFileFieldId = async () => {
  if (cachedFieldMetadataId) {
    return cachedFieldMetadataId;
  }
  if (!TWENTY_API_KEY) {
    throw new Error('TWENTY_API_KEY required to resolve Attachment.file field');
  }

  const response = await fetch(`${TWENTY_API_URL}/metadata`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TWENTY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: metadataQuery }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(
      `Metadata query failed: ${JSON.stringify(payload.errors || payload)}`,
    );
  }

  const edges = payload.data?.objects?.edges || [];
  for (const edge of edges) {
    const objectNode = edge.node;
    if (objectNode?.nameSingular !== 'attachment') {
      continue;
    }
    const fileField = (objectNode.fieldsList || []).find(
      (field) => field.name === 'file' && field.type === 'FILES',
    );
    if (fileField?.id) {
      cachedFieldMetadataId = fileField.id;
      return cachedFieldMetadataId;
    }
  }

  throw new Error('Could not find attachment.file FILES field metadata id');
};

const uploadToTwenty = async ({ buffer, filename, contentType }) => {
  const fieldMetadataId = await resolveAttachmentFileFieldId();
  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query: `mutation UploadFilesFieldFile($file: Upload!, $fieldMetadataId: String!) {
        uploadFilesFieldFile(file: $file, fieldMetadataId: $fieldMetadataId) {
          id path size createdAt url
        }
      }`,
      variables: { file: null, fieldMetadataId },
    }),
  );
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([buffer], { type: contentType }), filename);

  const response = await fetch(`${TWENTY_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: form,
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(
      `GraphQL upload failed: ${JSON.stringify(payload.errors || payload)}`,
    );
  }

  const uploaded = payload.data?.uploadFilesFieldFile;
  if (!uploaded?.id) {
    throw new Error('Upload succeeded but no file id returned');
  }
  return uploaded;
};

const parseMultipart = (request) =>
  new Promise((resolve, reject) => {
    const parser = busboy({
      headers: request.headers,
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    });
    const chunks = [];
    let filename = 'upload.bin';
    let mimeType = 'application/octet-stream';
    let metadata = {};
    let sawFile = false;

    parser.on('file', (_name, fileStream, info) => {
      sawFile = true;
      filename = info.filename || filename;
      mimeType = info.mimeType || mimeType;
      fileStream.on('data', (chunk) => chunks.push(chunk));
      fileStream.on('limit', () =>
        reject(new Error('File exceeds 10MB limit')),
      );
    });

    parser.on('field', (name, value) => {
      if (name === 'metadata') {
        try {
          metadata = JSON.parse(value);
        } catch {
          metadata = {};
        }
      }
    });

    parser.on('error', reject);
    parser.on('finish', () => {
      if (!sawFile) {
        reject(new Error('Missing file part'));
        return;
      }
      resolve({
        buffer: Buffer.concat(chunks),
        filename: metadata.filename || filename,
        mimeType: metadata.mimeType || mimeType,
        metadata,
      });
    });

    request.pipe(parser);
  });

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/healthz') {
    json(response, 200, {
      ok: true,
      twentyConfigured: Boolean(TWENTY_API_KEY),
      fieldCached: Boolean(cachedFieldMetadataId),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/upload') {
    if (!assertSecret(request, response)) {
      return;
    }
    if (!TWENTY_API_KEY) {
      json(response, 503, { ok: false, error: 'TWENTY_API_KEY not configured' });
      return;
    }

    try {
      const pendingMediaId =
        request.headers['idempotency-key'] ||
        request.headers['Idempotency-Key'] ||
        randomUUID();
      const parsed = await parseMultipart(request);
      const contentType = (parsed.mimeType || '').toLowerCase();

      if (contentType && !ALLOWED_MIME.has(contentType)) {
        json(response, 400, {
          ok: false,
          error: `MIME not allowed: ${contentType}`,
        });
        return;
      }

      const uploaded = await uploadToTwenty({
        buffer: parsed.buffer,
        filename: parsed.filename,
        contentType: contentType || 'application/octet-stream',
      });

      const isAudio = contentType.startsWith('audio/');
      let transcriptPending = false;
      if (isAudio && WHISPER_STT_URL) {
        transcriptPending = true;
        const job = transcribeAudio({
          buffer: parsed.buffer,
          filename: parsed.filename,
          contentType,
        });
        // Swallow here; GET /transcript surfaces the error to the caller.
        job.catch(() => {});
        rememberTranscriptJob([uploaded.id, pendingMediaId], job);
      }

      json(response, 201, {
        mediaId: pendingMediaId,
        fileId: uploaded.id,
        status: 'created',
        uploadComplete: true,
        pendingMediaId,
        filename: parsed.filename,
        size: uploaded.size,
        url: uploaded.url,
        transcriptPending,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      json(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/transcript') {
    if (!assertSecret(request, response)) {
      return;
    }
    const key =
      url.searchParams.get('fileId') ||
      url.searchParams.get('pendingMediaId') ||
      '';
    const job = key ? transcriptJobs.get(key) : undefined;
    if (!job) {
      json(response, 404, {
        ok: false,
        error: 'No transcript job for that id (expired, restarted, or never audio)',
      });
      return;
    }
    try {
      const transcript = await job;
      json(response, 200, { ok: true, transcript });
    } catch (error) {
      json(response, 502, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  json(response, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, BIND_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    `media-gateway listening on http://${BIND_HOST}:${PORT} → ${TWENTY_API_URL}`,
  );
});
