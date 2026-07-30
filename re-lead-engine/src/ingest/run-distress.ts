import { getDistressAdapter } from '../adapters/registry.ts';
import { createLogger } from '../lib/logger.ts';
import {
  finishRun,
  recordRawScrape,
  startRun,
  updateSourceHealth,
  upsertDistressEvents,
} from './persist.ts';

const logger = createLogger('ingest:distress');

export type DistressIngestSummary = {
  sourceName: string;
  runId: string;
  targetsDiscovered: number;
  targetsFetched: number;
  targetsSkipped: number;
  eventsParsed: number;
  inserted: number;
  updated: number;
  matched: number;
  unmatched: number;
  needsOcr: number;
  failures: { url: string; error: string }[];
};

export const runDistressIngest = async (options: {
  sourceName: string;
  limitTargets?: number;
}): Promise<DistressIngestSummary> => {
  const adapter = getDistressAdapter(options.sourceName);
  const runId = await startRun(adapter.sourceName, adapter.kind);
  const log = logger.child(adapter.sourceName);

  const summary: DistressIngestSummary = {
    sourceName: adapter.sourceName,
    runId,
    targetsDiscovered: 0,
    targetsFetched: 0,
    targetsSkipped: 0,
    eventsParsed: 0,
    inserted: 0,
    updated: 0,
    matched: 0,
    unmatched: 0,
    needsOcr: 0,
    failures: [],
  };

  try {
    const discovered = await adapter.discover();
    summary.targetsDiscovered = discovered.length;

    const targets =
      options.limitTargets === undefined ? discovered : discovered.slice(0, options.limitTargets);

    if (targets.length < discovered.length) {
      log.warn('target list truncated by --limit', {
        discovered: discovered.length,
        processing: targets.length,
      });
    }

    for (const target of targets) {
      try {
        const fetched = await adapter.fetch(target);
        summary.targetsFetched += 1;

        const rawScrapeId = await recordRawScrape(runId, fetched);

        if (fetched.extractionStatus === 'needs_ocr') {
          // Counted, stored, and skipped — not silently dropped. Phase 1 OCR
          // reads these back out of raw_scrapes without re-downloading.
          summary.needsOcr += 1;
          summary.targetsSkipped += 1;
          continue;
        }

        const parsed = adapter.parse(fetched);
        const events = await adapter.normalize(parsed, fetched);
        summary.eventsParsed += events.length;

        const upserted = await upsertDistressEvents(events, runId, rawScrapeId);
        summary.inserted += upserted.inserted;
        summary.updated += upserted.updated;
        summary.matched += upserted.matched;
        summary.unmatched += upserted.unmatched;

        log.info('target processed', {
          label: target.label,
          events: events.length,
          inserted: upserted.inserted,
        });
      } catch (error) {
        // One bad page must not abort a 9-page run. Failures are collected and
        // reported at the end, and the health check reads the resulting count.
        summary.failures.push({ url: target.url, error: String(error) });
        log.error('target failed', { url: target.url, error: String(error) });
      }
    }

    await finishRun(runId, {
      discovered: summary.targetsDiscovered,
      parsed: summary.eventsParsed,
      rejected: summary.targetsSkipped,
    });

    await updateSourceHealth({
      sourceName: adapter.sourceName,
      countyFips: null,
      recordCount: summary.eventsParsed,
      succeeded: summary.failures.length === 0,
      ...(summary.failures.length > 0
        ? { error: `${summary.failures.length} target(s) failed` }
        : {}),
    });

    return summary;
  } catch (error) {
    await finishRun(
      runId,
      { discovered: summary.targetsDiscovered, parsed: summary.eventsParsed, rejected: 0 },
      String(error),
    );

    await updateSourceHealth({
      sourceName: adapter.sourceName,
      countyFips: null,
      recordCount: summary.eventsParsed,
      succeeded: false,
      error: String(error),
    });

    throw error;
  }
};
