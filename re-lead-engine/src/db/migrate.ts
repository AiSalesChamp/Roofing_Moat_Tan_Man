import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256Hex } from '../lib/hash.ts';
import { createLogger } from '../lib/logger.ts';
import { closePool, pool } from './pool.ts';
import { seedPhase0Counties, seedPhase0DataSources } from './seed.ts';

const logger = createLogger('migrate');

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations');

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
};

export const runMigrations = async (): Promise<void> => {
  await ensureMigrationsTable();

  const applied = new Map(
    (
      await pool.query<{ filename: string; checksum: string }>(
        'SELECT filename, checksum FROM schema_migrations',
      )
    ).rows.map((row) => [row.filename, row.checksum]),
  );

  const files = readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const sql = readFileSync(join(migrationsDirectory, filename), 'utf8');
    const checksum = sha256Hex(sql);
    const previousChecksum = applied.get(filename);

    if (previousChecksum === checksum) {
      continue;
    }

    // An already-applied migration whose contents changed means someone edited
    // history. Refuse rather than guess which version the database actually holds.
    if (previousChecksum !== undefined) {
      throw new Error(
        `Migration ${filename} was already applied but its contents changed. ` +
          'Add a new migration instead of editing an applied one.',
      );
    }

    logger.info('applying migration', { filename });

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('migration failed', { filename, error: String(error) });
      throw error;
    } finally {
      client.release();
    }
  }

  await seedPhase0Counties();
  await seedPhase0DataSources();

  logger.info('migrations up to date', { count: files.length });
};

if (import.meta.filename === process.argv[1]) {
  try {
    await runMigrations();
  } finally {
    await closePool();
  }
}
