import { env, type ContactChannel } from '../config/env.ts';
import { closePool } from '../db/pool.ts';
import { flagBool, flagInt, flagString, parseArgs } from '../lib/args.ts';
import { runPromotion } from '../promote/promote.ts';

const USAGE = `
Usage:
  yarn promote --dry-run [--min-score=N] [--lookback=DAYS] [--channel=mail] [--limit=N]
  yarn promote           [--min-score=N] [--lookback=DAYS] [--channel=mail] [--limit=N]

--dry-run prints exactly what would enter Twenty and why, and writes nothing to the
          CRM. Withhold reasons are still recorded, because the reason distribution
          is the output you actually want to read.
`;

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));

  if (flagBool(args, 'help')) {
    process.stdout.write(`${USAGE}\n`);

    return 0;
  }

  const dryRun = flagBool(args, 'dry-run');
  const channel = (flagString(args, 'channel') ?? env.promotion.defaultChannel) as ContactChannel;
  const minScore = flagInt(args, 'min-score');
  const lookback = flagInt(args, 'lookback');
  const limit = flagInt(args, 'limit');

  const summary = await runPromotion({
    dryRun,
    channel,
    ...(minScore === undefined ? {} : { minScore }),
    ...(lookback === undefined ? {} : { lookbackDays: lookback }),
    ...(limit === undefined ? {} : { limit }),
  });

  const header = dryRun ? 'DRY RUN — nothing was written to Twenty' : 'PROMOTION';

  process.stdout.write(`\n${header}\n${'='.repeat(header.length)}\n\n`);
  process.stdout.write(
    `evaluated ${summary.evaluated}  promoted ${summary.promoted}  ` +
      `unchanged ${summary.unchanged}  withheld ${summary.withheld}  failed ${summary.failed}\n\n`,
  );

  if (Object.keys(summary.withholdsByReason).length > 0) {
    process.stdout.write('Withheld by reason:\n');

    for (const [reason, count] of Object.entries(summary.withholdsByReason).sort(
      (left, right) => right[1] - left[1],
    )) {
      process.stdout.write(`  ${String(count).padStart(6)}  ${reason}\n`);
    }

    process.stdout.write('\n');
  }

  if (summary.plan.length > 0) {
    process.stdout.write(`${dryRun ? 'Would promote' : 'Promoted'} (${summary.plan.length}):\n\n`);

    for (const entry of summary.plan) {
      process.stdout.write(`  ${entry.parcelExternalId}\n`);
      process.stdout.write(`    county ${entry.county}  apn ${entry.apn}  score ${entry.score}\n`);
      process.stdout.write(`    why: ${entry.reasonPromoted}\n`);

      if (dryRun) {
        process.stdout.write(
          `    property: ${JSON.stringify(entry.propertyPayload)}\n` +
            `    person:   ${JSON.stringify(entry.personPayload)}\n`,
        );
      }

      process.stdout.write('\n');
    }
  }

  for (const failure of summary.failures) {
    process.stderr.write(`FAILED ${failure.parcelExternalId}: ${failure.error}\n`);
  }

  return summary.failed > 0 ? 1 : 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePool();
}
