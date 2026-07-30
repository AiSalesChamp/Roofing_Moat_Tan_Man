import { ON_MAO_COMPUTATION_FN_ID } from 'src/constants/universal-identifiers';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

// Formula revision. Bump whenever the math below changes so maoCalculation
// audit rows stay attributable to the formula that produced them.
const MAO_FORMULA_VERSION = 1;

// Land-funnel playbook: offer 50-65% of market value. offerAggressiveness
// (0..1, default 0.5) slides inside that band.
const DISCOUNT_FLOOR = 0.5;
const DISCOUNT_CEILING = 0.65;

// Flip underwriting: classic 70% rule against ARV.
const FLIP_ARV_FACTOR = 0.7;

// Entitle & Hold: share of post-entitlement value an exit buyer actually pays
// for entitled-but-unbuilt land, before carry costs. realizedValueRatio on the
// deal overrides it.
const DEFAULT_REALIZED_VALUE_RATIO = 0.6;

// Hyperscale gate (land-funnel Hold criteria): 20+ acres, substation within
// 2 miles, an interconnection path, and some water story.
const HYPERSCALE_MIN_ACRES = 20;
const HYPERSCALE_MAX_SUBSTATION_MILES = 2;

// Premium a hyperscale-adjacent parcel commands over ordinary land comps when
// no power/fiber-adjacent comps exist to price it directly.
const HYPERSCALE_COMP_PREMIUM = 1.5;

// Opening offer opens below MAO; aggressiveness closes the gap.
const SUGGESTED_OFFER_FLOOR = 0.85;

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

type Micros = { amountMicros?: number } | null | undefined;

const toDollars = (value: Micros): number | null =>
  value?.amountMicros == null ? null : value.amountMicros / 1_000_000;

const toCurrency = (dollars: number) => ({
  amountMicros: Math.round(dollars * 1_000_000),
  currencyCode: 'USD',
});

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

type CompNode = {
  salePrice?: Micros;
  pricePerAcre?: Micros;
  acreage?: number | null;
  isPowerFiberAdjacent?: boolean | null;
};

