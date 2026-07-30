import { listDistressAdapters } from '../adapters/registry.ts';
import { query } from '../db/pool.ts';
import { politeFetch } from '../lib/http/polite-client.ts';
import { isPdfToTextAvailable } from '../lib/pdf.ts';

// Health checks report and fail. They never repair.
//
// An adapter that silently "fixes" a source returning 3 rows instead of 3000 hides
// the fact that the source changed — and the funnel quietly shrinks for a month
// before anyone notices the lead count dropped.

export type CheckSeverity = 'ok' | 'warn' | 'fail';

export type CheckResult = {
  name: string;
  severity: CheckSeverity;
  message: string;
  detail?: Record<string, unknown>;
};

const checkSourceFreshness = async (): Promise<CheckResult[]> => {
  const rows = await query<{
    source_name: string;
    county_fips: string | null;
    status: string;
    last_successful_run_at: string | null;
    last_record_count: number | null;
    expected_min_records: number;
    freshness_sla_hours: number;
    hours_since_success: number | null;
  }>(
    `SELECT source_name, county_fips, status::text, last_successful_run_at::text,
            last_record_count, expected_min_records, freshness_sla_hours,
            EXTRACT(EPOCH FROM (now() - last_successful_run_at)) / 3600 AS hours_since_success
       FROM data_sources
      WHERE status <> 'disabled'
      ORDER BY source_name`,
  );

  return rows.map((row) => {
    const label = row.county_fips === null ? row.source_name : `${row.source_name}`;

    if (row.last_successful_run_at === null) {
      return {
        name: `freshness:${label}`,
        severity: 'warn',
        message: 'never run successfully',
      };
    }

    const hours = row.hours_since_success ?? 0;

    if (hours > row.freshness_sla_hours) {
      return {
        name: `freshness:${label}`,
        severity: 'fail',
        message: `stale: ${Math.round(hours)}h since last success, SLA is ${row.freshness_sla_hours}h`,
        detail: { lastSuccess: row.last_successful_run_at },
      };
    }

    return {
      name: `freshness:${label}`,
      severity: 'ok',
      message: `last success ${Math.round(hours)}h ago`,
    };
  });
};

const checkRecordCounts = async (): Promise<CheckResult[]> => {
  const rows = await query<{
    source_name: string;
    last_record_count: number | null;
    expected_min_records: number;
  }>(
    `SELECT source_name, last_record_count, expected_min_records
       FROM data_sources
      WHERE status <> 'disabled' AND last_record_count IS NOT NULL
      ORDER BY source_name`,
  );

  return rows.map((row) => {
    const count = row.last_record_count ?? 0;

    // The tripwire from the spec: an unexpected record count fails loudly.
    if (count < row.expected_min_records) {
      return {
        name: `record_count:${row.source_name}`,
        severity: 'fail',
        message: `returned ${count} records, expected at least ${row.expected_min_records} — source layout may have changed`,
      };
    }

    return {
      name: `record_count:${row.source_name}`,
      severity: 'ok',
      message: `${count} records`,
    };
  });
};

