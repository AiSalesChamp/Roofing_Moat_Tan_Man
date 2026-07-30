// Skip trace is an interface with a stub behind it in Phase 0.
//
// Mail-only outbound needs no phone number: the appraisal roll already supplies a
// deliverable mailing address. Phones only matter once phone/SMS turn on, and those
// stay off until Texas SB 140 telemarketer registration is confirmed — so wiring a
// paid vendor now would spend money on data that cannot legally be used yet.

export type SkipTraceStatus = 'pending' | 'hit' | 'no_hit' | 'failed' | 'skipped_suppressed';

export type SkipTracePhone = {
  number: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  confidence: number;
  // Vendors flag numbers belonging to known TCPA litigators. Present here so the
  // scrub hook has something to read even before a real vendor is connected.
  isLitigator: boolean;
  isDncListed: boolean;
};

export type SkipTraceRequest = {
  ownerId: string;
  ownerName: string;
  mailingStreet: string | undefined;
  mailingCity: string | undefined;
  mailingState: string | undefined;
  mailingPostcode: string | undefined;
};

export type SkipTraceResponse = {
  status: SkipTraceStatus;
  confidence: number | undefined;
  phones: readonly SkipTracePhone[];
  emails: readonly string[];
  costCents: number | undefined;
  raw: Record<string, unknown>;
};

export type SkipTraceVendor = {
  name: string;
  // False for the stub. The runner refuses to record provenance for a vendor that
  // did not actually supply anything.
  isLive: boolean;
  trace: (request: SkipTraceRequest) => Promise<SkipTraceResponse>;
};
