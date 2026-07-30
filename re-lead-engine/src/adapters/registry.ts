import { lgbsAdapter } from './distress/lgbs.adapter.ts';
import { pbfcmAdapter } from './distress/pbfcm.adapter.ts';
import type { DistressAdapter } from './types.ts';

// Adding a distress source is one import and one entry. Everything downstream —
// persistence, matching, scoring, health checks — works off the shared interface.
const DISTRESS_ADAPTERS: readonly DistressAdapter[] = [lgbsAdapter, pbfcmAdapter];

export const getDistressAdapter = (sourceName: string): DistressAdapter => {
  const adapter = DISTRESS_ADAPTERS.find((entry) => entry.sourceName === sourceName);

  if (adapter === undefined) {
    throw new Error(
      `Unknown distress source "${sourceName}". Known: ${DISTRESS_ADAPTERS.map(
        (entry) => entry.sourceName,
      ).join(', ')}`,
    );
  }

  return adapter;
};

export const listDistressAdapters = (): readonly DistressAdapter[] => DISTRESS_ADAPTERS;
