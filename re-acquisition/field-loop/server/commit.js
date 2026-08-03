// Confirmed-draft → Twenty CRM commit.
//
// Seller calls reuse the existing TwentyWriter (single id/seed authority).
// Site memos follow twenty-field-mapping.md §"Site Memo → Twenty" using the
// same shared seed grammar, so a memo and a call about the same parcel land
// on the same Property.
//
// Without TWENTY_API_KEY the commit is SKIPPED (not failed): the loop and the
// eval log still work end-to-end in dev; the skip is recorded on the draft.

import { TwentyWriter } from '../../acquisition-voice/runner/twenty-writer.js';
import {
  deterministicId,
  resolvePropertyIdByApn,
  seeds,
  toAddress,
  toCurrency,
  toRichText,
} from '../../shared/twenty-writes.mjs';

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

export async function writeSiteMemoExtraction(writer, extraction, memoBody) {
  const memoId = extraction.extractionMeta?.externalMemoId || 'unknown-memo';
  const identity = extraction.identity || {};
  const findings = extraction.siteFindings || {};

  const address = toAddress(identity.propertyAddress);
  const existingByApn = await resolvePropertyIdByApn(
    (path) => writer.request('GET', path),
    identity.apn?.value,
  ).catch(() => null);
  const propertyId =
    existingByApn ??
    deterministicId(
      address ? seeds.propertyFromAddress(address) : seeds.labeled('property', memoId),
    );
  const opportunityId = deterministicId(seeds.opportunity(memoId));
  const inspectionId = deterministicId(seeds.labeled('inspection', memoId));

  const property = await writer.upsert('properties', {
    id: propertyId,
    ...(address ? { propertyAddress: address } : {}),
    ...(identity.apn?.value ? { apn: identity.apn.value } : {}),
    ...(identity.propertyClass ? { propertyClass: identity.propertyClass } : {}),
  });

  const oppName = address?.addressStreet1
    ? `${address.addressStreet1} — Site memo`
    : `Site memo ${memoId.slice(0, 8)}`;
  const estimatedValue = toCurrency(findings.estimatedValue);
  const opportunity = await writer.upsert('opportunities', {
    id: opportunityId,
    name: oppName,
    propertyId: property.id || propertyId,
    ...(address ? { propertyAddress: address } : {}),
    dealStage: findings.offerIntent === true ? 'OFFER_OUT' : 'QUALIFYING',
    ...(estimatedValue ? { askingPrice: estimatedValue } : {}),
  });

  const summaryParts = [];
  if (findings.findingsSummary) summaryParts.push(findings.findingsSummary);
  if (findings.accessNotes) summaryParts.push(`**Access:** ${findings.accessNotes}`);
  if (findings.occupancyObserved) summaryParts.push(`**Occupancy:** ${findings.occupancyObserved}`);
  if (findings.zoningNotes) summaryParts.push(`**Zoning:** ${findings.zoningNotes}`);
  if (findings.environmentalRedFlags?.length) {
    summaryParts.push(`**Env. red flags:** ${findings.environmentalRedFlags.join(', ')}`);
  }
  const inspection = await writer.upsert('propertyInspections', {
    id: inspectionId,
    inspectionType: findings.inspectionType || 'SITE_WALK',
    ...(findings.conditionRating ? { conditionRating: findings.conditionRating } : {}),
    findingsSummary: toRichText(summaryParts.join('\n\n') || memoBody),
    propertyId: property.id || propertyId,
    inspectionOpportunityId: opportunity.id || opportunityId,
  });

  const compIds = [];
  for (const [index, comp] of (findings.compsMentioned || []).entries()) {
    const compId = deterministicId(seeds.labeled(`comparableSale:${index}`, memoId));
    const salePrice = toCurrency(comp.salePrice ?? comp.price);
    await writer.upsert('comparableSales', {
      id: compId,
      name: comp.address || comp.description || `Comp ${index + 1} — ${memoId.slice(0, 8)}`,
      ...(salePrice ? { salePrice } : {}),
      ...(comp.saleDate ? { saleDate: comp.saleDate } : {}),
      compPropertyId: property.id || propertyId,
    });
    compIds.push(compId);
  }

  return {
    propertyId: property.id || propertyId,
    opportunityId: opportunity.id || opportunityId,
    propertyInspectionId: inspection.id || inspectionId,
    comparableSaleIds: compIds,
  };
}
