import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

import { createLogger } from '../../lib/logger.ts';
import { guessFieldForHeader } from './layouts.ts';
import {
  canonicalizeHeader,
  REQUIRED_ROLL_FIELDS,
  type RollFieldName,
  type RollLayout,
  type RollRow,
} from './types.ts';

const logger = createLogger('roll-reader');

// Rolls run to millions of rows. Streamed line by line so memory stays flat
// regardless of county size — loading Harris into an array would not fit.
const readLines = (filePath: string, encoding: 'utf8' | 'latin1') =>
  createInterface({
    input: createReadStream(filePath, { encoding }),
    crlfDelay: Infinity,
  });

// Minimal RFC 4180 splitter: handles quoted fields containing the delimiter and
// escaped double quotes. Written out rather than pulled in because a CSV
// dependency would still need this exact behaviour verified.
const splitDelimited = (line: string, delimiter: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  fields.push(current);

  return fields.map((field) => field.trim());
};

export type RollInspection = {
  delimiter: string;
  headers: readonly string[];
  guessedColumns: Partial<Record<RollFieldName, string>>;
  unmappedHeaders: readonly string[];
  missingRequiredFields: readonly RollFieldName[];
  sampleRow: Record<string, string>;
};

const DELIMITER_CANDIDATES = [',', '\t', '|'] as const;

const detectDelimiter = (headerLine: string): string => {
  let best = ',';
  let bestCount = 0;

  for (const candidate of DELIMITER_CANDIDATES) {
    const count = headerLine.split(candidate).length;

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
};

// Prints what a real file actually contains so a layout can be written from
// evidence instead of assumption.
export const inspectRoll = async (
  filePath: string,
  encoding: 'utf8' | 'latin1' = 'utf8',
): Promise<RollInspection> => {
  const lines = readLines(filePath, encoding);
  let headerLine: string | undefined;
  let firstDataLine: string | undefined;

  for await (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    if (headerLine === undefined) {
      headerLine = line;
      continue;
    }

    firstDataLine = line;
    break;
  }

  lines.close();

  if (headerLine === undefined) {
    throw new Error(`${filePath} is empty`);
  }

  const delimiter = detectDelimiter(headerLine);
  const headers = splitDelimited(headerLine, delimiter);
  const values = firstDataLine === undefined ? [] : splitDelimited(firstDataLine, delimiter);

  const guessedColumns: Partial<Record<RollFieldName, string>> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const field = guessFieldForHeader(header);

    if (field === undefined) {
      unmappedHeaders.push(header);
      continue;
    }

    // First header to claim a field keeps it; later duplicates are reported as
    // unmapped so the ambiguity is visible rather than silently resolved.
    if (guessedColumns[field] === undefined) {
      guessedColumns[field] = header;
    } else {
      unmappedHeaders.push(header);
    }
  }

  const sampleRow: Record<string, string> = {};

  headers.forEach((header, index) => {
    sampleRow[header] = values[index] ?? '';
  });

  return {
    delimiter,
    headers,
    guessedColumns,
    unmappedHeaders,
    missingRequiredFields: REQUIRED_ROLL_FIELDS.filter(
      (field) => guessedColumns[field] === undefined,
    ),
    sampleRow,
  };
};

// Builds a layout from the file's own header row using the same guesses --inspect
// prints. Opt-in via --auto-layout, and it refuses when a required field cannot be
// identified — a roll loaded under a wrong guess would silently mis-assign owners.
export const deriveLayoutFromFile = async (
  filePath: string,
  countyFips: string,
  rollYear: number,
): Promise<RollLayout> => {
  const inspection = await inspectRoll(filePath);

  if (inspection.missingRequiredFields.length > 0) {
    throw new Error(
      `--auto-layout cannot map required field(s): ${inspection.missingRequiredFields.join(', ')}. ` +
        `Run with --inspect and add an explicit layout to layouts.ts.`,
    );
  }

  logger.warn('using auto-derived layout', {
    filePath,
    countyFips,
    mapped: inspection.guessedColumns,
  });

  return {
    layoutId: `auto:${countyFips}`,
    countyFips,
    rollYear,
    encoding: 'utf8',
    skipRows: 0,
    excludeLandUseCodes: [],
    spec: {
      kind: 'delimited',
      delimiter: inspection.delimiter as ',' | '\t' | '|',
      hasHeaderRow: true,
      columns: inspection.guessedColumns,
    },
  };
};