// Asserts the live source still has the fields the adapter reads. This is what
// catches a silent API change before it shows up as an empty ingest.
const checkAdapterSchemas = async (): Promise<CheckResult[]> => {
  const results: CheckResult[] = [];

  const lgbsRequiredFields = [
    'uid',
    'state',
    'county',
    'account_nbr',
    'sale_type',
    'status',
    'prop_address_one',
    'prop_zipcode',
    'value',
    'minimum_bid',
  ];

  try {
    const response = await politeFetch(
      'https://taxsales.lgbs.com/api/property_sales/?state=TX&limit=1',
      { accept: 'application/json' },
    );
    const payload = JSON.parse(response.body) as {
      count?: number;
      results?: Record<string, unknown>[];
    };
    const sample = payload.results?.[0];

    if (sample === undefined) {
      results.push({
        name: 'schema:lgbs',
        severity: 'fail',
        message: 'API returned no results for state=TX',
      });
    } else {
      const missing = lgbsRequiredFields.filter((field) => !(field in sample));

      results.push(
        missing.length === 0
          ? {
              name: 'schema:lgbs',
              severity: 'ok',
              message: `all ${lgbsRequiredFields.length} expected fields present, count=${payload.count ?? 0}`,
            }
          : {
              name: 'schema:lgbs',
              severity: 'fail',
              message: `API is missing expected field(s): ${missing.join(', ')}`,
            },
      );
    }
  } catch (error) {
    results.push({
      name: 'schema:lgbs',
      severity: 'fail',
      message: `probe failed: ${String(error)}`,
    });
  }

  try {
    const response = await politeFetch('https://www.pbfcm.com/taxsale.html', {
      accept: 'text/html',
    });
    const linkCount = [...response.body.matchAll(/docs\/taxdocs\/sales\/[^"']+\.pdf/gi)].length;

    results.push(
      linkCount === 0
        ? {
            name: 'schema:pbfcm',
            severity: 'fail',
            message: 'sale index contains no PDF links — page structure changed',
          }
        : {
            name: 'schema:pbfcm',
            severity: 'ok',
            message: `${linkCount} sale PDF link(s) in index`,
          },
    );
  } catch (error) {
    results.push({
      name: 'schema:pbfcm',
      severity: 'fail',
      message: `probe failed: ${String(error)}`,
    });
  }

  return results;
};

// A high unmatched ratio is not a scraper bug — it means the identity layer has a
// hole. Reported separately so the two failure modes are not confused.
const checkMatchRate = async (): Promise<CheckResult[]> => {
  const rows = await query<{
    total: number;
    unmatched: number;
    counties_missing_rolls: number;
  }>(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE match_status <> 'matched')::int AS unmatched,
       (SELECT count(DISTINCT d.county_fips)::int
          FROM distress_events d
         WHERE d.match_status <> 'matched' AND d.county_fips IS NOT NULL) AS counties_missing_rolls
     FROM distress_events`,
  );

  const row = rows[0];

  if (row === undefined || row.total === 0) {
    return [{ name: 'match_rate', severity: 'warn', message: 'no distress events ingested yet' }];
  }

  const ratio = row.unmatched / row.total;

  return [
    {
      name: 'match_rate',
      severity: ratio > 0.5 ? 'warn' : 'ok',
      message: `${row.unmatched}/${row.total} events unmatched (${Math.round(ratio * 100)}%) across ${row.counties_missing_rolls} county(ies) — load appraisal rolls to close the gap`,
    },
  ];
};

const checkDependencies = async (): Promise<CheckResult[]> => {
  const hasPdfToText = await isPdfToTextAvailable();

  return [
    {
      name: 'dependency:pdftotext',
      severity: hasPdfToText ? 'ok' : 'fail',
      message: hasPdfToText
        ? 'available'
        : 'missing — install poppler-utils, or the pbfcm adapter cannot read any PDF',
    },
  ];
};

export const runHealthChecks = async (options: {
  probeSources: boolean;
}): Promise<{ results: CheckResult[]; worst: CheckSeverity }> => {
  const results: CheckResult[] = [
    ...(await checkDependencies()),
    ...(await checkSourceFreshness()),
    ...(await checkRecordCounts()),
    ...(await checkMatchRate()),
    ...(options.probeSources ? await checkAdapterSchemas() : []),
  ];

  for (const adapter of listDistressAdapters()) {
    results.push({
      name: `adapter:${adapter.sourceName}`,
      severity: 'ok',
      message: adapter.provides,
    });
  }

  const worst: CheckSeverity = results.some((result) => result.severity === 'fail')
    ? 'fail'
    : results.some((result) => result.severity === 'warn')
      ? 'warn'
      : 'ok';

  return { results, worst };
};
