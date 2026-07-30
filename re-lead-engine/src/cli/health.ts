import { closePool } from '../db/pool.ts';
import { runHealthChecks } from '../health/check.ts';
import { flagBool, parseArgs } from '../lib/args.ts';

const SYMBOLS = { ok: ' ok ', warn: 'WARN', fail: 'FAIL' } as const;

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  // Probing hits the live sources, so it is opt-in: a health check run every five
  // minutes should not also be a crawler.
  const probeSources = flagBool(args, 'probe');

  const { results, worst } = await runHealthChecks({ probeSources });

  process.stdout.write('\n');

  for (const result of results) {
    process.stdout.write(
      `[${SYMBOLS[result.severity]}] ${result.name.padEnd(34)} ${result.message}\n`,
    );
  }

  process.stdout.write(`\noverall: ${worst.toUpperCase()}\n`);

  if (!probeSources) {
    process.stdout.write('(run with --probe to also assert live source schemas)\n');
  }

  // Non-zero on fail so a cron wrapper or a monitor can alert. Nothing is repaired.
  return worst === 'fail' ? 1 : 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePool();
}
