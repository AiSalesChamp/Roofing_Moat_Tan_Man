import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal .env loader — one dependency avoided, and the parse rules are visible.
const loadDotEnv = () => {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env is valid — the process may be configured entirely by the environment.
  }
};

loadDotEnv();

const requireString = (key: string): string => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const optionalString = (key: string): string | undefined => {
  const value = process.env[key];

  return value === undefined || value === '' ? undefined : value;
};

const readInt = (key: string, fallback: number): number => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got "${value}"`);
  }

  return parsed;
};

const readBool = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return fallback;
  }

  return value === 'true' || value === '1';
};

export type ContactChannel = 'mail' | 'phone' | 'sms' | 'email' | 'ads';

export const env = {
  databaseUrl: requireString('ENGINE_DATABASE_URL'),

  twenty: {
    apiUrl: optionalString('TWENTY_API_URL'),
    apiKey: optionalString('TWENTY_API_KEY'),
  },

  // Seeds every Twenty record id the engine writes. MUST match the namespace the
  // fork's other integrations use (see .cursor/skills/re-acquisition-rest-writes),
  // or the same parcel gets one record from capture and a second from promotion.
  // optionalString, not `?? default` — an empty UUID_NAMESPACE= line in .env is
  // a string, not undefined, and would sail past a nullish default into a crash.
  uuidNamespace: optionalString('UUID_NAMESPACE') ?? '6ba7b810-9dad-11d1-80b4-00c04fd430c8',

  scraper: {
    contactEmail: optionalString('SCRAPER_CONTACT_EMAIL'),
    userAgentProduct: process.env.SCRAPER_USER_AGENT_PRODUCT ?? 're-lead-engine/0.1',
    minDelayMs: readInt('SCRAPER_MIN_DELAY_MS', 2500),
    maxConcurrencyPerHost: readInt('SCRAPER_MAX_CONCURRENCY_PER_HOST', 1),
    maxRetries: readInt('SCRAPER_MAX_RETRIES', 4),
    respectRobots: readBool('SCRAPER_RESPECT_ROBOTS', true),
  },

  promotion: {
    minScore: readInt('PROMOTION_MIN_SCORE', 60),
    lookbackDays: readInt('PROMOTION_DISTRESS_LOOKBACK_DAYS', 180),
    defaultChannel: (optionalString('PROMOTION_DEFAULT_CHANNEL') ?? 'mail') as ContactChannel,
  },

  // Read at call time, never cached into a decision. A channel is disabled until
  // its legal prerequisite is met, and for phone/SMS in Texas that prerequisite
  // is SB 140 telemarketer registration (SOS Form 3401 + $10k bond).
  channels: {
    mail: readBool('CHANNEL_MAIL_ENABLED', true),
    email: readBool('CHANNEL_EMAIL_ENABLED', false),
    phone: readBool('CHANNEL_PHONE_ENABLED', false),
    sms: readBool('CHANNEL_SMS_ENABLED', false),
    ads: readBool('CHANNEL_ADS_ENABLED', false),
  } satisfies Record<ContactChannel, boolean>,

  skipTrace: {
    vendor: process.env.SKIP_TRACE_VENDOR ?? 'stub',
    maxRecords: readInt('SKIP_TRACE_MAX_RECORDS', 1000),
    batchDataApiKey: optionalString('BATCHDATA_API_KEY'),
  },

  webhook: {
    port: readInt('WEBHOOK_PORT', 4310),
    sharedSecret: optionalString('WEBHOOK_SHARED_SECRET'),
  },
} as const;

// Read from process.env on every call rather than from the cached `env.channels`
// snapshot, so a long-running process (the webhook server) picks up a channel
// being switched off without a restart. Turning a channel OFF must take effect
// immediately; that is the whole point of a kill switch.
export const isChannelEnabled = (channel: ContactChannel): boolean =>
  readBool(`CHANNEL_${channel.toUpperCase()}_ENABLED`, env.channels[channel]);

export const buildUserAgent = (): string => {
  const contact = env.scraper.contactEmail;

  // A crawler that does not say who it is gets blocked, and deserves to be.
  return contact === undefined
    ? env.scraper.userAgentProduct
    : `${env.scraper.userAgentProduct} (+mailto:${contact})`;
};
