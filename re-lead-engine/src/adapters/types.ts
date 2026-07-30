// Every source implements the same four steps: discover -> fetch -> parse -> normalize.
//
// The split exists so each step can fail and be retried independently. A parse bug
// is fixed and replayed against stored raw text without re-crawling; a fetch failure
// does not lose the discovery work.

export type ExtractionStatus = 'ok' | 'needs_ocr' | 'parse_failed' | 'empty';

export type DiscoveredTarget = {
  // Stable across runs so a target can be correlated between ingests.
  id: string;
  url: string;
  label: string;
  countyNameRaw: string | undefined;
  meta: Record<string, unknown>;
};

export type FetchedTarget = {
  target: DiscoveredTarget;
  status: number;
  contentType: string | undefined;
  contentHash: string;
  // Text form used by parse(). For PDFs this is the extracted text layer.
  rawText: string;
  extractionStatus: ExtractionStatus;
};

export type NormalizedSitus = {
  street: string | undefined;
  city: string | undefined;
  state: string | undefined;
  postcode: string | undefined;
};

export type DistressEventType =
  | 'notice_of_trustee_sale'
  | 'tax_sale'
  | 'struck_off'
  | 'probate'
  | 'lien'
  | 'code_violation';

export type NormalizedDistressEvent = {
  externalId: string;
  type: DistressEventType;

  countyNameRaw: string | undefined;
  countyFips: string | undefined;

  apnRaw: string | undefined;
  apnNormalized: string | undefined;

  eventDate: string | undefined;
  saleDate: string | undefined;

  causeNumber: string | undefined;
  // Present on PBFCM (the defendant in the style of case) and absent on LGBS.
  // This is the only owner-name signal available from the distress layer.
  defendantNameRaw: string | undefined;

  propertyAddressRaw: string | undefined;
  situs: NormalizedSitus;

  adjudgedValue: number | undefined;
  minimumBid: number | undefined;
  saleStatusRaw: string | undefined;
  saleNotes: string | undefined;

  longitude: number | undefined;
  latitude: number | undefined;

  sourceName: string;
  sourceUrl: string;
  sourceDocRef: string | undefined;
  // How much the parse is trusted, 0..1. Structured JSON scores near 1; a value
  // reconstructed from a wrapped PDF table cell scores lower, and the motivation
  // score multiplies by it.
  confidence: number;

  rawPayload: Record<string, unknown>;
};

export type DistressAdapter = {
  sourceName: string;
  kind: 'distress_listing';
  // Human-readable note surfaced by `yarn health` — what this source does and does
  // not provide, so a gap is visible without reading the adapter.
  provides: string;
  discover: () => Promise<DiscoveredTarget[]>;
  fetch: (target: DiscoveredTarget) => Promise<FetchedTarget>;
  parse: (fetched: FetchedTarget) => Record<string, unknown>[];
  normalize: (
    records: Record<string, unknown>[],
    fetched: FetchedTarget,
  ) => Promise<NormalizedDistressEvent[]>;
};
