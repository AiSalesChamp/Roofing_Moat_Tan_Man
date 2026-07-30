import { normalizeCountyName } from '../config/counties.ts';
import { query } from '../db/pool.ts';

// County names arrive as free text from every source ("TARRANT", "Tarrant County",
// "Van Zandt", "VANZANDT"). FIPS is the only stable key, so resolution happens once
// at ingest and nothing downstream ever joins on a name.

let cache: Map<string, string> | undefined;

export const loadCountyCache = async (): Promise<Map<string, string>> => {
  if (cache !== undefined) {
    return cache;
  }

  const rows = await query<{ fips: string; name_normalized: string }>(
    'SELECT fips, name_normalized FROM counties',
  );

  cache = new Map(rows.map((row) => [row.name_normalized, row.fips]));

  return cache;
};

export const resolveCountyFips = async (
  countyName: string | undefined,
): Promise<string | undefined> => {
  if (countyName === undefined || countyName.trim() === '') {
    return undefined;
  }

  const lookup = await loadCountyCache();

  return lookup.get(normalizeCountyName(countyName));
};

export const clearCountyCache = (): void => {
  cache = undefined;
};
