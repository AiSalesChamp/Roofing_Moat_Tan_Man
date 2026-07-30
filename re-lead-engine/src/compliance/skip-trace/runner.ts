import { env } from '../../config/env.ts';
import { query, queryOne } from '../../db/pool.ts';
import { createLogger } from '../../lib/logger.ts';
import { checkSuppression, recordContactProvenance } from '../suppression.ts';
import { stubVendor } from './stub.vendor.ts';
import type { SkipTraceVendor } from './types.ts';

const logger = createLogger('skip-trace');

const VENDORS: Record<string, SkipTraceVendor> = {
  stub: stubVendor,
};

export const getSkipTraceVendor = (): SkipTraceVendor => {
  const vendor = VENDORS[env.skipTrace.vendor];

  if (vendor === undefined) {
    throw new Error(
      `Unknown SKIP_TRACE_VENDOR "${env.skipTrace.vendor}". Known: ${Object.keys(VENDORS).join(', ')}`,
    );
  }

  return vendor;
};

export type SkipTraceRunSummary = {
  vendor: string;
  requested: number;
  hits: number;
  noHits: number;
  skippedSuppressed: number;
  failed: number;
  costCents: number;
};

// Hard-capped by SKIP_TRACE_MAX_RECORDS. Phase 0 traces at most ~1000 records to
// measure hit rate, not to build a calling list.
export const runSkipTrace = async (limit?: number): Promise<SkipTraceRunSummary> => {
  const vendor = getSkipTraceVendor();
  const cap = Math.min(limit ?? env.skipTrace.maxRecords, env.skipTrace.maxRecords);

  const owners = await query<{
    id: string;
    name_raw: string;
    mailing_street: string | null;
    mailing_city: string | null;
    mailing_state: string | null;
    mailing_postcode: string | null;
  }>(
    `SELECT o.id, o.name_raw, o.mailing_street, o.mailing_city, o.mailing_state, o.mailing_postcode
       FROM owners o
      WHERE NOT EXISTS (SELECT 1 FROM skip_trace_results r WHERE r.owner_id = o.id)
        AND o.mailing_street IS NOT NULL
      ORDER BY o.parcel_count DESC
      LIMIT $1`,
    [cap],
  );

  const summary: SkipTraceRunSummary = {
    vendor: vendor.name,
    requested: 0,
    hits: 0,
    noHits: 0,
    skippedSuppressed: 0,
    failed: 0,
    costCents: 0,
  };

  for (const owner of owners) {
    // Suppression is checked BEFORE spending money. An owner who opted out is not
    // a lead, and paying to find their phone number would be both wasteful and,
    // for a DNC-listed person, the beginning of a violation.
    const suppression = await checkSuppression({
      ownerId: owner.id,
      identifiers: [],
      channel: 'phone',
    });

    if (suppression.suppressed) {
      summary.skippedSuppressed += 1;

      await queryOne(
        `INSERT INTO skip_trace_results (owner_id, vendor, status)
         VALUES ($1, $2, 'skipped_suppressed')`,
        [owner.id, vendor.name],
      );

      continue;
    }

    summary.requested += 1;

    try {
      const response = await vendor.trace({
        ownerId: owner.id,
        ownerName: owner.name_raw,
        mailingStreet: owner.mailing_street ?? undefined,
        mailingCity: owner.mailing_city ?? undefined,
        mailingState: owner.mailing_state ?? undefined,
        mailingPostcode: owner.mailing_postcode ?? undefined,
      });

      await queryOne(
        `INSERT INTO skip_trace_results
           (owner_id, vendor, status, confidence, phones, emails, raw_response, cost_cents, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [
          owner.id,
          vendor.name,
          response.status,
          response.confidence ?? null,
          JSON.stringify(response.phones),
          JSON.stringify(response.emails),
          JSON.stringify(response.raw),
          response.costCents ?? null,
        ],
      );

      summary.costCents += response.costCents ?? 0;

      if (response.status === 'hit') {
        summary.hits += 1;

        // Provenance per identifier, only for a vendor that actually supplied it.
        if (vendor.isLive) {
          for (const phone of response.phones) {
            await recordContactProvenance({
              ownerId: owner.id,
              kind: 'phone',
              value: phone.number,
              vendor: vendor.name,
              confidence: phone.confidence,
            });
          }

          for (const email of response.emails) {
            await recordContactProvenance({
              ownerId: owner.id,
              kind: 'email',
              value: email,
              vendor: vendor.name,
            });
          }
        }

        // DNC and litigator flags become suppression rows immediately, before any
        // channel could read the number as callable.
        for (const phone of response.phones) {
          if (phone.isDncListed || phone.isLitigator) {
            await queryOne(
              `INSERT INTO suppression
                 (owner_id, identifier_kind, identifier_hash, identifier_preview,
                  channel, status, source, provenance_vendor)
               VALUES ($1, 'phone', encode(digest(lower($2), 'sha256'), 'hex'), $3,
                       'phone', $4, 'skip_trace_scrub', $5)
               ON CONFLICT (identifier_kind, identifier_hash, channel) DO NOTHING`,
              [
                owner.id,
                phone.number,
                phone.number.slice(-4),
                phone.isLitigator ? 'litigator_flagged' : 'dnc_listed',
                vendor.name,
              ],
            );
          }
        }
      } else {
        summary.noHits += 1;
      }
    } catch (error) {
      summary.failed += 1;
      logger.error('skip trace failed', { ownerId: owner.id, error: String(error) });
    }
  }

  logger.info('skip trace run complete', summary);

  return summary;
};
