import { computeEntitleHoldMao, EntitleHoldInput } from './entitle-hold';
import {
  computeHyperscaleDispositionMao,
  HyperscaleDispositionInput,
} from './hyperscale-disposition';
import { ExitPathResult, ExitType } from './types';
import { computeWholesaleFlipMao, WholesaleFlipInput } from './wholesale-flip';

export type ComputeAllExitPathsInput = {
  wholesaleFlip: WholesaleFlipInput;
  entitleHold: EntitleHoldInput;
  hyperscaleDisposition: HyperscaleDispositionInput;
};

export type ExitPathSummary = ExitPathResult & { exitType: ExitType };

export type RecommendedExitType = ExitType | 'INSUFFICIENT_DATA';

export type AllExitPathsResult = {
  paths: ExitPathSummary[];
  recommendedExitType: RecommendedExitType;
};

// Runs all three exit-path formulas and picks the highest MAO among paths
// that passed their gate and produced a number — hyperscale's hard gate
// (and any path missing data) is excluded from the comparison entirely.
export const computeAllExitPaths = (
  input: ComputeAllExitPathsInput,
): AllExitPathsResult => {
  const paths: ExitPathSummary[] = [
    { exitType: 'WHOLESALE_FLIP', ...computeWholesaleFlipMao(input.wholesaleFlip) },
    { exitType: 'ENTITLE_HOLD', ...computeEntitleHoldMao(input.entitleHold) },
    {
      exitType: 'HYPERSCALE_DISPOSITION',
      ...computeHyperscaleDispositionMao(input.hyperscaleDisposition),
    },
  ];

  const eligible = paths.filter(
    (path): path is ExitPathSummary & { mao: number } =>
      path.gateStatus !== 'HARD_REJECTED' && path.mao !== null,
  );

  const recommendedExitType: RecommendedExitType =
    eligible.length === 0
      ? 'INSUFFICIENT_DATA'
      : eligible.reduce((best, path) => (path.mao > best.mao ? path : best)).exitType;

  return { paths, recommendedExitType };
};

export * from './comp-weighting';
export * from './constants';
export * from './entitle-hold';
export * from './hyperscale-disposition';
export * from './types';
export * from './wholesale-flip';
