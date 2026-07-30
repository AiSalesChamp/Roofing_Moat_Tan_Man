import { readFileSync } from 'node:fs';

import { normalizeCountyName } from '../config/counties.ts';
import { closePool, queryOne } from '../db/pool.ts';
import { flagString, parseArgs } from '../lib/args.ts';
import { createLogger } from '../lib/logger.ts';

const logger = createLogger('fips-load');

const USAGE = `
Usage:
  yarn fips:load --file=<national_county.txt> [--state=48]

Loads authoritative county FIPS codes, replacing the hand-entered seed values in
src/config/counties.ts. Get the file from the Census Bureau:

  https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt

Format (headerless CSV): STATE,STATEFP,COUNTYFP,COUNTYNAME,CLASSFP
  TX,48,001,Anderson County,H1

Until this runs, only the ten seeded Phase 0 counties resolve, and events from any
other county are stored with match_status = 'unmatched_county'.
`;

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const file = flagString(args, 'file');
  const stateFips = flagString(args, 'state') ?? '48';

  if (file === undefined) {
    process.stdout.write(`${USAGE}\n`);

    return 1;
  }

  const lines = readFileSync(file, 'utf8').split('\n');
  let loaded = 0;
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.toUpperCase().startsWith('STATE,')) {
      continue;
    }

    const parts = trimmed.split(',');
    const fileStateFips = parts[1]?.trim();
    const countyFips = parts[2]?.trim();
    const countyName = parts[3]?.trim();

    if (fileStateFips === undefined || countyFips === undefined || countyName === undefined) {
      skipped += 1;
      continue;
    }

    if (fileStateFips !== stateFips) {
      continue;
    }

    const cleanName = countyName.replace(/\s+County$/i, '');

    // Existing rows keep their is_phase0_target and cad_name — the Census file is
    // authoritative for codes and names only, not for our operational flags.
    await queryOne(
      `INSERT INTO counties (fips, state_fips, name, name_normalized)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (fips) DO UPDATE SET
         name = EXCLUDED.name,
         name_normalized = EXCLUDED.name_normalized`,
      [`${fileStateFips}${countyFips}`, fileStateFips, cleanName, normalizeCountyName(cleanName)],
    );

    loaded += 1;
  }

  logger.info('fips load complete', { loaded, skipped, stateFips });
  process.stdout.write(`Loaded ${loaded} counties for state ${stateFips} (${skipped} bad rows)\n`);

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
