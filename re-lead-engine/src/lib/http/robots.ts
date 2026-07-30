import { buildUserAgent, env } from '../../config/env.ts';
import { createLogger } from '../logger.ts';

const logger = createLogger('robots');

type RobotsRules = {
  disallowed: readonly string[];
  allowed: readonly string[];
  crawlDelayMs: number | undefined;
};

const cache = new Map<string, RobotsRules>();

// Deliberately small parser: group by user-agent, keep the most specific group
// that applies to us, and read Allow/Disallow/Crawl-delay. Anything it cannot
// understand it ignores, which errs toward fetching — so the caller's own rate
// limit stays the real safety net.
const parseRobots = (body: string): RobotsRules => {
  const disallowed: string[] = [];
  const allowed: string[] = [];
  let crawlDelayMs: number | undefined;
  let appliesToUs = false;

  for (const line of body.split('\n')) {
    const withoutComment = line.split('#')[0] ?? '';
    const separatorIndex = withoutComment.indexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const directive = withoutComment.slice(0, separatorIndex).trim().toLowerCase();
    const value = withoutComment.slice(separatorIndex + 1).trim();

    if (directive === 'user-agent') {
      appliesToUs = value === '*' || buildUserAgent().toLowerCase().includes(value.toLowerCase());
      continue;
    }

    if (!appliesToUs) {
      continue;
    }

    if (directive === 'disallow' && value !== '') {
      disallowed.push(value);
    }

    if (directive === 'allow' && value !== '') {
      allowed.push(value);
    }

    if (directive === 'crawl-delay') {
      const seconds = Number.parseFloat(value);

      if (!Number.isNaN(seconds)) {
        crawlDelayMs = seconds * 1000;
      }
    }
  }

  return { disallowed, allowed, crawlDelayMs };
};

const fetchRobots = async (origin: string): Promise<RobotsRules> => {
  const cached = cache.get(origin);

  if (cached !== undefined) {
    return cached;
  }

  let rules: RobotsRules = { disallowed: [], allowed: [], crawlDelayMs: undefined };

  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': buildUserAgent() },
      signal: AbortSignal.timeout(15_000),
    });

    // A 404 means no restrictions were published. A 5xx means we do not know, and
    // "we do not know" is not permission — but blocking the whole run on a flaky
    // robots endpoint is worse, so we log and proceed under our own rate limit.
    if (response.ok) {
      rules = parseRobots(await response.text());
    } else if (response.status >= 500) {
      logger.warn('robots.txt unavailable, proceeding under local rate limit', {
        origin,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn('robots.txt fetch failed, proceeding under local rate limit', {
      origin,
      error: String(error),
    });
  }

  cache.set(origin, rules);

  return rules;
};

const matchesPrefix = (path: string, pattern: string): boolean => {
  // robots.txt wildcards: * matches any run, $ anchors the end.
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return path.startsWith(pattern);
  }

  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');

  return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(path);
};

export const isFetchAllowed = async (
  targetUrl: string,
): Promise<{ allowed: boolean; crawlDelayMs: number | undefined }> => {
  if (!env.scraper.respectRobots) {
    return { allowed: true, crawlDelayMs: undefined };
  }

  const url = new URL(targetUrl);
  const rules = await fetchRobots(url.origin);
  const path = `${url.pathname}${url.search}`;

  // Longest match wins, and Allow beats Disallow at equal length.
  const longestDisallow = rules.disallowed
    .filter((pattern) => matchesPrefix(path, pattern))
    .reduce((longest, pattern) => Math.max(longest, pattern.length), 0);
  const longestAllow = rules.allowed
    .filter((pattern) => matchesPrefix(path, pattern))
    .reduce((longest, pattern) => Math.max(longest, pattern.length), 0);

  return {
    allowed: longestDisallow === 0 || longestAllow >= longestDisallow,
    crawlDelayMs: rules.crawlDelayMs,
  };
};
