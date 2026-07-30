import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { getLayoutForCounty } from '../adapters/appraisal-roll/layouts.ts';
import { deriveLayoutFromFile, readRollRows } from '../adapters/appraisal-roll/roll-reader.ts';
import { queryOne } from '../db/pool.ts';
import { createLogger } from '../lib/logger.ts';
import { refreshOwnerParcelCounts, upsertRollRow } from './persist-roll.ts';
import { finishRun, rematchUnmatchedEvents, startRun, updateSourceHealth } from './persist.ts';

const logger = createLogger('ingest:roll');

const hashFile = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');

  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

export type RollIngestSummary = {
  countyFips: string;
  runId: string;
  rollYear: number;
  rowsRead: number;
  rowsRejected: number;
  parcelsInserted: number;
  ownersInserted: number;
  eventsRematched: number;
};

export const runRollIngest = async (options: {
  countyFips: string;
  filePath: string;
  rollYear?: number;
  autoLayout?: boolean;
}): Promise<RollIngestSummary> => {
  const resolvedYear = options.rollYear ?? new Date().getUTCFullYear();
  const layout =
    getLayoutForCounty(options.countyFips) ??
    (options.autoLayout === true
      ? await deriveLayoutFromFile(options.filePath, options.countyFips, resolvedYear)
      : undefined);

  if (layout === undefined) {
    throw new Error(
      `No appraisal roll layout registered for county ${options.countyFips}. ` +
        `Run: yarn ingest --source=roll --county=${options.countyFips} --file=${options.filePath} --inspect\n` +
        'then add the layout to src/adapters/appraisal-roll/layouts.ts, ' +
        "or pass --auto-layout to derive one from the file's header row.",
    );
  }

  const sourceName = `appraisal_roll:${options.countyFips}`;
  const runId = await startRun(sourceName, 'appraisal_roll');
  const rollYear = resolvedYear;

  const summary: RollIngestSummary = {
    countyFips: options.countyFips,
    runId,
    rollYear,
    rowsRead: 0,
    rowsRejected: 0,
    parcelsInserted: 0,
    ownersInserted: 0,
    eventsRematched: 0,
  };

  try {
    const [fileStat, fileHash] = await Promise.all([stat(options.filePath), hashFile(options.filePath)]);

    // Same file, same year, already imported — reject rather than redo. Rolls are
    // large and re-importing an identical file only burns time.
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM appraisal_roll_imports
        WHERE county_fips = $1 AND roll_year = $2 AND file_sha256 = $3`,
      [options.countyFips, rollYear, fileHash],
    );

    if (existing !== undefined) {
      logger.warn('roll already imported, skipping', {
        countyFips: options.countyFips,
        rollYear,
        fileHash,
      });

      await finishRun(runId, { discovered: 0, parsed: 0, rejected: 0 });

      return summary;
    }

    await queryOne(
      `INSERT INTO appraisal_roll_imports
         (run_id, county_fips, roll_year, layout_id, file_path, file_bytes, file_sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        runId,
        options.countyFips,
        rollYear,
        layout.layoutId,
        options.filePath,
        fileStat.size,
        fileHash,
      ],
    );

    const readResult = await readRollRows(options.filePath, layout, async (row) => {
      const outcome = await upsertRollRow({
        row,
        countyFips: options.countyFips,
        rollYear,
        sourceName,
      });

      if (outcome === undefined) {
        summary.rowsRejected += 1;
        return;
      }

      if (outcome.parcelInserted) {
        summary.parcelsInserted += 1;
      }

      if (outcome.ownerInserted) {
        summary.ownersInserted += 1;
      }
    });

    summary.rowsRead = readResult.rowsRead;
    summary.rowsRejected += readResult.rowsRejected;

    await queryOne(
      'UPDATE appraisal_roll_imports SET row_count = $2 WHERE run_id = $1',
      [runId, summary.rowsRead],
    );

    await refreshOwnerParcelCounts();

    // The reason unmatched events are kept: a county's distress events land before
    // its roll does, and this is where they finally connect.
    summary.eventsRematched = await rematchUnmatchedEvents(options.countyFips);

    await finishRun(runId, {
      discovered: summary.rowsRead,
      parsed: summary.rowsRead,
      rejected: summary.rowsRejected,
    });

    await updateSourceHealth({
      sourceName,
      countyFips: options.countyFips,
      recordCount: summary.rowsRead,
      succeeded: true,
    });

    logger.info('roll ingest complete', summary);

    return summary;
  } catch (error) {
    await finishRun(runId, { discovered: 0, parsed: summary.rowsRead, rejected: 0 }, String(error));
    await updateSourceHealth({
      sourceName,
      countyFips: options.countyFips,
      recordCount: summary.rowsRead,
      succeeded: false,
      error: String(error),
    });

    throw error;
  }
};
