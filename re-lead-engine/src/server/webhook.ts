import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

import { recordOptOut } from '../compliance/suppression.ts';
import { env, type ContactChannel } from '../config/env.ts';
import { queryOne } from '../db/pool.ts';
import { createLogger } from '../lib/logger.ts';

const logger = createLogger('webhook');

// Twenty -> engine. The direction that makes the sync bidirectional: the CRM is the
// system of record for human interaction, so an opt-out recorded there has to reach
// the engine before the next promotion run, or a suppressed person gets re-promoted.

const SIGNATURE_HEADERS = [
  'x-twenty-webhook-signature',
  'x-webhook-signature',
  'x-hub-signature-256',
];

const verifySignature = (rawBody: string, headers: Record<string, string | string[] | undefined>): boolean => {
  const secret = env.webhook.sharedSecret;

  if (secret === undefined) {
    // Unsigned mode is allowed only because a localhost-only deployment has no
    // network path for a forged request. It is logged every time so it cannot
    // become the accidental production posture.
    logger.warn('WEBHOOK_SHARED_SECRET is not set — accepting unsigned requests');

    return true;
  }

  const provided = SIGNATURE_HEADERS.map((name) => headers[name])
    .map((value) => (Array.isArray(value) ? value[0] : value))
    .find((value) => value !== undefined);

  if (provided === undefined) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const normalized = provided.replace(/^sha256=/, '');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(normalized, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
};

type OptOutPayload = {
  // Twenty webhook envelope shape varies by version, so both a flat body and a
  // { record: {...} } envelope are accepted.
  record?: Record<string, unknown>;
  objectMetadata?: { nameSingular?: string };
} & Record<string, unknown>;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const CHANNEL_VALUES: readonly ContactChannel[] = ['mail', 'phone', 'sms', 'email', 'ads'];

const applyOptOut = async (payload: OptOutPayload): Promise<number> => {
  const record = (payload.record ?? payload) as Record<string, unknown>;

  const twentyPersonId = asString(record.id);
  const engineOwnerId = asString(record.engineOwnerId);

  const identifiers: { kind: 'person' | 'phone' | 'email' | 'mailing_address'; value: string }[] =
    [];

  const emails = record.emails as { primaryEmail?: string } | undefined;
  const phones = record.phones as { primaryPhoneNumber?: string } | undefined;

  const primaryEmail = asString(emails?.primaryEmail);
  const primaryPhone = asString(phones?.primaryPhoneNumber);

  if (primaryEmail !== undefined) {
    identifiers.push({ kind: 'email', value: primaryEmail });
  }

  if (primaryPhone !== undefined) {
    identifiers.push({ kind: 'phone', value: primaryPhone });
  }

  if (twentyPersonId !== undefined) {
    identifiers.push({ kind: 'person', value: twentyPersonId });
  }

  if (identifiers.length === 0) {
    throw new Error('payload contained no usable identifier (email, phone, or record id)');
  }

  // Resolve the engine owner so suppression is keyed on both the identifier and
  // the owner row — a later re-skip-trace that finds a new phone still hits the
  // owner-level block.
  const owner =
    engineOwnerId === undefined
      ? undefined
      : await queryOne<{ id: string }>('SELECT id FROM owners WHERE external_id = $1', [
          engineOwnerId,
        ]);

  const requestedChannel = asString(record.optOutChannel)?.toLowerCase();
  const channel = CHANNEL_VALUES.find((value) => value === requestedChannel);

  return recordOptOut({
    ownerId: owner?.id,
    twentyPersonId,
    identifiers,
    // Undefined channel means unscoped, which recordOptOut turns into 'all'.
    channel,
    status: 'opted_out',
    source: 'twenty_webhook',
    notes: asString(record.optOutReason),
  });
};

const server = createServer((request, response) => {
  if (request.method !== 'POST') {
    response.writeHead(405).end('method not allowed');
    return;
  }

  const chunks: Buffer[] = [];

  request.on('data', (chunk: Buffer) => chunks.push(chunk));

  request.on('end', () => {
    void (async () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const signatureOk = verifySignature(rawBody, request.headers);

      let parsed: OptOutPayload | undefined;
      let applyError: string | undefined;
      let applied = false;

      try {
        parsed = JSON.parse(rawBody) as OptOutPayload;
      } catch (error) {
        applyError = `invalid JSON: ${String(error)}`;
      }

      // Every receipt is stored before it is acted on, signed or not. An opt-out
      // we cannot replay is an opt-out we cannot defend during a TDPSA cure period.
      const receipt = await queryOne<{ id: string }>(
        `INSERT INTO opt_out_events (source, payload, signature_ok)
         VALUES ($1, $2, $3) RETURNING id`,
        ['twenty_webhook', rawBody.slice(0, 200_000), signatureOk],
      );

      if (!signatureOk) {
        logger.error('rejected webhook with bad signature', { receiptId: receipt?.id });
        response.writeHead(401).end('invalid signature');
        return;
      }

      if (parsed !== undefined) {
        try {
          const written = await applyOptOut(parsed);
          applied = true;
          logger.info('opt-out applied', { receiptId: receipt?.id, identifiers: written });
        } catch (error) {
          applyError = String(error);
          logger.error('opt-out could not be applied', {
            receiptId: receipt?.id,
            error: applyError,
          });
        }
      }

      if (receipt !== undefined) {
        await queryOne('UPDATE opt_out_events SET applied = $2, apply_error = $3 WHERE id = $1', [
          receipt.id,
          applied,
          applyError ?? null,
        ]);
      }

      if (!applied) {
        // 422, not 500: the request was received and stored, but its contents
        // could not be turned into a suppression. Twenty should not retry forever.
        response.writeHead(422, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ stored: true, applied: false, error: applyError }));
        return;
      }

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ stored: true, applied: true }));
    })();
  });
});

if (import.meta.filename === process.argv[1]) {
  server.listen(env.webhook.port, () => {
    logger.info('opt-out webhook listening', {
      port: env.webhook.port,
      signed: env.webhook.sharedSecret !== undefined,
    });
  });
}

export { server };
