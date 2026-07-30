import { env } from '../config/env.ts';
import { createLogger } from '../lib/logger.ts';

const logger = createLogger('twenty');

export type TwentyClient = {
  upsert: (objectPlural: string, payload: Record<string, unknown>) => Promise<{ id: string }>;
  patch: (
    objectPlural: string,
    recordId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  isConfigured: boolean;
};

export class TwentyNotConfiguredError extends Error {
  constructor() {
    super(
      'TWENTY_API_URL and TWENTY_API_KEY must be set to promote. ' +
        'Run with --dry-run to see what would be written.',
    );
    this.name = 'TwentyNotConfiguredError';
  }
}

// Objects the engine writes. Kept explicit so a typo becomes an error here rather
// than a 404 against a plausible-looking endpoint.
export const TWENTY_OBJECTS = {
  properties: 'properties',
  people: 'people',
  distressEvents: 'distressEvents',
  contactConsents: 'contactConsents',
  dataSources: 'dataSources',
} as const;

const requestWithRetry = async (
  url: string,
  init: RequestInit,
  attempt = 0,
): Promise<Response> => {
  const response = await fetch(url, init);

  // 429 and 5xx are the CRM being busy, not the payload being wrong.
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const delay = Math.random() * Math.min(30_000, 1000 * 2 ** attempt);

    logger.warn('twenty request retrying', { url, status: response.status, attempt });
    await new Promise((resolve) => setTimeout(resolve, delay));

    return requestWithRetry(url, init, attempt + 1);
  }

  return response;
};

export const createTwentyClient = (): TwentyClient => {
  const apiUrl = env.twenty.apiUrl;
  const apiKey = env.twenty.apiKey;
  const isConfigured = apiUrl !== undefined && apiKey !== undefined;

  const headers = (): Record<string, string> => ({
    authorization: `Bearer ${apiKey ?? ''}`,
    'content-type': 'application/json',
  });

  return {
    isConfigured,

    upsert: async (objectPlural, payload) => {
      if (!isConfigured) {
        throw new TwentyNotConfiguredError();
      }

      // upsert=true plus a deterministic id is what makes re-promotion a no-op
      // instead of a duplicate. Matching is on the id we supply, not on a
      // heuristic address comparison.
      const response = await requestWithRetry(`${apiUrl}/rest/${objectPlural}?upsert=true`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Twenty upsert ${objectPlural} failed: ${response.status} ${body.slice(0, 500)}`,
        );
      }

      const body = (await response.json()) as {
        data?: Record<string, { id?: string }>;
        id?: string;
      };

      const id =
        body.id ?? Object.values(body.data ?? {}).find((entry) => entry?.id !== undefined)?.id;

      if (id === undefined) {
        throw new Error(`Twenty upsert ${objectPlural} returned no id`);
      }

      return { id };
    },

    patch: async (objectPlural, recordId, payload) => {
      if (!isConfigured) {
        throw new TwentyNotConfiguredError();
      }

      const response = await requestWithRetry(`${apiUrl}/rest/${objectPlural}/${recordId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Twenty patch ${objectPlural}/${recordId} failed: ${response.status} ${body.slice(0, 500)}`,
        );
      }
    },
  };
};

export const toMicros = (dollars: number): { amountMicros: number; currencyCode: string } => ({
  amountMicros: Math.round(dollars * 1_000_000),
  currencyCode: 'USD',
});
