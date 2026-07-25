import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// The SDK's manifestValidate collects every `universalIdentifier` in the
// manifest into one flat list and rejects the build on a duplicate or on any
// value that is not a v4+ UUID. Select option `id`s are not covered by that
// check but land in a metadata jsonb column and are expected to be UUIDs too.
// This test catches both classes at source level, before a publish round-trip.

const SOURCE_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Matches `universalIdentifier: '<literal>'` and `id: '<literal>'`. Backticks
// get their own alternative because the interpolated form embeds quotes
// (`${String(index).padStart(12, '0')}`) that would truncate a shared class.
const IDENTIFIER_PATTERN =
  /\b(universalIdentifier|id):\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g;

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    if (entry === 'node_modules' || entry === 'dist') return [];

    const fullPath = join(directory, entry);

    if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);

    // .tsx included: front components declare identifiers too.
    return /\.tsx?$/.test(fullPath) && !fullPath.endsWith('.test.ts')
      ? [fullPath]
      : [];
  });

type FoundIdentifier = { key: string; value: string; location: string };

const collectIdentifiers = (): FoundIdentifier[] => {
  const found: FoundIdentifier[] = [];

  for (const filePath of collectSourceFiles(SOURCE_ROOT)) {
    const relativePath = filePath.slice(SOURCE_ROOT.length + 1);

    readFileSync(filePath, 'utf8')
      .split('\n')
      .forEach((line, lineIndex) => {
        for (const match of line.matchAll(IDENTIFIER_PATTERN)) {
          found.push({
            key: match[1],
            value: match[2] ?? match[3] ?? match[4],
            location: `${relativePath}:${lineIndex + 1}`,
          });
        }
      });
  }

  return found;
};

// `${String(index).padStart(12, '0')}` expands to a 12-digit hex run, so
// substituting a concrete index makes the literal checkable as a real UUID.
const resolveTemplate = (value: string): string =>
  value.replace(/\$\{[^}]*\}/g, '000000000000');

const isUuidShaped = (value: string): boolean =>
  UUID_PATTERN.test(resolveTemplate(value));

// Anything that is not UUID-shaped and has no interpolation is a plain string
// key (GraphQL selection keys, config discriminators) rather than an entity id.
const looksLikeEntityIdentifier = (found: FoundIdentifier): boolean =>
  found.key === 'universalIdentifier' || /^[0-9a-zA-Z]{8}-/.test(found.value);

test('every universalIdentifier and select option id is a valid v4+ UUID', () => {
  const invalid = collectIdentifiers()
    .filter(looksLikeEntityIdentifier)
    .filter((found) => !isUuidShaped(found.value))
    .map((found) => `${found.location}  ${found.key}: ${found.value}`);

  assert.deepEqual(invalid, []);
});

test('no two entities share a universalIdentifier', () => {
  const locationsByIdentifier = new Map<string, string[]>();

  for (const found of collectIdentifiers()) {
    if (found.key !== 'universalIdentifier') continue;

    const key = resolveTemplate(found.value);

    locationsByIdentifier.set(key, [
      ...(locationsByIdentifier.get(key) ?? []),
      found.location,
    ]);
  }

  const duplicates = [...locationsByIdentifier.entries()]
    .filter(([, locations]) => locations.length > 1)
    .map(([identifier, locations]) => `${identifier} @ ${locations.join(', ')}`);

  assert.deepEqual(duplicates, []);
});

test('no two select fields share a select option id', () => {
  const locationsByOptionId = new Map<string, string[]>();

  for (const found of collectIdentifiers()) {
    if (found.key !== 'id' || !looksLikeEntityIdentifier(found)) continue;

    // Template ids differ only by the interpolated index, so compare on the
    // shared prefix — two fields must never reuse the same prefix.
    const key = found.value.replace(/\$\{[^}]*\}/g, '*');

    locationsByOptionId.set(key, [
      ...(locationsByOptionId.get(key) ?? []),
      found.location,
    ]);
  }

  const duplicates = [...locationsByOptionId.entries()]
    .filter(([, locations]) => {
      const files = new Set(locations.map((location) => location.split(':')[0]));

      return files.size > 1 || locations.length > 1;
    })
    .map(([optionId, locations]) => `${optionId} @ ${locations.join(', ')}`);

  assert.deepEqual(duplicates, []);
});
