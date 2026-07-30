import { distressEventExternalId } from '../../lib/external-id.ts';
import { sha256Hex } from '../../lib/hash.ts';
import { politeFetch } from '../../lib/http/polite-client.ts';
import { createLogger } from '../../lib/logger.ts';
import { extractPdfText } from '../../lib/pdf.ts';
import { normalizeAddress } from '../../normalize/address.ts';
import { normalizeApn } from '../../normalize/apn.ts';
import { resolveCountyFips } from '../../normalize/county.ts';
import type {
  DiscoveredTarget,
  DistressAdapter,
  DistressEventType,
  FetchedTarget,
  NormalizedDistressEvent,
} from '../types.ts';

const logger = createLogger('adapter:pbfcm');

const BASE_URL = 'https://www.pbfcm.com';
const SALE_INDEX = `${BASE_URL}/taxsale.html`;
const RESALE_INDEX = `${BASE_URL}/taxresale.html`;

// Sale lists are published as per-county PDFs whose filenames encode the sale
// month: "07-2026galvestontaxsale.pdf". Resale lists have no date in the name
// because struck-off inventory is a standing list, not an event.
const SALE_LINK_PATTERN = /docs\/taxdocs\/sales\/([^"']+\.pdf)/gi;
const RESALE_LINK_PATTERN = /docs\/taxdocs\/resales\/([^"']+\.pdf)/gi;
const SALE_FILENAME_PATTERN = /^(\d{2})-(\d{4})(.+?)taxsale(?:special)?\.pdf$/i;
const RESALE_FILENAME_PATTERN = /^(.+?)taxresale\.pdf$/i;

// Filenames compress county names. Left as an explicit table because guessing
// wrong silently files a sale under the wrong county.
const COUNTY_FILENAME_ALIASES: Record<string, string> = {
  ftbend: 'fort bend',
  fortbend: 'fort bend',
  vanzandt: 'van zandt',
  palopinto: 'palo pinto',
  jeffdavis: 'jeff davis',
  deafsmith: 'deaf smith',
  redriver: 'red river',
  sanpatricio: 'san patricio',
  sanjacinto: 'san jacinto',
  sanaugustine: 'san augustine',
  sansaba: 'san saba',
  tomgreen: 'tom green',
  valverde: 'val verde',
  wichitafalls: 'wichita',
  liveoak: 'live oak',
  laSalle: 'la salle',
  lasalle: 'la salle',
  elpaso: 'el paso',
};

const cleanCountyToken = (token: string): string => {
  const lowered = token
    .toLowerCase()
    // Strip precinct qualifiers ("harrispct1") and the redundant "county" suffix.
    .replace(/pct\d+$/, '')
    .replace(/precinct\d+$/, '')
    .replace(/county$/, '')
    .replace(/isd$/, '')
    .replace(/cityof/, '')
    .replace(/[^a-z]/g, '');

  return COUNTY_FILENAME_ALIASES[lowered] ?? lowered;
};

// Bound the crawl. Sale indexes carry years of history; re-reading 2023 lists
// every month is pointless load on someone else's server.
const SALE_LOOKBACK_MONTHS = 12;

const isRecentSale = (month: number, year: number, now: Date): boolean => {
  const saleMonths = year * 12 + (month - 1);
  const nowMonths = now.getUTCFullYear() * 12 + now.getUTCMonth();

  // Future sales are always in scope — those are the actionable ones.
  return saleMonths >= nowMonths - SALE_LOOKBACK_MONTHS;
};

const discoverFromIndex = async (
  indexUrl: string,
  pattern: RegExp,
  kind: 'sale' | 'resale',
): Promise<DiscoveredTarget[]> => {
  const response = await politeFetch(indexUrl, { accept: 'text/html' });
  const now = new Date();
  const targets: DiscoveredTarget[] = [];
  const seen = new Set<string>();
  let skippedStale = 0;

  for (const match of response.body.matchAll(pattern)) {
    const filename = match[1];

    if (filename === undefined || seen.has(filename)) {
      continue;
    }

    seen.add(filename);

    const url = `${BASE_URL}/docs/taxdocs/${kind === 'sale' ? 'sales' : 'resales'}/${filename}`;

    if (kind === 'sale') {
      const parsedName = SALE_FILENAME_PATTERN.exec(filename);

      if (parsedName === null) {
        logger.warn('unparsed sale filename', { filename });
        continue;
      }

      const month = Number.parseInt(parsedName[1] ?? '', 10);
      const year = Number.parseInt(parsedName[2] ?? '', 10);

      if (!isRecentSale(month, year, now)) {
        skippedStale += 1;
        continue;
      }

      targets.push({
        id: `pbfcm-sale-${filename}`,
        url,
        label: `PBFCM sale ${parsedName[1]}-${parsedName[2]} ${parsedName[3]}`,
        countyNameRaw: cleanCountyToken(parsedName[3] ?? ''),
        meta: { kind, filename, saleMonth: month, saleYear: year },
      });

      continue;
    }

    const parsedResale = RESALE_FILENAME_PATTERN.exec(filename);

    if (parsedResale === null) {
      logger.warn('unparsed resale filename', { filename });
      continue;
    }

    targets.push({
      id: `pbfcm-resale-${filename}`,
      url,
      label: `PBFCM resale ${parsedResale[1]}`,
      countyNameRaw: cleanCountyToken(parsedResale[1] ?? ''),
      meta: { kind, filename },
    });
  }

  // Explicit, because a silent cap reads as "we covered everything".
  logger.info('index discovered', {
    indexUrl,
    kept: targets.length,
    skippedOlderThanLookback: skippedStale,
  });

  return targets;
};

const discover = async (): Promise<DiscoveredTarget[]> => {
  const [sales, resales] = await Promise.all([
    discoverFromIndex(SALE_INDEX, SALE_LINK_PATTERN, 'sale'),
    discoverFromIndex(RESALE_INDEX, RESALE_LINK_PATTERN, 'resale'),
  ]);

  return [...sales, ...resales];
};

const fetchTarget = async (target: DiscoveredTarget): Promise<FetchedTarget> => {
  const response = await politeFetch(target.url, {
    accept: 'application/pdf',
    binary: true,
  });

  // The index lists files that have since been removed; those answer 404 with an
  // HTML body. Short-circuit before extraction so the reason recorded is "dead
  // link", not a pile of PDF syntax errors.
  if (response.status >= 400) {
    // Roughly a quarter of the index links are dead. Logged so a rising count is
    // visible as index rot rather than mistaken for counties with empty lists.
    logger.warn('dead index link', { url: target.url, status: response.status });

    return {
      target,
      status: response.status,
      contentType: response.contentType,
      contentHash: sha256Hex(target.url),
      rawText: '',
      extractionStatus: 'parse_failed',
    };
  }

  const extraction = await extractPdfText(response.bodyBytes);

  if (extraction.status !== 'ok') {
    logger.warn('pdf not usable', {
      url: target.url,
      status: extraction.status,
      reason: extraction.reason,
    });
  }

  return {
    target,
    status: response.status,
    contentType: response.contentType,
    contentHash: sha256Hex(Buffer.from(response.bodyBytes).toString('base64')),
    rawText: extraction.text,
    extractionStatus: extraction.status,
  };
};

// Header line: "GALVESTON COUNTY SALES FOR JULY 7, 2026".
const HEADER_DATE_PATTERN =
  /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2}),?\s+(\d{4})\b/i;

const MONTH_NUMBERS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const extractSaleDate = (text: string): string | undefined => {
  const match = HEADER_DATE_PATTERN.exec(text.slice(0, 2000));

  if (match === null) {
    return undefined;
  }

  const month = MONTH_NUMBERS[(match[1] ?? '').toLowerCase()];
  const day = Number.parseInt(match[2] ?? '', 10);
  const year = Number.parseInt(match[3] ?? '', 10);

  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Row segmentation anchors on the MONEY LINE, not on row numbering.
//
// Galveston's list numbers its rows "1.", "2."; Austin County's does not number at
// all. What both have — and what every PBFCM list has, because it is the point of
// the document — is one line per property carrying the adjudged value, the estimated
// minimum bid, and the CAD account number together:
//
//   $44,061.00        $4,570.78     69408001
//
// Every other column (legal description, style of case) wraps across many lines in
// an independent column, so text line breaks say nothing about record boundaries.
// The money line is the only per-record landmark that survives `pdftotext -layout`.
const MONEY_ANCHOR = /\$\s?[\d,]+\.\d{2}/;
const ACCOUNT_ON_ANCHOR = /\b(\d[\d-]{6,}\d)\s*$/;

const findTableStart = (lines: readonly string[]): number => {
  const headerIndex = lines.findIndex((line) => {
    const upper = line.toUpperCase();

    return upper.includes('CAUSE') && (upper.includes('LEGAL') || upper.includes('ACCOUNT'));
  });

  return headerIndex === -1 ? 0 : headerIndex + 1;
};

type RawRow = {
  index: number;
  anchorLine: string;
  // Lines above the anchor, back to the previous anchor: cause number, legal
  // description, and in some layouts the judgment date.
  preText: string;
  // Lines below the anchor, up to the next anchor: property address, and in other
  // layouts the judgment date and the rest of the defendant name.
  postText: string;
};

const segmentRows = (text: string): RawRow[] => {
  const lines = text.split('\n');
  const start = findTableStart(lines);

  const anchorIndexes: number[] = [];

  for (let index = start; index < lines.length; index += 1) {
    if (MONEY_ANCHOR.test(lines[index] ?? '')) {
      anchorIndexes.push(index);
    }
  }

  return anchorIndexes.map((anchorIndex, position) => {
    const previousAnchor = position === 0 ? start - 1 : (anchorIndexes[position - 1] ?? start - 1);
    const nextAnchor = anchorIndexes[position + 1] ?? lines.length;

    return {
      index: position + 1,
      anchorLine: lines[anchorIndex] ?? '',
      preText: lines.slice(previousAnchor + 1, anchorIndex).join('\n'),
      postText: lines.slice(anchorIndex + 1, nextAnchor).join('\n'),
    };
  });
};

const parse = (fetched: FetchedTarget): Record<string, unknown>[] => {
  if (fetched.extractionStatus !== 'ok') {
    return [];
  }

  const saleDate = extractSaleDate(fetched.rawText);
  const rows = segmentRows(fetched.rawText);

  return rows.map((row) => ({ ...row, saleDate }));
};

const MONEY_TOKEN = /\$\s?([\d,]+\.\d{2})/g;
// Two date shapes seen across counties: Galveston writes 10/14/2024, Austin writes
// 14-Apr-26. Both are matched rather than one being assumed.
const SLASH_DATE = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/;
const DASH_MONTH_DATE = /\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})\b/i;
// Cause numbers vary by district clerk: "2023V-0045", "22TX0359", "348-D31780-22".
const CAUSE_NUMBER =
  /\b(\d{4}V-\d{3,}|\d{2}TX\d{3,}|\d{2,3}-[A-Z]?\d{4,}-\d{2,}|\d{2,3}-\d{2,3}-\d{4,}|[A-Z]{1,3}-\d{2}-\d{4,})\b/;
// CAD account numbers appear either as one long digit run or dash-grouped.
const CAD_ACCOUNT = /\b(\d[\d-]{6,}\d)\b/;
const STYLE_OF_CASE = /\bvs\.?\s+([A-Z][A-Za-z .,'&-]{3,}?)(?:,?\s+ET\s+AL\b|\s{2,}|$)/i;

const MONTH_ABBREVIATIONS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const parseMoney = (value: string): number | undefined => {
  const parsed = Number.parseFloat(value.replace(/,/g, ''));

  return Number.isNaN(parsed) ? undefined : parsed;
};

const findJudgmentDate = (...blocks: readonly string[]): string | undefined => {
  for (const block of blocks) {
    const slash = SLASH_DATE.exec(block);

    if (slash?.[1] !== undefined) {
      return toIsoDate(slash[1]);
    }

    const dashed = DASH_MONTH_DATE.exec(block);

    if (dashed !== null) {
      const month = MONTH_ABBREVIATIONS[(dashed[2] ?? '').toLowerCase()];
      const rawYear = dashed[3] ?? '';
      // Two-digit years on these lists are judgment dates, always in the past
      // relative to the sale, so the 2000s are the only sane expansion.
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

      if (month !== undefined) {
        return `${year}-${month}-${(dashed[1] ?? '').padStart(2, '0')}`;
      }
    }
  }

  return undefined;
};

const normalize = async (
  records: Record<string, unknown>[],
  fetched: FetchedTarget,
): Promise<NormalizedDistressEvent[]> => {
  const meta = fetched.target.meta as { kind?: string; filename?: string };
  const isResale = meta.kind === 'resale';
  const type: DistressEventType = isResale ? 'struck_off' : 'tax_sale';
  const countyFips = await resolveCountyFips(fetched.target.countyNameRaw);
  const events: NormalizedDistressEvent[] = [];

  for (const record of records) {
    const row = record as {
      index: number;
      anchorLine: string;
      preText: string;
      postText: string;
      saleDate?: string;
    };

    // Money and account come from the anchor line alone, where they are
    // unambiguous. Everything else is searched in the surrounding window and is
    // therefore best-effort — see `provides` and the README on this limitation.
    const moneyMatches = [...row.anchorLine.matchAll(MONEY_TOKEN)].map((match) => match[1] ?? '');
    const cadAccount =
      ACCOUNT_ON_ANCHOR.exec(row.anchorLine.trimEnd())?.[1] ??
      CAD_ACCOUNT.exec(row.anchorLine)?.[1];

    const window = `${row.preText}\n${row.anchorLine}\n${row.postText}`;
    const collapsed = window.replace(/[ \t]+/g, ' ');

    const judgmentDate = findJudgmentDate(row.preText, row.postText);
    const causeNumber = CAUSE_NUMBER.exec(row.preText)?.[1] ?? CAUSE_NUMBER.exec(collapsed)?.[1];

    // Defendant name is NOT extracted, deliberately.
    //
    // The style-of-case column sits directly beside the legal description column,
    // and `pdftotext -layout` interleaves them on the same text lines. Matching on
    // "vs." therefore reads straight into the neighbouring column and produced
    // values like "MICHELLE OF THE COUNTY CLERK OF AUSTIN" and "TEXAS ACCORDING TO
    // THE PLAT THEREOF" — plausible-looking strings that are not names.
    //
    // A wrong owner name is worse than no owner name: it would flow into `people`
    // and address a letter to a fiction. Owner identity comes from the appraisal
    // roll, which states it in a labelled column. Getting this from the PDF needs
    // column-accurate extraction (`pdftotext -bbox-layout` + x-range assignment),
    // which is Phase 1 work.
    const defendant = undefined;

    // Without an account number there is no join key, so the row cannot become a
    // parcel-linked event no matter what else it contains. Skipped rather than
    // stored as an orphan.
    if (cadAccount === undefined) {
      continue;
    }

    const apnNormalized =
      cadAccount === undefined ? undefined : normalizeApn(cadAccount, countyFips);

    const situs = normalizeAddress({ line: undefined });
    const saleDate = row.saleDate;

    events.push({
      externalId: distressEventExternalId({
        sourceName: 'pbfcm',
        countyFips,
        type,
        eventDate: judgmentDate ?? saleDate,
        // Filename plus item number is stable as long as the list is: the same
        // PDF re-published with the same rows produces the same IDs.
        sourceDocRef: `${meta.filename ?? fetched.target.id}#${cadAccount}`,
        apnNormalized,
      }),
      type,
      countyNameRaw: fetched.target.countyNameRaw,
      countyFips,
      apnRaw: cadAccount,
      apnNormalized,
      // Judgment date is when the distress became legally real; the sale date is
      // when it resolves. Both are kept, and event_date uses the judgment.
      eventDate: judgmentDate ?? saleDate,
      saleDate,
      causeNumber,
      defendantNameRaw: defendant,
      propertyAddressRaw: undefined,
      situs: {
        street: situs.street,
        city: situs.city,
        state: 'TX',
        postcode: situs.postcode,
      },
      adjudgedValue: moneyMatches[0] === undefined ? undefined : parseMoney(moneyMatches[0]),
      minimumBid: moneyMatches[1] === undefined ? undefined : parseMoney(moneyMatches[1]),
      saleStatusRaw: isResale ? 'Available for Resale' : undefined,
      saleNotes: undefined,
      longitude: undefined,
      latitude: undefined,
      sourceName: 'pbfcm',
      sourceUrl: fetched.target.url,
      sourceDocRef: `${meta.filename ?? fetched.target.id}#${cadAccount}`,
      // Reconstructed from a wrapped PDF table rather than read from a field.
      // Deliberately low: the score multiplies by this, so a PBFCM row alone
      // cannot carry a parcel over the promotion gate.
      confidence: 0.7,
      rawPayload: {
        rowIndex: row.index,
        anchorLine: row.anchorLine,
        preText: row.preText,
        postText: row.postText,
      },
    });
  }

  return events;
};

const toIsoDate = (usDate: string): string | undefined => {
  const [month, day, year] = usDate.split('/');

  if (month === undefined || day === undefined || year === undefined) {
    return undefined;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const pbfcmAdapter: DistressAdapter = {
  sourceName: 'pbfcm',
  kind: 'distress_listing',
  provides:
    'Per-county TX tax sale and resale PDFs. RELIABLE: CAD account number, adjudged value, ' +
    'minimum bid, county, sale date. BEST-EFFORT (nearest-match, not column-accurate): ' +
    'cause number, judgment date. NOT extracted: defendant name — the column bleeds into ' +
    'the legal description under -layout, so owner identity comes from the appraisal roll. ' +
    'Dead index links and scanned PDFs are reported, not parsed.',
  discover,
  fetch: fetchTarget,
  parse,
  normalize,
};
