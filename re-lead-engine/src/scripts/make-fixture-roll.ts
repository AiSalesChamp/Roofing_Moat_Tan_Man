import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { closePool, query } from '../db/pool.ts';
import { flagString, parseArgs } from '../lib/args.ts';

// Generates a FIXTURE appraisal roll for end-to-end testing.
//
// Real APNs (taken from already-ingested distress events, so the identity join is
// exercised for real) + SYNTHETIC owner names, mailing addresses and values.
//
// This exists because the identity layer's real input is a county bulk file that has
// to be downloaded by hand, and the pipeline needs to be provable before that
// happens. It is not production data and must never be treated as such — every owner
// name it writes is the literal string "FIXTURE ...".
const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const countyFips = flagString(args, 'county') ?? '48439';
  const outPath = flagString(args, 'out') ?? `data/rolls/fixtures/${countyFips}-fixture.csv`;

  const rows = await query<{ apn_raw: string; property_address_raw: string | null }>(
    `SELECT DISTINCT apn_raw, property_address_raw
       FROM distress_events
      WHERE county_fips = $1 AND apn_raw IS NOT NULL
      ORDER BY apn_raw
      LIMIT 400`,
    [countyFips],
  );

  const headers = [
    'PropertyID',
    'OwnerName',
    'MailAddr1',
    'MailCity',
    'MailState',
    'MailZip',
    'SitusAddress',
    'SitusCity',
    'SitusZip',
    'LegalDescription',
    'StateCode',
    'LandAcres',
    'LandValue',
    'ImprovementValue',
    'TotalMarketValue',
    'DeedDate',
    'Homestead',
  ];

  const lines: string[] = [headers.join(',')];

  rows.forEach((row, index) => {
    const parts = (row.property_address_raw ?? '').split(',').map((part) => part.trim());
    const situsStreet = parts[0] ?? '';
    const situsCity = parts[1] ?? 'FORT WORTH';
    const situsZip = (parts[3] ?? '76102').slice(0, 5);

    // Deliberate variety, so the score distribution and the withhold log both have
    // something to show. A fixture where every row scores identically proves nothing.
    const variant = index % 5;

    // variant 0: owner-occupied, improved, recent deed  -> should score low
    // variant 1: absentee, unimproved, old deed         -> should score high
    // variant 2: PO box owner, unimproved               -> absentee via PO box
    // variant 3: no mailing address                     -> withheld: no_mailing_address
    // variant 4: absentee entity owner, improved
    const isAbsentee = variant === 1 || variant === 2 || variant === 4;
    const isUnimproved = variant === 1 || variant === 2;
    const hasMailing = variant !== 3;
    const deedYear = variant === 1 || variant === 2 ? 2003 : 2021;

    const ownerName =
      variant === 4
        ? `FIXTURE HOLDINGS ${index} LLC`
        : `FIXTURE${index} TESTOWNER${variant === 0 ? '' : ' A'}`;

    const mailStreet =
      variant === 2
        ? 'PO BOX 4471'
        : isAbsentee
          ? `${1000 + index} FIXTURE AVE`
          : situsStreet;

    lines.push(
      [
        row.apn_raw,
        ownerName,
        hasMailing ? mailStreet : '',
        hasMailing ? (isAbsentee ? 'AUSTIN' : situsCity) : '',
        hasMailing ? 'TX' : '',
        hasMailing ? (isAbsentee ? '78701' : situsZip) : '',
        situsStreet,
        situsCity,
        situsZip,
        `FIXTURE LOT ${index} BLOCK 1`,
        isUnimproved ? 'C1' : 'A1',
        (0.15 + (index % 40) * 1.37).toFixed(4),
        String(12_000 + index * 137),
        isUnimproved ? '0' : String(85_000 + index * 211),
        String(12_000 + index * 137 + (isUnimproved ? 0 : 85_000 + index * 211)),
        `${deedYear}-06-15`,
        variant === 0 ? 'Y' : 'N',
      ]
        .map((value) => (value.includes(',') ? `"${value}"` : value))
        .join(','),
    );
  });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${lines.join('\n')}\n`, 'utf8');

  process.stdout.write(`Wrote ${rows.length} FIXTURE rows to ${outPath}\n`);
  process.stdout.write('These are synthetic owners on real APNs. Not production data.\n');

  return 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePool();
}
