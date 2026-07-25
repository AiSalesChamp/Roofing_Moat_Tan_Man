import {
  fetchOpportunityIdsForProperty,
  runBoundedConcurrently,
} from 'src/logic-functions/_shared/opportunities-for-property';
import {
  computeRealizedValueRatio,
  computeSuggestedOffer,
} from 'src/offer-engine';
import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared recompute for the CAD-anchored offer, called by both trigger adapters
// in the parent directory. Query shapes follow the conventions already used by
// _shared/mao-recompute.ts and have the same caveat: relation traversal and
// nested currency sub-selections are not verified against a live server here.

const microsToDollars = (micros: number | null | undefined): number | null =>
  micros == null ? null : micros / 1_000_000;

const dollarsToMicros = (dollars: number): number =>
  Math.round(dollars * 1_000_000);

const currencyOrNull = (dollars: number | null | undefined) =>
  dollars == null
    ? null
    : { amountMicros: dollarsToMicros(dollars), currencyCode: 'USD' };

type PropertyOfferData = {
  id: string;
  county: string | null;
  cadLandMarketValue: { amountMicros?: number } | null;
};

type OpportunityOfferData = {
  id: string;
  countyMultiplierOverride: number | null;
  offerAggressiveness: number | null;
  contractPrice: { amountMicros?: number } | null;
  property: { id: string } | null;
};

const OPPORTUNITY_FIELDS = {
  id: true,
  countyMultiplierOverride: true,
  offerAggressiveness: true,
  contractPrice: { amountMicros: true },
  property: { id: true },
};

const PROPERTY_FIELDS = {
  id: true,
  county: true,
  cadLandMarketValue: { amountMicros: true },
};

const fetchOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
): Promise<OpportunityOfferData | null> => {
  const result = await client.query({
    opportunities: {
      __args: { filter: { id: { eq: opportunityId } }, first: 1 },
      edges: { node: OPPORTUNITY_FIELDS },
    },
  } as any);

  return (result.opportunities as any).edges[0]?.node ?? null;
};

const fetchProperty = async (
  client: CoreApiClient,
  propertyId: string,
): Promise<PropertyOfferData | null> => {
  const result = await client.query({
    properties: {
      __args: { filter: { id: { eq: propertyId } }, first: 1 },
      edges: { node: PROPERTY_FIELDS },
    },
  } as any);

  return (result.properties as any).edges[0]?.node ?? null;
};

export const recomputeSuggestedOfferForOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
  // Supplied by the property-wide path so N deals on one parcel read the parcel
  // once instead of N times.
  preloadedProperty?: PropertyOfferData,
): Promise<{ recomputed: boolean; suggestedOffer?: number | null }> => {
  const opportunity = await fetchOpportunity(client, opportunityId);
  if (!opportunity?.property?.id) return { recomputed: false };

  const property =
    preloadedProperty?.id === opportunity.property.id
      ? preloadedProperty
      : await fetchProperty(client, opportunity.property.id);
  if (!property) return { recomputed: false };

  const cadLandMarketValue = microsToDollars(
    property.cadLandMarketValue?.amountMicros,
  );

  const offer = computeSuggestedOffer({
    cadLandMarketValue,
    county: property.county,
    countyMultiplierOverride: opportunity.countyMultiplierOverride,
    offerAggressiveness: opportunity.offerAggressiveness,
  });

  const realizedValueRatio = computeRealizedValueRatio(
    microsToDollars(opportunity.contractPrice?.amountMicros),
    cadLandMarketValue,
  );

  await client.mutation({
    updateOpportunity: {
      __args: {
        id: opportunityId,
        data: {
          // Null on purpose when the parcel has no CAD value: a stale offer
          // left behind after the anchor is cleared reads as a live number.
          suggestedOfferPrice: currencyOrNull(offer?.suggestedOffer ?? null),
          realizedValueRatio,
          county: property.county,
        },
      },
      id: true,
    },
  } as any);

  return { recomputed: true, suggestedOffer: offer?.suggestedOffer ?? null };
};

export const recomputeSuggestedOfferForProperty = async (
  client: CoreApiClient,
  propertyId: string,
): Promise<{ opportunitiesRecomputed: number }> => {
  const [opportunityIds, property] = await Promise.all([
    fetchOpportunityIdsForProperty(client, propertyId),
    fetchProperty(client, propertyId),
  ]);

  if (!property) return { opportunitiesRecomputed: 0 };

  const opportunitiesRecomputed = await runBoundedConcurrently(
    opportunityIds,
    async (opportunityId) => {
      const result = await recomputeSuggestedOfferForOpportunity(
        client,
        opportunityId,
        property,
      );

      return result.recomputed;
    },
  );

  return { opportunitiesRecomputed };
};
