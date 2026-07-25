export type RatingValue = 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';

export type ZoningTrajectory =
  | 'UPZONING_LIKELY'
  | 'STABLE'
  | 'DOWNZONING_RISK'
  | 'UNKNOWN';

export type InterconnectionStatus =
  | 'CONFIRMED'
  | 'QUEUE_POSITION_SECURED'
  | 'STUDY_IN_PROGRESS'
  | 'UNCONFIRMED'
  | 'NO_PATH';

export type GateStatus = 'PASSED' | 'HARD_REJECTED' | 'NOT_APPLICABLE';

export type ExitType =
  | 'WHOLESALE_FLIP'
  | 'ENTITLE_HOLD'
  | 'HYPERSCALE_DISPOSITION';

export type CompInput = {
  pricePerAcre: number;
  // Nullable on purpose: a comp with no recorded sale date must not be scored
  // as if it closed today. See UNKNOWN_RECENCY_WEIGHT in constants.
  saleDate: string | Date | null;
  acreage: number;
  roadAccessRating?: RatingValue;
  buildabilityRating?: RatingValue;
  isPowerFiberAdjacent?: boolean;
};

export type ExitPathResult = {
  mao: number | null;
  gateStatus: GateStatus;
  gateReason: string | null;
  inputsUsed: Record<string, unknown>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  insufficientData?: boolean;
};
