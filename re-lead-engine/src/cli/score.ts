import { env } from '../config/env.ts';
import { closePool, query } from '../db/pool.ts';
import { flagInt, parseArgs } from '../lib/args.ts';
import { scoreAllParcels } from '../score/motivation.ts';

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const lookback = flagInt(args, 'lookback') ?? env.promotion.lookbackDays;

  const result = await scoreAllParcels(lookback);

  process.stdout.write(`\nScored ${result.scored} parcel(s) with weights ${result.version}\n\n`);

  // Distribution, not just a count: a scoring run where every parcel lands on the
  // same value means the rules are not discriminating and the threshold is arbitrary.
  //
  // width_bucket is 1-indexed, so the label subtracts one. Getting this wrong once
  // already made a 50-59 population look like 60-69 and hid the fact that nothing
  // could clear the configured threshold.
  const buckets = await query<{ bucket: string; count: number }>(
    `SELECT ((width_bucket(score, 0, 100, 10) - 1) * 10) || '-' ||
            ((width_bucket(score, 0, 100, 10) - 1) * 10 + 9) AS bucket,
            count(*)::int AS count
       FROM lead_scores_latest
      GROUP BY width_bucket(score, 0, 100, 10)
      ORDER BY width_bucket(score, 0, 100, 10)`,
  );

  const stats = await query<{ min: number; max: number; avg: number; at_or_above: number }>(
    `SELECT min(score)::int AS min, max(score)::int AS max, round(avg(score))::int AS avg,
            count(*) FILTER (WHERE score >= $1)::int AS at_or_above
       FROM lead_scores_latest`,
    [env.promotion.minScore],
  );

  const stat = stats[0];

  if (stat !== undefined) {
    process.stdout.write(
      `min ${stat.min}  max ${stat.max}  avg ${stat.avg}  ` +
        `at/above PROMOTION_MIN_SCORE(${env.promotion.minScore}): ${stat.at_or_above}\n\n`,
    );

    // The threshold has to be reachable by the rules that actually have a data
    // source. If it is not, every parcel is withheld for the same reason and the
    // withhold log says "tune the threshold" rather than "the source is missing".
    if (stat.at_or_above === 0 && stat.max > 0) {
      process.stdout.write(
        `WARNING: no parcel reaches PROMOTION_MIN_SCORE (${env.promotion.minScore}); ` +
          `the highest score is ${stat.max}.\n` +
          '         Rules with no Phase 0 data source cannot contribute — see README\n' +
          '         "known signal gaps". Lower PROMOTION_MIN_SCORE or add a source.\n\n',
      );
    }
  }

  if (buckets.length > 0) {
    process.stdout.write('Score distribution:\n');

    for (const bucket of buckets) {
      process.stdout.write(
        `  ${bucket.bucket.padStart(7)}  ${'#'.repeat(Math.min(50, bucket.count))} ${bucket.count}\n`,
      );
    }

    process.stdout.write('\n');
  }

  const topRules = await query<{ rule: string; parcels: number }>(
    `SELECT key AS rule, count(*)::int AS parcels
       FROM lead_scores_latest, jsonb_each(breakdown)
      WHERE key <> '__rawScore'
      GROUP BY key
      ORDER BY count(*) DESC`,
  );

  if (topRules.length > 0) {
    process.stdout.write('Rules firing:\n');

    for (const rule of topRules) {
      process.stdout.write(`  ${String(rule.parcels).padStart(7)}  ${rule.rule}\n`);
    }

    process.stdout.write('\n');
  }

  return 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePool();
}
