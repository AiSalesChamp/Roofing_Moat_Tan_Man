import {
  fetchOpportunityIdsForProperty,
  runBoundedConcurrently,
} from 'src/logic-functions/_shared/opportunities-for-property';
import { computeAllExitPaths } from 'src/mao-engine';
import { CompInput, InterconnectionStatus, ZoningTrajectory } from 'src/mao-engine/types';
import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared recompute logic called by every MAO trigger adapter in this
// directory's parent — never duplicate the query/mutation shape or the
// engine call per trigger. GraphQL field/relation shapes here follow this
// app's existing query conventions (see dd-deadline-reminder.ts,
// on-deal-stage-change.ts) but relation-of-relation selections
// (property.comparableSales, property.infrastructureSignals) and nested
// currency sub-selections are not yet exercised elsewhere in this app —
// verify against a live `yarn twenty dev --once` instance before relying
// on this in production.

const microsToDollars = (micros: number | null | undefined): number =>
  (micros ?? 0) / 1_000_000;

const dollarsToMicros = (dollars: number): number =>
  Math.round(dollars * 1_000_000);

const currencyOrNull = (dollars: number | null | undefined) =>
  dollars == null ? null : { amountMicros: dollarsToMicros(dollars), currencyCode: 'USD' };

type RawComp = {
  pricePerAcre: { amountMicros?: number } | null;
  saleDate: string | null;
  acreage: number | null;
  roadAccessRating: string | null;
  buildabilityRating: string | null;
  isPowerFiberAdjacent: boolean | null;
};

type RawInfraSignal = {
  interconnectionStatus: InterconnectionStatus | null;
  estimatedTimelineMonths: number | null;
  assessedDate: string | null;
};

type PropertyData = {
  id: string;
  acreage: number | null;
  zoningTrajectory: string | null;
  comparableSales: { edges: { node: RawComp }[] } | null;
  infrastructureSignals: { edges: { node: RawInfraSignal }[] } | null;
};

type OpportunityData = {
  id: string;
  dealType: string[] | null;
  assignmentFee: { amountMicros?: number } | null;
  holdingCostEstimate: { amountMicros?: number } | null;
  postEntitlementValue: { amountMicros?: number } | null;
  entitlementCarryCost: { amountMicros?: number } | null;
  targetMargin: { amountMicros?: number } | null;
  property: { id: string } | null;
};

const toCompInput = (raw: RawComp): CompInput => ({
  pricePerAcre: microsToDollars(raw.pricePerAcre?.amountMicros),
  // Never substitute "now" for a missing sale date — that would score an
  // undated comp as the freshest one in the set. The engine penalises null.
  saleDate: raw.saleDate,
  acreage: raw.acreage ?? 0,
  roadAccessRating: (raw.roadAccessRating as CompInput['roadAccessRating']) ?? undefined,
  buildabilityRating: (raw.buildabilityRating as CompInput['buildabilityRating']) ?? undefined,
  isPowerFiberAdjacent: raw.isPowerFiberAdjacent ?? false,
});

const OPPORTUNITY_FIELDS = {
  id: true,
  dealType: true,
  assignmentFee: { amountMicros: true },
  holdingCostEstimate: { amountMicros: true },
  postEntitlementValue: { amountMicros: true },
  entitlementCarryCost: { amountMicros: true },
  targetMargin: { amountMicros: true },
  property: { id: true },
};

const PROPERTY_FIELDS = {
  id: true,
  acreage: true,
  zoningTrajectory: true,
  comparableSales: {
    edges: {
      node: {
        pricePerAcre: { amountMicros: true },
        saleDate: true,
        acreage: true,
        roadAccessRating: true,
        buildabilityRating: true,
        isPowerFiberAdjacent: true,
      },
    },
  },
  infrastructureSignals: {
    edges: {
      node: {
        interconnectionStatus: true,
        estimatedTimelineMonths: true,
        assessedDate: true,
      },
    },
  },
};

const fetchOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
): Promise<OpportunityData | null> => {
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
): Promise<PropertyData | null> => {
  const result = await client.query({
    properties: {
      __args: { filter: { id: { eq: propertyId } }, first: 1 },
      edges: { node: PROPERTY_FIELDS },
    },
  } as any);
  return (result.properties as any).edges[0]?.node ?? null;
};

const latestInfraSignal = (signals: RawInfraSignal[]): RawInfraSignal | null => {
  if (signals.length === 0) return null;
  return [...signals].sort((a, b) =>
    (b.assessedDate ?? '').localeCompare(a.assessedDate ?? ''),
  )[0];
};

