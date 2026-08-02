// Pure MAO engine — every formula the CRM writes back lives here and only
// here. No I/O, no SDK imports: callers (logic functions, scripts, tests)
// fetch records, call computeMao, and write the result themselves.

// Formula revision. Bump whenever the math below changes so maoCalculation
// audit rows stay attributable to the formula that produced them.
// v2: offerAggressiveness / realizedValueRatio > 1 are read as percentages
// (live records store 80 meaning 80%) instead of clamping to 1.
export const MAO_FORMULA_VERSION = 2;

// Land-funnel playbook: offer 50-65% of market value. offerAggressiveness
// (0..1, default 0.5) slides inside that band.
export const DISCOUNT_FLOOR = 0.5;
export const DISCOUNT_CEILING = 0.65;

// Flip underwriting: classic 70% rule against ARV.
export const FLIP_ARV_FACTOR = 0.7;

// Entitle & Hold: share of post-entitlement value an exit buyer actually pays
// for entitled-but-unbuilt land, before carry costs. realizedValueRatio on the
// deal overrides it.
export const DEFAULT_REALIZED_VALUE_RATIO = 0.6;

// Hyperscale gate (land-funnel Hold criteria): 20+ acres, substation within
// 2 miles, an interconnection path, and some water story.
export const HYPERSCALE_MIN_ACRES = 20;
export const HYPERSCALE_MAX_SUBSTATION_MILES = 2;

// Premium a hyperscale-adjacent parcel commands over ordinary land comps when
// no power/fiber-adjacent comps exist to price it directly.
export const HYPERSCALE_COMP_PREMIUM = 1.5;

// Opening offer opens below MAO; aggressiveness closes the gap.
export const SUGGESTED_OFFER_FLOOR = 0.85;

export type CurrencyMicros =
  | { amountMicros?: number | null; currencyCode?: string | null }
  | null
  | undefined;

export type CompInput = {
  salePrice?: CurrencyMicros;
  pricePerAcre?: CurrencyMicros;
  acreage?: number | null;
  isPowerFiberAdjacent?: boolean | null;
};

export type InfraInput = {
  interconnectionStatus?: string | null;
  substationDistanceMiles?: number | null;
  waterAccess?: string | null;
};

