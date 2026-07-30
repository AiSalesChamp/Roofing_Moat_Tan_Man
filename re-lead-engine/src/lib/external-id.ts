import { shortHash } from './hash.ts';

// Deterministic, human-readable external IDs. Two properties matter:
//
// 1. Deterministic — the same real-world thing always produces the same ID, so
//    promotion is an upsert and re-running it creates no duplicates.
// 2. Readable — "tx-48439-440917" in a Twenty record tells you the county and
//    parcel at a glance. An opaque UUID would need a database round trip to explain.

export const parcelExternalId = (countyFips: string, apnNormalized: string): string =>
  `tx-${countyFips}-${apnNormalized}`;

// Owners have no natural key, so identity is (normalized name + where mail goes).
// Hashed because the mailing address is personal data and the ID travels to Twenty.
export const ownerExternalId = (nameNormalized: string, mailingFingerprint: string): string =>
  `own-${shortHash(`${nameNormalized}::${mailingFingerprint}`)}`;

// A distress event's identity is the document, not the parcel: one parcel can have
// a 2024 and a 2025 tax sale, and both must survive as separate rows.
export const distressEventExternalId = (input: {
  sourceName: string;
  countyFips: string | undefined;
  type: string;
  eventDate: string | undefined;
  sourceDocRef: string | undefined;
  apnNormalized: string | undefined;
}): string => {
  const discriminator =
    input.sourceDocRef ?? `${input.apnNormalized ?? 'noapn'}-${input.eventDate ?? 'nodate'}`;

  return `de-${input.sourceName}-${input.countyFips ?? 'unk'}-${input.type}-${shortHash(discriminator, 12)}`;
};
