import { createLogger } from '../../lib/logger.ts';
import type { SkipTraceRequest, SkipTraceResponse, SkipTraceVendor } from './types.ts';

const logger = createLogger('skip-trace:stub');

// Returns no_hit for everything, deliberately. A stub that invented plausible
// phone numbers would be indistinguishable from a working vendor in every report,
// and someone would eventually dial one.
export const stubVendor: SkipTraceVendor = {
  name: 'stub',
  isLive: false,

  trace: async (request: SkipTraceRequest): Promise<SkipTraceResponse> => {
    logger.info('stub skip trace, returning no_hit', { ownerId: request.ownerId });

    return {
      status: 'no_hit',
      confidence: undefined,
      phones: [],
      emails: [],
      costCents: 0,
      raw: { vendor: 'stub', note: 'no vendor connected; interface exercised only' },
    };
  },
};