// Price per acre from a comp: explicit pricePerAcre wins, else derive it.
const compPricePerAcre = (comp: CompNode): number | null => {
  const explicit = toDollars(comp.pricePerAcre);
  if (explicit != null && explicit > 0) return explicit;
  const salePrice = toDollars(comp.salePrice);
  if (salePrice != null && comp.acreage != null && comp.acreage > 0) {
    return salePrice / comp.acreage;
  }
  return null;
};

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: {
      id: string;
      propertyId?: string | null;
      askingPrice?: Micros;
      arv?: Micros;
      rehabEstimate?: Micros;
      holdingCostEstimate?: Micros;
      assignmentFee?: Micros;
      targetMargin?: Micros;
      entitlementCarryCost?: Micros;
      postEntitlementValue?: Micros;
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
  let cadLandMarketValue: number | null = null;
  let comps: CompNode[] = [];
  let infra: {
    interconnectionStatus?: string | null;
    substationDistanceMiles?: number | null;
    waterAccess?: string | null;
  } | null = null;

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
    // Integer-truncated acreage stores small lots as 0 — treat as unknown.
    acreage = property?.acreage > 0 ? property.acreage : null;
    cadLandMarketValue = toDollars(property?.cadLandMarketValue);
    comps = (property?.comparableSales?.edges ?? []).map(
      (edge: { node: CompNode }) => edge.node,
    );
    const infraNodes = (property?.infrastructureSignals?.edges ?? []).map(
      (edge: { node: typeof infra }) => edge.node,
    );
    infra = infraNodes[infraNodes.length - 1] ?? null;
  }

  // --- Market value of the parcel ---
  const compPerAcre = median(
    comps.map(compPricePerAcre).filter((v): v is number => v != null),
  );
  const marketValue =
    compPerAcre != null && acreage != null
      ? compPerAcre * acreage
      : cadLandMarketValue;

  const aggressiveness = Math.min(Math.max(after.offerAggressiveness ?? 0.5, 0), 1);
  const countyMultiplier = after.countyMultiplierOverride ?? 1;
  const discount =
    DISCOUNT_FLOOR + (DISCOUNT_CEILING - DISCOUNT_FLOOR) * aggressiveness;

  const arv = toDollars(after.arv);
  const rehab = toDollars(after.rehabEstimate) ?? 0;
  const holding = toDollars(after.holdingCostEstimate) ?? 0;
  const assignmentFee = toDollars(after.assignmentFee) ?? 0;
  const targetMargin = toDollars(after.targetMargin) ?? 0;

  // --- Exit 1: Wholesale / Flip ---
  // Improved asset with an ARV: 70% rule. Raw land: discounted market value.
  let maoWholesaleFlip: number | null = null;
  if (arv != null && arv > 0) {
    maoWholesaleFlip = arv * FLIP_ARV_FACTOR - rehab - assignmentFee;
  } else if (marketValue != null) {
    maoWholesaleFlip = marketValue * discount * countyMultiplier - assignmentFee;
  }

  // --- Exit 2: Entitle & Hold ---
  const postEntitlementValue = toDollars(after.postEntitlementValue);
  const realizedRatio = after.realizedValueRatio ?? DEFAULT_REALIZED_VALUE_RATIO;
  const entitlementCarry = toDollars(after.entitlementCarryCost) ?? 0;
  const maoEntitleHold =
    postEntitlementValue != null && postEntitlementValue > 0
      ? postEntitlementValue * realizedRatio -
        entitlementCarry -
        holding -
        targetMargin
      : null;

  // --- Exit 3: Hyperscale disposition (gated) ---
  let gateStatus: 'PASSED' | 'HARD_REJECTED' | 'NOT_EVALUATED' = 'NOT_EVALUATED';
  let gateReason = '';
  let maoHyperscale: number | null = null;

  if (acreage == null || infra == null) {
    gateReason =
      acreage == null
        ? 'No usable acreage on linked property'
        : 'No infrastructure signal recorded for property';
  } else if (acreage < HYPERSCALE_MIN_ACRES) {
    gateStatus = 'HARD_REJECTED';
    gateReason = `${acreage} acres < ${HYPERSCALE_MIN_ACRES} minimum`;
  } else if (infra.interconnectionStatus === 'NO_PATH') {
    gateStatus = 'HARD_REJECTED';
    gateReason = 'No interconnection path';
  } else if (
    infra.substationDistanceMiles == null ||
    infra.substationDistanceMiles > HYPERSCALE_MAX_SUBSTATION_MILES
  ) {
    gateStatus = 'HARD_REJECTED';
    gateReason = `Substation ${infra.substationDistanceMiles ?? 'unknown'} mi > ${HYPERSCALE_MAX_SUBSTATION_MILES} mi max`;
  } else if (infra.waterAccess === 'NONE') {
    gateStatus = 'HARD_REJECTED';
    gateReason = 'No water access';
  } else {
    gateStatus = 'PASSED';
    gateReason = `${acreage} ac, substation ${infra.substationDistanceMiles} mi, interconnection ${infra.interconnectionStatus ?? 'unknown'}`;
    // Price from power/fiber-adjacent comps when available, else ordinary
    // comps at a premium, else post-entitlement value.
    const adjacentPerAcre = median(
      comps
        .filter((comp) => comp.isPowerFiberAdjacent === true)
        .map(compPricePerAcre)
        .filter((v): v is number => v != null),
    );
    const hyperscalePerAcre =
      adjacentPerAcre ??
      (compPerAcre != null ? compPerAcre * HYPERSCALE_COMP_PREMIUM : null);
    if (hyperscalePerAcre != null) {
      maoHyperscale =
        hyperscalePerAcre * acreage * discount * countyMultiplier -
        entitlementCarry;
    } else if (postEntitlementValue != null) {
      maoHyperscale = postEntitlementValue * realizedRatio - entitlementCarry;
    }
  }

  // --- Recommendation: the exit that supports the highest offer ---
  const candidates: Array<{ exit: string; mao: number | null }> = [
    { exit: 'WHOLESALE_FLIP', mao: maoWholesaleFlip },
    { exit: 'ENTITLE_HOLD', mao: maoEntitleHold },
    { exit: 'HYPERSCALE_DISPOSITION', mao: maoHyperscale },
  ];
  const viable = candidates.filter(
    (candidate): candidate is { exit: string; mao: number } =>
      candidate.mao != null && candidate.mao > 0,
  );
  const best = viable.sort((a, b) => b.mao - a.mao)[0] ?? null;
  const recommendedExitType = best?.exit ?? 'INSUFFICIENT_DATA';
  const suggestedOffer = best
    ? best.mao *
      (SUGGESTED_OFFER_FLOOR + (1 - SUGGESTED_OFFER_FLOOR) * aggressiveness)
    : null;

  const computedAt = new Date().toISOString();
  const inputsSnapshot = {
    formulaVersion: MAO_FORMULA_VERSION,
    acreage,
    cadLandMarketValue,
    compCount: comps.length,
    compMedianPricePerAcre: compPerAcre,
    marketValue,
    aggressiveness,
    countyMultiplier,
    discount,
    arv,
    rehab,
    holding,
    assignmentFee,
    targetMargin,
    postEntitlementValue,
    realizedRatio,
    entitlementCarry,
    infra,
    gateStatus,
    gateReason,
  };

  // --- Write current values onto the deal ---
  await client.mutation({
    updateOpportunity: {
      __args: {
        id: after.id,
        data: {
          maoWholesaleFlip:
            maoWholesaleFlip != null ? toCurrency(maoWholesaleFlip) : null,
          maoEntitleHold:
            maoEntitleHold != null ? toCurrency(maoEntitleHold) : null,
          maoHyperscaleDisposition:
            maoHyperscale != null ? toCurrency(maoHyperscale) : null,
          suggestedOfferPrice:
            suggestedOffer != null ? toCurrency(suggestedOffer) : null,
          recommendedExitType,
          hyperscaleGateStatus: gateStatus,
          hyperscaleGateReason: gateReason,
          maoLastComputedAt: computedAt,
        },
      },
      id: true,
    },
  } as any);

  // --- Append audit rows, one per computed exit ---
  for (const candidate of candidates) {
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
                ? gateStatus === 'NOT_EVALUATED'
                  ? 'NOT_APPLICABLE'
                  : gateStatus
                : 'NOT_APPLICABLE',
            gateReason:
              candidate.exit === 'HYPERSCALE_DISPOSITION' ? gateReason : '',
            inputsSnapshot,
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
    maoWholesaleFlip,
    maoEntitleHold,
    maoHyperscaleDisposition: maoHyperscale,
    recommendedExitType,
    suggestedOfferPrice: suggestedOffer,
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
