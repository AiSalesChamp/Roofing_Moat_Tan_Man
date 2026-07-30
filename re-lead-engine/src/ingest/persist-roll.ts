import type { RollRow } from '../adapters/appraisal-roll/types.ts';
import { queryOne } from '../db/pool.ts';
import { ownerExternalId, parcelExternalId } from '../lib/external-id.ts';
import { addressFingerprint, normalizeAddress } from '../normalize/address.ts';
import { normalizeApn } from '../normalize/apn.ts';
import { parseOwnerName } from '../normalize/owner-name.ts';
import { hashIdentifier } from '../lib/hash.ts';

const parseNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value.replace(/[$,]/g, ''));

  return Number.isNaN(parsed) ? undefined : parsed;
};

// CADs write dates as MM/DD/YYYY, YYYYMMDD, or YYYY-MM-DD depending on the export.
const parseDate = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);

  if (slashed !== null) {
    return `${slashed[3]}-${(slashed[1] ?? '').padStart(2, '0')}-${(slashed[2] ?? '').padStart(2, '0')}`;
  }

  return undefined;
};

const TRUE_FLAGS = new Set(['Y', 'YES', 'T', 'TRUE', '1', 'HS']);

export type RollUpsertOutcome = {
  parcelId: string;
  ownerId: string;
  parcelInserted: boolean;
  ownerInserted: boolean;
};

export const upsertRollRow = async (input: {
  row: RollRow;
  countyFips: string;
  rollYear: number;
  sourceName: string;
}): Promise<RollUpsertOutcome | undefined> => {
  const { row, countyFips, rollYear, sourceName } = input;
  const apnRaw = row.apn;

  if (apnRaw === undefined) {
    return undefined;
  }

  const apnNormalized = normalizeApn(apnRaw, countyFips);

  if (apnNormalized === '') {
    return undefined;
  }

  const situs = normalizeAddress({
    street: row.situsStreet,
    city: row.situsCity,
    state: 'TX',
    postcode: row.situsZip,
  });

  const mailingStreet = [row.ownerMailingLine1, row.ownerMailingLine2]
    .filter((part) => part !== undefined && part.trim() !== '')
    .join(' ');

  const mailing = normalizeAddress({
    street: mailingStreet === '' ? undefined : mailingStreet,
    city: row.ownerMailingCity,
    state: row.ownerMailingState,
    postcode: row.ownerMailingZip,
  });

  const parcel = await queryOne<{ id: string; inserted: boolean }>(
    `INSERT INTO parcels (
       external_id, county_fips, apn_raw, apn_normalized,
       situs_address_raw, situs_street, situs_city, situs_state, situs_postcode,
       legal_description, land_use_code, acreage,
       land_market_value, improvement_value, total_market_value,
       deed_date, homestead_exemption, source_name, roll_year
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15,
       $16, $17, $18, $19
     )
     ON CONFLICT (county_fips, apn_normalized) DO UPDATE SET
       situs_address_raw = EXCLUDED.situs_address_raw,
       situs_street = EXCLUDED.situs_street,
       situs_city = EXCLUDED.situs_city,
       situs_postcode = EXCLUDED.situs_postcode,
       legal_description = EXCLUDED.legal_description,
       land_use_code = EXCLUDED.land_use_code,
       acreage = EXCLUDED.acreage,
       land_market_value = EXCLUDED.land_market_value,
       improvement_value = EXCLUDED.improvement_value,
       total_market_value = EXCLUDED.total_market_value,
       deed_date = EXCLUDED.deed_date,
       homestead_exemption = EXCLUDED.homestead_exemption,
       roll_year = EXCLUDED.roll_year,
       last_seen_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [
      parcelExternalId(countyFips, apnNormalized),
      countyFips,
      apnRaw,
      apnNormalized,
      situs.raw === '' ? null : situs.raw,
      situs.street ?? null,
      situs.city ?? null,
      'TX',
      situs.postcode ?? null,
      row.legalDescription ?? null,
      row.landUseCode ?? null,
      parseNumber(row.acreage) ?? null,
      parseNumber(row.landMarketValue) ?? null,
      parseNumber(row.improvementValue) ?? null,
      parseNumber(row.totalMarketValue) ?? null,
      parseDate(row.deedDate) ?? null,
      row.homesteadFlag === undefined
        ? null
        : TRUE_FLAGS.has(row.homesteadFlag.trim().toUpperCase()),
      sourceName,
      rollYear,
    ],
  );

  if (parcel === undefined) {
    return undefined;
  }

  const parsedName = parseOwnerName(row.ownerName ?? '');
  const mailingFingerprint = addressFingerprint(mailing);

  const owner = await queryOne<{ id: string; inserted: boolean }>(
    `INSERT INTO owners (
       external_id, name_raw, name_normalized, entity_type, first_name, last_name,
       mailing_address_raw, mailing_street, mailing_city, mailing_state,
       mailing_postcode, mailing_is_po_box, mailing_hash, source_name
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13, $14
     )
     ON CONFLICT (name_normalized, COALESCE(mailing_hash, '')) DO UPDATE SET
       mailing_address_raw = EXCLUDED.mailing_address_raw,
       mailing_street = EXCLUDED.mailing_street,
       mailing_city = EXCLUDED.mailing_city,
       mailing_state = EXCLUDED.mailing_state,
       mailing_postcode = EXCLUDED.mailing_postcode,
       mailing_is_po_box = EXCLUDED.mailing_is_po_box,
       entity_type = EXCLUDED.entity_type,
       last_seen_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [
      ownerExternalId(parsedName.normalized, mailingFingerprint),
      parsedName.raw,
      parsedName.normalized,
      parsedName.entityType,
      parsedName.firstName ?? null,
      parsedName.lastName ?? null,
      mailing.raw === '' ? null : mailing.raw,
      mailing.street ?? null,
      mailing.city ?? null,
      mailing.state ?? null,
      mailing.postcode ?? null,
      mailing.isPoBox,
      mailing.street === undefined ? null : hashIdentifier(mailingFingerprint),
      sourceName,
    ],
  );

  if (owner === undefined) {
    return undefined;
  }

  // Ownership is versioned by roll year. Last year's owner is not deleted, so a
  // recent transfer is visible as two rows rather than as a silent overwrite.
  await queryOne(
    `INSERT INTO parcel_owners (parcel_id, owner_id, as_of_year, is_current, source_name)
     VALUES ($1, $2, $3, true, $4)
     ON CONFLICT (parcel_id, owner_id, as_of_year) DO UPDATE SET is_current = true`,
    [parcel.id, owner.id, rollYear, sourceName],
  );

  await queryOne(
    `UPDATE parcel_owners SET is_current = false
      WHERE parcel_id = $1 AND as_of_year < $2 AND is_current`,
    [parcel.id, rollYear],
  );

  return {
    parcelId: parcel.id,
    ownerId: owner.id,
    parcelInserted: parcel.inserted,
    ownerInserted: owner.inserted,
  };
};

export const refreshOwnerParcelCounts = async (): Promise<void> => {
  await queryOne(
    `UPDATE owners AS o
        SET parcel_count = COALESCE(counts.total, 0)
       FROM (
         SELECT owner_id, count(*)::int AS total
           FROM parcel_owners
          WHERE is_current
          GROUP BY owner_id
       ) AS counts
      WHERE counts.owner_id = o.id`,
  );
};
