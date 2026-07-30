import { buildUserAgent, env } from '../../config/env.ts';
import { createLogger } from '../logger.ts';
import { isFetchAllowed } from './robots.ts';

const logger = createLogger('http');

// One queue per host. Counties and law firms run modest infrastructure; a burst of
// parallel requests from one client is indistinguishable from an attack, and being
// blocked costs far more than the time saved.
type HostState = {
  lastRequestAt: number;
  inFlight: number;
  waiters: (() => void)[];
  crawlDelayMs: number | undefined;
};

const hosts = new Map<string, HostState>();

const getHostState = (host: string): HostState => {
  const existing = hosts.get(host);

  if (existing !== undefined) {
    return existing;
  }

  const created: HostState = {
    lastRequestAt: 0,
    inFlight: 0,
    waiters: [],
    crawlDelayMs: undefined,
  };
  hosts.set(host, created);

  return created;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const acquireSlot = async (state: HostState): Promise<void> => {
  while (state.inFlight >= env.scraper.maxConcurrencyPerHost) {
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }

  state.inFlight += 1;
};

const releaseSlot = (state: HostState): void => {
  state.inFlight -= 1;
  state.waiters.shift()?.();
};

// Full jitter: retry sleeps are random inside the backoff window rather than at its
// edge, so several failing requests do not resynchronize into a thundering herd.
const backoffWithJitter = (attempt: number): number => {
  const ceiling = Math.min(60_000, 1000 * 2 ** attempt);

  return Math.random() * ceiling;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type PoliteResponse = {
  url: string;
  status: number;
  body: string;
  bodyBytes: Uint8Array;
  contentType: string | undefined;
};

export type PoliteFetchOptions = {
  accept?: string;
  binary?: boolean;
};

export const politeFetch = async (
  targetUrl: string,
  options: PoliteFetchOptions = {},
): Promise<PoliteResponse> => {
  const url = new URL(targetUrl);
  const permission = await isFetchAllowed(targetUrl);

  if (!permission.allowed) {
    throw new Error(`robots.txt disallows ${targetUrl}`);
  }

  const state = getHostState(url.host);

  if (permission.crawlDelayMs !== undefined) {
    // A published Crawl-delay is a stated preference; honour it when it is
    // stricter than our own floor.
    state.crawlDelayMs = Math.max(state.crawlDelayMs ?? 0, permission.crawlDelayMs);
  }

  await acquireSlot(state);

  try {
    const minDelay = Math.max(env.scraper.minDelayMs, state.crawlDelayMs ?? 0);

    for (let attempt = 0; attempt <= env.scraper.maxRetries; attempt += 1) {
      const sinceLast = Date.now() - state.lastRequestAt;

      if (sinceLast < minDelay) {
        await sleep(minDelay - sinceLast);
      }

      if (attempt > 0) {
        await sleep(backoffWithJitter(attempt));
      }

      state.lastRequestAt = Date.now();

      try {
        const response = await fetch(targetUrl, {
          headers: {
            'user-agent': buildUserAgent(),
            accept: options.accept ?? 'application/json, text/html;q=0.9, */*;q=0.5',
            'accept-language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(45_000),
        });

        // Retry-After is authoritative when the server bothers to send it.
        if (response.status === 429) {
          const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);

          if (!Number.isNaN(retryAfter)) {
            logger.warn('rate limited, honouring Retry-After', { targetUrl, retryAfter });
            await sleep(retryAfter * 1000);
          }
        }

        if (RETRYABLE_STATUSES.has(response.status) && attempt < env.scraper.maxRetries) {
          logger.warn('retryable status', { targetUrl, status: response.status, attempt });
          continue;
        }

        const bodyBytes = new Uint8Array(await response.arrayBuffer());
        const body = options.binary === true ? '' : new TextDecoder().decode(bodyBytes);

        return {
          url: response.url,
          status: response.status,
          body,
          bodyBytes,
          contentType: response.headers.get('content-type') ?? undefined,
        };
      } catch (error) {
        if (attempt >= env.scraper.maxRetries) {
          throw error;
        }

        logger.warn('request failed, retrying', { targetUrl, attempt, error: String(error) });
      }
    }

    throw new Error(`exhausted retries for ${targetUrl}`);
  } finally {
    releaseSlot(state);
  }
};
