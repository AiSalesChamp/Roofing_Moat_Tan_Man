import type { ContactChannel } from '../config/env.ts';
import { query, queryOne } from '../db/pool.ts';
import { hashIdentifier } from '../lib/hash.ts';
import { createLogger } from '../lib/logger.ts';

const logger = createLogger('suppression');

export type IdentifierKind = 'person' | 'mailing_address' | 'phone' | 'email';

export type SuppressionCheck = {
  suppressed: boolean;
  matchedChannel: string | undefined;
  status: string | undefined;
  reason: string | undefined;
};

// A suppression row with channel 'all' blocks every channel. A row scoped to one
// channel blocks only that one. Expiry is honoured — some vendor DNC records are
// time-boxed — but a NULL expires_at means permanent, which is the default.
export const checkSuppression = async (input: {
  ownerId?: string | undefined;
  identifiers: readonly { kind: IdentifierKind; value: string }[];
  channel: ContactChannel;
}): Promise<SuppressionCheck> => {
  const hashes = input.identifiers.map((identifier) => hashIdentifier(identifier.value));

  const rows = await query<{ channel: string; status: string; source: string }>(
    `SELECT channel::text, status::text, source
       FROM suppression
      WHERE status <> 'allowed'
        AND (expires_at IS NULL OR expires_at > now())
        AND (channel = 'all' OR channel = $1::contact_channel)
        AND (
          ($2::uuid IS NOT NULL AND owner_id = $2::uuid)
          OR identifier_hash = ANY($3::text[])
        )
      LIMIT 1`,
    [input.channel, input.ownerId ?? null, hashes],
  );

  const match = rows[0];

  if (match === undefined) {
    return { suppressed: false, matchedChannel: undefined, status: undefined, reason: undefined };
  }

  return {
    suppressed: true,
    matchedChannel: match.channel,
    status: match.status,
    reason: `${match.status} on ${match.channel} (source: ${match.source})`,
  };
};

export type OptOutRequest = {
  ownerId?: string | undefined;
  twentyPersonId?: string | undefined;
  identifiers: readonly { kind: IdentifierKind; value: string }[];
  // Undefined means the request was not scoped, which means every channel.
  channel?: ContactChannel | undefined;
  status: 'opted_out' | 'dnc_listed' | 'litigator_flagged' | 'bounced' | 'deceased';
  source: string;
  provenanceVendor?: string | undefined;
  notes?: string | undefined;
};

export const recordOptOut = async (request: OptOutRequest): Promise<number> => {
  // An unscoped opt-out lands on 'all'. One request kills every channel unless the
  // person themselves narrowed it — the safer default when the scope is unclear.
  const channel = request.channel ?? 'all';
  let written = 0;

  for (const identifier of request.identifiers) {
    await queryOne(
      `INSERT INTO suppression (
         owner_id, twenty_person_id, identifier_kind, identifier_hash,
         identifier_preview, channel, status, source, provenance_vendor, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (identifier_kind, identifier_hash, channel) DO UPDATE SET
         status = EXCLUDED.status,
         owner_id = COALESCE(EXCLUDED.owner_id, suppression.owner_id),
         twenty_person_id = COALESCE(EXCLUDED.twenty_person_id, suppression.twenty_person_id),
         source = EXCLUDED.source,
         captured_at = now(),
         notes = EXCLUDED.notes`,
      [
        request.ownerId ?? null,
        request.twentyPersonId ?? null,
        identifier.kind,
        hashIdentifier(identifier.value),
        // Last four characters only: enough to recognise a record in support,
        // not enough to reconstitute the identifier from the suppression table.
        identifier.value.slice(-4),
        channel,
        request.status,
        request.source,
        request.provenanceVendor ?? null,
        request.notes ?? null,
      ],
    );

    written += 1;
  }

  logger.info('opt-out recorded', {
    channel,
    status: request.status,
    identifiers: written,
    source: request.source,
  });

  return written;
};

export const recordContactProvenance = async (input: {
  ownerId: string;
  kind: IdentifierKind;
  value: string;
  vendor: string;
  confidence?: number | undefined;
  costCents?: number | undefined;
}): Promise<void> => {
  await queryOne(
    `INSERT INTO contact_provenance
       (owner_id, identifier_kind, identifier_hash, identifier_value, vendor,
        vendor_confidence, cost_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (owner_id, identifier_kind, identifier_hash, vendor) DO UPDATE SET
       vendor_confidence = EXCLUDED.vendor_confidence,
       captured_at = now()`,
    [
      input.ownerId,
      input.kind,
      hashIdentifier(input.value),
      input.value,
      input.vendor,
      input.confidence ?? null,
      input.costCents ?? null,
    ],
  );
};