export type RollReadResult = {
  rowsRead: number;
  rowsRejected: number;
};

export const readRollRows = async (
  filePath: string,
  layout: RollLayout,
  onRow: (row: RollRow, lineNumber: number) => Promise<void>,
): Promise<RollReadResult> => {
  if (layout.spec.kind === 'fixed_width') {
    return readFixedWidth(filePath, layout, onRow);
  }

  const spec = layout.spec;
  const lines = readLines(filePath, layout.encoding);

  let lineNumber = 0;
  let rowsRead = 0;
  let rowsRejected = 0;
  let indexByField: Partial<Record<RollFieldName, number>> = spec.columnIndexes ?? {};
  let headerSeen = !spec.hasHeaderRow;

  for await (const line of lines) {
    lineNumber += 1;

    if (lineNumber <= layout.skipRows || line.trim() === '') {
      continue;
    }

    if (!headerSeen) {
      const headers = splitDelimited(line, spec.delimiter).map(canonicalizeHeader);
      indexByField = {};

      for (const [field, headerName] of Object.entries(spec.columns) as [
        RollFieldName,
        string,
      ][]) {
        const position = headers.indexOf(canonicalizeHeader(headerName));

        if (position === -1) {
          throw new Error(
            `Layout ${layout.layoutId} expects column "${headerName}" for ${field}, ` +
              `but the file's header row does not contain it. Re-run with --inspect.`,
          );
        }

        indexByField[field] = position;
      }

      headerSeen = true;
      continue;
    }

    const fields = splitDelimited(line, spec.delimiter);
    const row: RollRow = {};

    for (const [field, position] of Object.entries(indexByField) as [RollFieldName, number][]) {
      const value = fields[position];

      if (value !== undefined && value !== '') {
        row[field] = value;
      }
    }

    if (REQUIRED_ROLL_FIELDS.some((field) => row[field] === undefined)) {
      rowsRejected += 1;
      continue;
    }

    if (row.landUseCode !== undefined && layout.excludeLandUseCodes.includes(row.landUseCode)) {
      rowsRejected += 1;
      continue;
    }

    await onRow(row, lineNumber);
    rowsRead += 1;
  }

  logger.info('roll read complete', { filePath, rowsRead, rowsRejected });

  return { rowsRead, rowsRejected };
};

const readFixedWidth = async (
  filePath: string,
  layout: RollLayout,
  onRow: (row: RollRow, lineNumber: number) => Promise<void>,
): Promise<RollReadResult> => {
  if (layout.spec.kind !== 'fixed_width') {
    throw new Error('readFixedWidth called with a delimited layout');
  }

  const { fields } = layout.spec;
  const lines = readLines(filePath, layout.encoding);

  let lineNumber = 0;
  let rowsRead = 0;
  let rowsRejected = 0;

  for await (const line of lines) {
    lineNumber += 1;

    if (lineNumber <= layout.skipRows || line.trim() === '') {
      continue;
    }

    const row: RollRow = {};

    for (const [field, span] of Object.entries(fields) as [
      RollFieldName,
      readonly [number, number],
    ][]) {
      const value = line.slice(span[0], span[0] + span[1]).trim();

      if (value !== '') {
        row[field] = value;
      }
    }

    if (REQUIRED_ROLL_FIELDS.some((field) => row[field] === undefined)) {
      rowsRejected += 1;
      continue;
    }

    await onRow(row, lineNumber);
    rowsRead += 1;
  }

  logger.info('fixed-width roll read complete', { filePath, rowsRead, rowsRejected });

  return { rowsRead, rowsRejected };
};
