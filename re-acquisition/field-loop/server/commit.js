// Confirmed-draft → Twenty CRM commit.
//
// Both kinds route through the runner's writer module — the single authority
// for CRM writes and deterministic ids — so a memo and a call about the same
// parcel land on the same Property.
//
// Without TWENTY_API_KEY the commit is SKIPPED (not failed): the loop and the
// eval log still work end-to-end in dev; the skip is recorded on the draft.

import {
  TwentyWriter,
  writeSiteMemoExtraction,
} from '../../acquisition-voice/runner/twenty-writer.js';

export function twentyConfigured(env = process.env) {
  return Boolean(env.TWENTY_API_KEY);
}

export async function commitDraft(draft, { env = process.env, writerFactory } = {}) {
  if (!twentyConfigured(env)) {
    return {
      skipped: true,
      reason: 'TWENTY_API_KEY not configured — draft resolved locally, no CRM write',
    };
  }
  const writer = writerFactory
    ? writerFactory()
    : new TwentyWriter({ apiUrl: env.TWENTY_API_URL, apiKey: env.TWENTY_API_KEY });
  const extraction = draft.finalExtraction || draft.extraction;

  if (draft.kind === 'seller-call') {
    const result = await writer.writeSellerCallExtraction(extraction, draft.transcript || '');
    return { skipped: false, ...result };
  }
  if (draft.kind === 'site-memo') {
    const result = await writeSiteMemoExtraction(writer, extraction, draft.transcript || '');
    return { skipped: false, ...result };
  }
  throw new Error(`Unsupported draft kind: ${draft.kind}`);
}
