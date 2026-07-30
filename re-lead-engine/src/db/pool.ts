import pg from 'pg';

import { env } from '../config/env.ts';

// numeric/int8 come back as strings by default because they can exceed JS number
// range. Acreage and dollar values here are safely in range, and silently
// receiving "12.5000" where a number was expected is a worse bug than the overflow
// this guards against — so parse them, explicitly and in one place.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 8,
  idleTimeoutMillis: 10_000,
});

export const query = async <TRow extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<TRow[]> => {
  const result = await pool.query<TRow>(sql, params as unknown[]);

  return result.rows;
};

export const queryOne = async <TRow extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<TRow | undefined> => {
  const rows = await query<TRow>(sql, params);

  return rows[0];
};

export const withTransaction = async <TResult>(
  handler: (client: pg.PoolClient) => Promise<TResult>,
): Promise<TResult> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};
