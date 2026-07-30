import { inspectRoll } from '../adapters/appraisal-roll/roll-reader.ts';
import { guessFieldForHeader } from '../adapters/appraisal-roll/layouts.ts';
import { listDistressAdapters } from '../adapters/registry.ts';
import { closePool } from '../db/pool.ts';
import { flagBool, flagInt, flagString, parseArgs } from '../lib/args.ts';
import { runDistressIngest } from '../ingest/run-distress.ts';
import { runRollIngest } from '../ingest/run-roll.ts';

const USAGE = `
Usage:
  yarn ingest --source=lgbs [--limit=N]
  yarn ingest --source=pbfcm [--limit=N]
  yarn ingest --source=roll --county=<fips> --file=<path> [--year=YYYY]
  yarn ingest --source=roll --county=<fips> --file=<path> --inspect

Sources:
${listDistressAdapters()
  .map((adapter) => `  ${adapter.sourceName.padEnd(8)} ${adapter.provides}`)
  .join('\n')}
  roll     County appraisal roll bulk file (identity layer: owners + mailing addresses)

--limit caps how many targets are processed. Useful for a smoke test; the run
        reports how many were skipped so a capped run is never mistaken for a full one.
--inspect prints the detected delimiter, headers and a guessed field mapping for a
        roll file, so a layout can be written from evidence. Reads two lines only.
`;

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const source = flagString(args, 'source');

  if (source === undefined || flagBool(args, 'help')) {
    process.stdout.write(`${USAGE}\n`);

    return source === undefined ? 1 : 0;
  }

  if (source === 'roll') {
    const county = flagString(args, 'county');
    const file = flagString(args, 'file');

    if (county === undefined || file === undefined) {
      process.stderr.write('--source=roll requires --county=<fips> and --file=<path>\n');

      return 1;
    }

    if (flagBool(args, 'inspect')) {
      const inspection = await inspectRoll(file);

      process.stdout.write(`\nFile:      ${file}\n`);
      process.stdout.write(
        `Delimiter: ${inspection.delimiter === '\t' ? '\\t (tab)' : inspection.delimiter}\n`,
      );
      process.stdout.write(`Headers:   ${inspection.headers.length}\n\n`);
      process.stdout.write('Guessed field mapping — paste into layouts.ts and correct it:\n\n');
      process.stdout.write('  columns: {\n');

      for (const [field, header] of Object.entries(inspection.guessedColumns)) {
        process.stdout.write(`    ${field}: '${header}',\n`);
      }

      process.stdout.write('  },\n\n');

      if (inspection.missingRequiredFields.length > 0) {
        process.stdout.write(
          `MISSING REQUIRED: ${inspection.missingRequiredFields.join(', ')} — ` +
            'map these by hand from the unmapped headers below.\n\n',
        );
      }

      process.stdout.write(`Unmapped headers (${inspection.unmappedHeaders.length}):\n`);

      for (const header of inspection.unmappedHeaders) {
        const guess = guessFieldForHeader(header);
        process.stdout.write(`  ${header}${guess === undefined ? '' : `  -> maybe ${guess}`}\n`);
      }

      process.stdout.write('\nFirst data row:\n');

      for (const [header, value] of Object.entries(inspection.sampleRow)) {
        if (value !== '') {
          process.stdout.write(`  ${header} = ${value.slice(0, 60)}\n`);
        }
      }

      return inspection.missingRequiredFields.length > 0 ? 1 : 0;
    }

    const year = flagInt(args, 'year');
    const summary = await runRollIngest({
      countyFips: county,
      filePath: file,
      autoLayout: flagBool(args, 'auto-layout'),
      ...(year === undefined ? {} : { rollYear: year }),
    });

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

    return 0;
  }

  const limit = flagInt(args, 'limit');
  const summary = await runDistressIngest({
    sourceName: source,
    ...(limit === undefined ? {} : { limitTargets: limit }),
  });

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  // A run with failures exits non-zero so cron surfaces it.
  return summary.failures.length > 0 ? 1 : 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePool();
}