const nextVersion = async (
  client: CoreApiClient,
  opportunityId: string,
  exitType: string,
): Promise<number> => {
  const result = await client.query({
    maoCalculations: {
      __args: {
        filter: {
          opportunity: { id: { eq: opportunityId } },
          exitType: { eq: exitType },
        },
        first: 1,
        orderBy: [{ version: 'Desc' }],
      },
      edges: { node: { version: true } },
    },
  } as any);
  const latest = (result.maoCalculations as any).edges[0]?.node?.version ?? 0;
  return latest + 1;
};

export const recomputeMaoForOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
  // Supplied by the property-wide path so that N deals on one parcel read the
  // parcel (and its comps and infra signals) once instead of N times.
  preloadedProperty?: PropertyData,
): Promise<{ recomputed: boolean; recommendedExitType?: string }> => {
  const opportunity = await fetchOpportunity(client, opportunityId);
  if (!opportunity?.property?.id) {
    return { recomputed: false };
  }

  const property =
    preloadedProperty?.id === opportunity.property.id
      ? preloadedProperty
      : await fetchProperty(client, opportunity.property.id);
  if (!property) return { recomputed: false };

  const comps = (property.comparableSales?.edges ?? []).map((edge) =>
    toCompInput(edge.node),
  );
  const infraSignal = latestInfraSignal(
    (property.infrastructureSignals?.edges ?? []).map((edge) => edge.node),
  );

  const holdingCost = microsToDollars(opportunity.holdingCostEstimate?.amountMicros);
  const postEntitlementValue = opportunity.postEntitlementValue?.amountMicros;

  const result = computeAllExitPaths({
    wholesaleFlip: {
      comps,
      subjectAcreage: property.acreage,
      wholesaleFee: microsToDollars(opportunity.assignmentFee?.amountMicros),
    },
    entitleHold: {
      postEntitlementValue:
        postEntitlementValue != null ? microsToDollars(postEntitlementValue) : null,
      zoningTrajectory: (property.zoningTrajectory as ZoningTrajectory) ?? 'UNKNOWN',
      entitlementCarryCost: microsToDollars(opportunity.entitlementCarryCost?.amountMicros),
      holdingCost,
      targetMargin: microsToDollars(opportunity.targetMargin?.amountMicros),
    },
    hyperscaleDisposition: {
      interconnectionStatus: infraSignal?.interconnectionStatus ?? 'UNCONFIRMED',
      estimatedTimelineMonths: infraSignal?.estimatedTimelineMonths ?? null,
      corridorComps: comps,
      subjectAcreage: property.acreage,
      holdingCost,
    },
  });

  const now = new Date();

  // Append-only: always insert the next version, never update an existing row.
  // Versions are scoped per exit type, so the three paths are independent and
  // their lookup/insert pairs run concurrently rather than one after another.
  await Promise.all(
    result.paths.map(async (path) => {
      const version = await nextVersion(client, opportunityId, path.exitType);

      await client.mutation({
        createMaoCalculation: {
          __args: {
            data: {
              exitType: path.exitType,
              maoValue: currencyOrNull(path.mao),
              version,
              gateStatus: path.gateStatus,
              gateReason: path.gateReason,
              inputsSnapshot: path.inputsUsed,
              computedAt: now.toISOString(),
              maoOpportunityId: opportunityId,
              maoPropertyId: property.id,
            },
          },
          id: true,
        },
      } as any);
    }),
  );

  const wholesale = result.paths.find((path) => path.exitType === 'WHOLESALE_FLIP');
  const entitleHold = result.paths.find((path) => path.exitType === 'ENTITLE_HOLD');
  const hyperscale = result.paths.find(
    (path) => path.exitType === 'HYPERSCALE_DISPOSITION',
  );

  await client.mutation({
    updateOpportunity: {
      __args: {
        id: opportunityId,
        data: {
          maoWholesaleFlip: currencyOrNull(wholesale?.mao ?? null),
          maoEntitleHold: currencyOrNull(entitleHold?.mao ?? null),
          maoHyperscaleDisposition: currencyOrNull(hyperscale?.mao ?? null),
          recommendedExitType: result.recommendedExitType,
          hyperscaleGateStatus:
            hyperscale?.gateStatus === 'HARD_REJECTED'
              ? 'HARD_REJECTED'
              : hyperscale?.gateStatus === 'PASSED'
                ? 'PASSED'
                : 'NOT_EVALUATED',
          hyperscaleGateReason: hyperscale?.gateReason ?? null,
          maoLastComputedAt: now.toISOString(),
        },
      },
      id: true,
    },
  } as any);

  return { recomputed: true, recommendedExitType: result.recommendedExitType };
};

export const recomputeMaoForProperty = async (
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
      const result = await recomputeMaoForOpportunity(
        client,
        opportunityId,
        property,
      );

      return result.recomputed;
    },
  );

  return { opportunitiesRecomputed };
};
