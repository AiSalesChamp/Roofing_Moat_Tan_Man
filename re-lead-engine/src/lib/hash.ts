import { createHash } from 'node:crypto';

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const shortHash = (value: string, length = 16): string =>
  sha256Hex(value).slice(0, length);

// Contact identifiers are hashed before they land in the suppression table so a
// suppression row can be matched without the table itself becoming a second copy
// of everyone's phone number.
export const hashIdentifier = (value: string): string =>
  sha256Hex(value.trim().toLowerCase());

export const hashPayload = (payload: unknown): string =>
  sha256Hex(JSON.stringify(payload, Object.keys(payload as object).sort()));
