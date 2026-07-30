import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { ExtractionStatus } from '../adapters/types.ts';

const execFileAsync = promisify(execFile);

// Requires poppler-utils (`pdftotext`). Deterministic text extraction only — no
// OCR and no model. -layout preserves column spacing, which is what makes table
// row reconstruction possible at all.
export const isPdfToTextAvailable = async (): Promise<boolean> => {
  try {
    await execFileAsync('pdftotext', ['-v'], { timeout: 10_000 });

    return true;
  } catch {
    return false;
  }
};

export type PdfExtraction = {
  text: string;
  status: ExtractionStatus;
  reason: string | undefined;
};

const MONEY_PATTERN = /\$[\d,]+\.\d{2}/g;
const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;

// A scanned sale list still yields *some* text — just wrong text. The Dallas
// August 2026 list extracts as "PALLAS SRUNTYSALES FOR AUGUST29", which would
// parse into confident nonsense.
//
// The discriminator is structure, not spelling: a real sale table always contains
// dollar amounts in accounting format. Bad OCR mangles letters but rarely
// produces well-formed "$51,840.00" strings, and never many of them.
const classifyExtraction = (text: string): { status: ExtractionStatus; reason?: string } => {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { status: 'empty', reason: 'no text layer' };
  }

  if (trimmed.length < 400) {
    return { status: 'needs_ocr', reason: `text layer too short (${trimmed.length} chars)` };
  }

  const moneyCount = (trimmed.match(MONEY_PATTERN) ?? []).length;
  const dateCount = (trimmed.match(DATE_PATTERN) ?? []).length;

  if (moneyCount === 0 && dateCount === 0) {
    return {
      status: 'needs_ocr',
      reason: 'no currency or date tokens found — text layer is probably OCR noise',
    };
  }

  return { status: 'ok' };
};

// PBFCM's index links to files that no longer exist, and the server answers those
// with a 404 HTML page rather than an error status the fetch layer would surface.
// Feeding that to pdftotext produced 80 lines of "Illegal character in hex string"
// per file — so check the magic bytes first and say plainly what arrived.
const PDF_MAGIC = '%PDF';

export const extractPdfText = async (bytes: Uint8Array): Promise<PdfExtraction> => {
  const header = new TextDecoder().decode(bytes.subarray(0, 5));

  if (!header.startsWith(PDF_MAGIC)) {
    const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(header);

    return {
      text: '',
      status: 'parse_failed',
      reason: looksLikeHtml
        ? 'server returned an HTML page instead of a PDF (link is probably dead)'
        : `not a PDF (magic bytes: ${JSON.stringify(header)})`,
    };
  }

  const directory = await mkdtemp(join(tmpdir(), 're-lead-engine-pdf-'));
  const filePath = join(directory, 'source.pdf');

  try {
    await writeFile(filePath, bytes);

    const { stdout } = await execFileAsync(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', filePath, '-'],
      { timeout: 120_000, maxBuffer: 64 * 1024 * 1024 },
    );

    const classification = classifyExtraction(stdout);

    return {
      text: stdout,
      status: classification.status,
      reason: classification.reason,
    };
  } catch (error) {
    // pdftotext prints one warning per malformed byte. Truncated so a single bad
    // file cannot bury the rest of the run's log.
    return { text: '', status: 'parse_failed', reason: String(error).slice(0, 300) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
