import type { FetchedTarget, NormalizedDistressEvent } from '../adapters/types.ts';
import { query, queryOne } from '../db/pool.ts';

export const startRun = async (
  sourceName: string,
  kind: 'distress_listing' | 'appraisal_roll',
): Promise<string> => {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO ingest_runs (source_name, kind) VALUES ($1, $2) RETURNING id`,
    [sourceName, kind],
  );

  if (row === undefined) {
    throw new Error('failed to create ingest run');
  }

  return row.id;
};

export const finishRun = async (
  runId: string,
  counts: { discovered: number; parsed: number; rejected: number },
  error?: string,
): Promise<void> => {
  await query(
    `UPDATE ingest_runs
        SET finished_at = now(),
            status = $2,
            records_discovered = $3,
            records_parsed = $4,
            records_rejected = $5,
            error = $6
      WHERE id = $1`,
    [
      runId,
      error === undefined ? 'succeeded' : 'failed',
      counts.discovered,
      counts.parsed,
      counts.rejected,
      error ?? null,
    ],
  );
};

export const recordRawScrape = async (
  runId: string,
  fetched: FetchedTarget,
): Promise<string | undefined> => {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO raw_scrapes
       (run_id, source_name, url, http_status, content_type, content_hash, raw_text, extraction_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      runId,
      fetched.target.id.split('-')[0] ?? 'unknown',
      fetched.target.url,
      fetched.status,
      fetched.contentType ?? null,
      fetched.contentHash,
      // Raw JSON pages are kept whole; extracted PDF text is kept because the
      // binary is re-downloadable but the extraction may not reproduce.
      fetched.rawText.slice(0, 4_000_000),
      fetched.extractionStatus,
    ],
  );

  return row?.id;
};

export type DistressUpsertResult = {
  inserted: number;
  updated: number;
  matched: number;
  unmatched: number;
};

// Idempotent on external_id. Re-running an ingest updates the mutable facts
// (status, dates, values) and leaves identity alone, so a monthly run does not
// duplicate last month's postings.
export const upsertDistressEvents = async (
  events: readonly NormalizedDistressEvent[],
  runId: string,
  rawScrapeId: string | undefined,
): Promise<DistressUpsertResult> => {
  const result: DistressUpsertResult = { inserted: 0, updated: 0, matched: 0, unmatched: 0 };

  for (const event of events) {
    // Match to the identity layer. An event with a county but no matching parcel
    // is recorded as unmatched_apn — usually meaning that county's roll has not
    // been loaded yet, which is exactly what we want visible.
    const parcel =
      event.countyFips === undefined || event.apnNormalized === undefined
        ? undefined
        : await queryOne<{ id: string }>(
            'SELECT id FROM parcels WHERE county_fips = $1 AND apn_normalized = $2',
            [event.countyFips, event.apnNormalized],
          );

    const matchStatus =
      parcel !== undefined
        ? 'matched'
        : event.countyFips === undefined
          ? 'unmatched_county'
          : 'unmatched_apn';

    if (matchStatus === 'matched') {
      result.matched += 1;
    } else {
      result.unmatched += 1;
    }

    const row = await queryOne<{ inserted: boolean }>(
      `INSERT INTO distress_events (
         external_id, parcel_id, match_status, county_fips, county_name_raw,
         apn_raw, apn_normalized, type, event_date, sale_date,
         cause_number, defendant_name_raw, property_address_raw,
         adjudged_value, minimum_bid, sale_status_raw, sale_notes,
         geom_point, source_name, source_url, source_doc_ref,
         confidence, raw_payload, raw_scrape_id, run_id
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13,
         $14, $15, $16, $17,
         CASE WHEN $18::double precision IS NULL THEN NULL
              ELSE ST_SetSRID(ST_MakePoint($18, $19), 4326)::geography END,
         $20, $21, $22,
         $23, $24, $25, $26
       )
       ON CONFLICT (external_id) DO UPDATE SET
         parcel_id = EXCLUDED.parcel_id,
         match_status = EXCLUDED.match_status,
         event_date = EXCLUDED.event_date,
         sale_date = EXCLUDED.sale_date,
         adjudged_value = EXCLUDED.adjudged_value,
         minimum_bid = EXCLUDED.minimum_bid,
         sale_status_raw = EXCLUDED.sale_status_raw,
         sale_notes = EXCLUDED.sale_notes,
         confidence = EXCLUDED.confidence,
         raw_payload = EXCLUDED.raw_payload,
         run_id = EXCLUDED.run_id,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [
        event.externalId,
        parcel?.id ?? null,
        matchStatus,
        event.countyFips ?? null,
        event.countyNameRaw ?? null,
        event.apnRaw ?? null,
        event.apnNormalized ?? null,
        event.type,
        event.eventDate ?? null,
        event.saleDate ?? null,
        event.causeNumber ?? null,
        event.defendantNameRaw ?? null,
        event.propertyAddressRaw ?? null,
        event.adjudgedValue ?? null,
        event.minimumBid ?? null,
        event.saleStatusRaw ?? null,
        event.saleNotes ?? null,
        event.longitude ?? null,
        event.latitude ?? null,
        event.sourceName,
        event.sourceUrl,
        event.sourceDocRef ?? null,
        event.confidence,
        JSON.stringify(event.rawPayload),
        rawScrapeId ?? null,
        runId,
      ],
    );

    if (row?.inserted === true) {
      result.inserted += 1;
    } else {
      result.updated += 1;
    }
  }

  return result;
};

// Called after a roll import: newly-created parcels can retroactively match
// distress events that arrived before their county's identity layer existed.
export const rematchUnmatchedEvents = async (countyFips: string): Promise<number> => {
  const rows = await query<{ count: number }>(
    `WITH rematched AS (
       UPDATE distress_events AS d
          SET parcel_id = p.id,
              match_status = 'matched',
              updated_at = now()
         FROM parcels AS p
        WHERE d.parcel_id IS NULL
          AND d.county_fips = $1
          AND p.county_fips = d.county_fips
          AND p.apn_normalized = d.apn_normalized
        RETURNING d.id
     )
     SELECT count(*)::int AS count FROM rematched`,
    [countyFips],
  );

  return rows[0]?.count ?? 0;
};

export const updateSourceHealth = async (input: {
  sourceName: string;
  countyFips: string | null;
  recordCount: number;
  succeeded: boolean;
  error?: string;
}): Promise<void> => {
  await query(
    `UPDATE data_sources
        SET last_run_at = now(),
            last_successful_run_at = CASE WHEN $4 THEN now() ELSE last_successful_run_at END,
            last_record_count = $3,
            last_error = $5,
            status = CASE
              WHEN NOT $4 THEN 'failing'::source_status
              WHEN $3 < expected_min_records THEN 'stale'::source_status
              ELSE 'healthy'::source_status
            END,
            updated_at = now()
      WHERE source_name = $1
        AND COALESCE(county_fips, 'ALL') = COALESCE($2, 'ALL')`,
    [input.sourceName, input.countyFips, input.recordCount, input.succeeded, input.error ?? null],
  );
};
