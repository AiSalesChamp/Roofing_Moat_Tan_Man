import { createHash } from 'node:crypto';

// UUID v5 (RFC 4122, SHA-1 name-based). Implemented rather than added as a
// dependency because the engine needs exactly this one function, and it must
// produce byte-identical output to the `uuid` package that the rest of the fork's
// integrations use — otherwise the same parcel would get two different Twenty ids.
const parseUuid = (uuid: string): Uint8Array => {
  const hex = uuid.replace(/-/g, '');

  if (hex.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(`Invalid UUID namespace: ${uuid}`);
  }

  const bytes = new Uint8Array(16);

  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
};

const formatUuid = (bytes: Uint8Array): string => {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

export const uuidV5 = (name: string, namespace: string): string => {
  const namespaceBytes = parseUuid(namespace);
  const nameBytes = Buffer.from(name, 'utf8');
  const digest = createHash('sha1')
    .update(Buffer.concat([Buffer.from(namespaceBytes), nameBytes]))
    .digest();

  const bytes = new Uint8Array(digest.subarray(0, 16));

  // Version 5 in the high nibble of byte 6, RFC 4122 variant in byte 8.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  return formatUuid(bytes);
};
