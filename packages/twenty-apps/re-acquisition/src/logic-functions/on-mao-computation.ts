import { ON_MAO_COMPUTATION_FN_ID } from 'src/constants/universal-identifiers';
import {
  CompInput,
  CurrencyMicros,
  InfraInput,
  MAO_FORMULA_VERSION,
  computeMao,
  toCurrency,
} from 'src/underwriting/mao-engine';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

const INPUT_FIELDS = [
  'askingPrice',
  'arv',
  'rehabEstimate',
  'holdingCostEstimate',
  'assignmentFee',
  'targetMargin',
  'entitlementCarryCost',
  'postEntitlementValue',
  'offerAggressiveness',
  'countyMultiplierOverride',
  'realizedValueRatio',
  'propertyId',
];

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: {
      id: string;
      propertyId?: string | null;
      askingPrice?: CurrencyMicros;
      arv?: CurrencyMicros;
      rehabEstimate?: CurrencyMicros;
      holdingCostEstimate?: CurrencyMicros;
      assignmentFee?: CurrencyMicros;
      targetMargin?: CurrencyMicros;
      entitlementCarryCost?: CurrencyMicros;
      postEntitlementValue?: CurrencyMicros;
      offerAggressiveness?: number | null;
      countyMultiplierOverride?: number | null;
      realizedValueRatio?: number | null;
    };
    updatedFields?: string[];
  };

  // Recompute only when an underwriting input changed. MAO writes come back
  // as updatedFields = ['maoWholesaleFlip', ...], which are not inputs, so
  // this also breaks the self-trigger loop.
  if (!props.updatedFields?.some((field) => INPUT_FIELDS.includes(field))) {
    return {};
  }
  const after = props.after;
  if (!after?.id) return {};

  const client = new CoreApiClient();

  // --- Gather property, comps, and infrastructure signals ---
  let acreage: number | null = null;
  let cadLandMarketValue: CurrencyMicros = null;
  let comps: CompInput[] = [];
  let infra: InfraInput | null = null;

  if (after.propertyId) {
    const propertyResult = await client.query({
      property: {
        __args: { id: after.propertyId },
        id: true,
        acreage: true,
        cadLandMarketValue: { amountMicros: true },
        comparableSales: {
          edges: {
            node: {
              salePrice: { amountMicros: true },
              pricePerAcre: { amountMicros: true },
              acreage: true,
              isPowerFiberAdjacent: true,
            },
          },
        },
        infrastructureSignals: {
          edges: {
            node: {
              interconnectionStatus: true,
              substationDistanceMiles: true,
              waterAccess: true,
              assessedDate: true,
            },
          },
        },
      },
    } as any);

    const property = (propertyResult as any).property;
    acreage = property?.acreage ?? null;
    cadLandMarketValue = property?.cadLandMarketValue ?? null;
    comps = (property?.comparableSales?.edges ?? []).map(
      (edge: { node: CompInput }) => edge.node,
    );
    const infraNodes = (property?.infrastructureSignals?.edges ?? []).map(
      (edge: { node: InfraInput }) => edge.node,
    );
    infra = infraNodes[infraNodes.length - 1] ?? null;
  }

  // --- All math lives in the pure engine ---
  const result = computeMao(after, { acreage, cadLandMarketValue }, comps, infra);
  const computedAt = new Date().toISOString();

  // --- Write current values onto the deal ---
  await client.mutation({
    updateOpportunity: {
      __args: {
        id: after.id,
        data: {
          maoWholesaleFlip:
            result.maoWholesaleFlip != null
              ? toCurrency(result.maoWholesaleFlip)
              : null,
          maoEntitleHold:
            result.maoEntitleHold != null
              ? toCurrency(result.maoEntitleHold)
              : null,
          maoHyperscaleDisposition:
            result.maoHyperscale != null
              ? toCurrency(result.maoHyperscale)
              : null,
          suggestedOfferPrice:
            result.suggestedOffer != null
              ? toCurrency(result.suggestedOffer)
              : null,
          recommendedExitType: result.recommendedExitType,
          hyperscaleGateStatus: result.gateStatus,
          hyperscaleGateReason: result.gateReason,
          maoLastComputedAt: computedAt,
        },
      },
      id: true,
    },
  } as any);

  // --- Append audit rows, one per computed exit ---
  for (const candidate of result.candidates) {
    if (candidate.mao == null) continue;
    await client.mutation({
      createMaoCalculation: {
        __args: {
          data: {
            name: `${candidate.exit} v${MAO_FORMULA_VERSION} @ ${computedAt}`,
            exitType: candidate.exit,
            maoValue: toCurrency(candidate.mao),
            version: MAO_FORMULA_VERSION,
            gateStatus:
              candidate.exit === 'HYPERSCALE_DISPOSITION'
                ? result.gateStatus === 'NOT_EVALUATED'
                  ? 'NOT_APPLICABLE'
                  : result.gateStatus
                : 'NOT_APPLICABLE',
            gateReason:
              candidate.exit === 'HYPERSCALE_DISPOSITION'
                ? result.gateReason
                : '',
            inputsSnapshot: result.inputsSnapshot,
            computedAt,
            opportunityId: after.id,
            propertyId: after.propertyId ?? null,
          },
        },
        id: true,
      },
    } as any);
  }

  return {
    maoWholesaleFlip: result.maoWholesaleFlip,
    maoEntitleHold: result.maoEntitleHold,
    maoHyperscaleDisposition: result.maoHyperscale,
    recommendedExitType: result.recommendedExitType,
    suggestedOfferPrice: result.suggestedOffer,
  };
};

export default defineLogicFunction({
  universalIdentifier: ON_MAO_COMPUTATION_FN_ID,
  name: 'on-mao-computation',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