export type DealInputs = {
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

export type PropertyInputs = {
  acreage?: number | null;
  cadLandMarketValue?: CurrencyMicros;
};

export type ExitType =
  | 'WHOLESALE_FLIP'
  | 'ENTITLE_HOLD'
  | 'HYPERSCALE_DISPOSITION';

export type GateStatus = 'PASSED' | 'HARD_REJECTED' | 'NOT_EVALUATED';

export type MaoResult = {
  maoWholesaleFlip: number | null;
  maoEntitleHold: number | null;
  maoHyperscale: number | null;
  gateStatus: GateStatus;
  gateReason: string;
  recommendedExitType: ExitType | 'INSUFFICIENT_DATA';
  suggestedOffer: number | null;
  candidates: Array<{ exit: ExitType; mao: number | null }>;
  inputsSnapshot: Record<string, unknown>;
};

export const toDollars = (value: CurrencyMicros): number | null =>
  value?.amountMicros == null ? null : value.amountMicros / 1_000_000;

export const toCurrency = (dollars: number) => ({
  amountMicros: Math.round(dollars * 1_000_000),
  currencyCode: 'USD',
});

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Ratio fields are decimals(2) NUMBER columns with no scale enforcement, and
// live records hold both 0.8-style fractions and 80-style percentages. >1 is
// read as a percentage; the result is clamped to 0..1.
export const normalizeRatio = (
  value: number | null | undefined,
  fallback: number,
): number => {
  const raw = value ?? fallback;
  const fraction = raw > 1 ? raw / 100 : raw;
  return Math.min(Math.max(fraction, 0), 1);
};

// Price per acre from a comp: explicit pricePerAcre wins, else derive it.
export const compPricePerAcre = (comp: CompInput): number | null => {
  const explicit = toDollars(comp.pricePerAcre);
  if (explicit != null && explicit > 0) return explicit;
  const salePrice = toDollars(comp.salePrice);
  if (salePrice != null && comp.acreage != null && comp.acreage > 0) {
    return salePrice / comp.acreage;
  }
  return null;
};

export const computeMao = (
  deal: DealInputs,
  property: PropertyInputs,
  comps: CompInput[],
  infra: InfraInput | null,
): MaoResult => {
  // Integer-truncated acreage stores small lots as 0 — treat as unknown.
  const acreage =
    property.acreage != null && property.acreage > 0 ? property.acreage : null;
  const cadLandMarketValue = toDollars(property.cadLandMarketValue);

  // --- Market value of the parcel ---
  const compPerAcre = median(
    comps.map(compPricePerAcre).filter((v): v is number => v != null),
  );
  const marketValue =
    compPerAcre != null && acreage != null
      ? compPerAcre * acreage
      : cadLandMarketValue;

  const aggressiveness = normalizeRatio(deal.offerAggressiveness, 0.5);
  const countyMultiplier = deal.countyMultiplierOverride ?? 1;
  const discount =
    DISCOUNT_FLOOR + (DISCOUNT_CEILING - DISCOUNT_FLOOR) * aggressiveness;

  const arv = toDollars(deal.arv);
  const rehab = toDollars(deal.rehabEstimate) ?? 0;
  const holding = toDollars(deal.holdingCostEstimate) ?? 0;
  const assignmentFee = toDollars(deal.assignmentFee) ?? 0;
  const targetMargin = toDollars(deal.targetMargin) ?? 0;

  // --- Exit 1: Wholesale / Flip ---
  // Improved asset with an ARV: 70% rule. Raw land: discounted market value.
  let maoWholesaleFlip: number | null = null;
  if (arv != null && arv > 0) {
    maoWholesaleFlip = arv * FLIP_ARV_FACTOR - rehab - assignmentFee;
  } else if (marketValue != null) {
    maoWholesaleFlip = marketValue * discount * countyMultiplier - assignmentFee;
  }

  // --- Exit 2: Entitle & Hold ---
  const postEntitlementValue = toDollars(deal.postEntitlementValue);
  const realizedRatio = normalizeRatio(
    deal.realizedValueRatio,
    DEFAULT_REALIZED_VALUE_RATIO,
  );
  const entitlementCarry = toDollars(deal.entitlementCarryCost) ?? 0;
  const maoEntitleHold =
    postEntitlementValue != null && postEntitlementValue > 0
      ? postEntitlementValue * realizedRatio -
        entitlementCarry -
        holding -
        targetMargin
      : null;

  // --- Exit 3: Hyperscale disposition (gated) ---
  let gateStatus: GateStatus = 'NOT_EVALUATED';
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
  const candidates: Array<{ exit: ExitType; mao: number | null }> = [
    { exit: 'WHOLESALE_FLIP', mao: maoWholesaleFlip },
    { exit: 'ENTITLE_HOLD', mao: maoEntitleHold },
    { exit: 'HYPERSCALE_DISPOSITION', mao: maoHyperscale },
  ];
  const viable = candidates.filter(
    (candidate): candidate is { exit: ExitType; mao: number } =>
      candidate.mao != null && candidate.mao > 0,
  );
  const best = [...viable].sort((a, b) => b.mao - a.mao)[0] ?? null;
  const recommendedExitType = best?.exit ?? 'INSUFFICIENT_DATA';
  const suggestedOffer = best
    ? best.mao *
      (SUGGESTED_OFFER_FLOOR + (1 - SUGGESTED_OFFER_FLOOR) * aggressiveness)
    : null;

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

  return {
    maoWholesaleFlip,
    maoEntitleHold,
    maoHyperscale,
    gateStatus,
    gateReason,
    recommendedExitType,
    suggestedOffer,
    candidates,
    inputsSnapshot,
  };
};
