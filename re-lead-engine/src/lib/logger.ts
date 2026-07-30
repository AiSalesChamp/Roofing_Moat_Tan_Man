type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const activeLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';

const write = (level: LogLevel, scope: string, message: string, context?: unknown) => {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[activeLevel]) {
    return;
  }

  const stamp = new Date().toISOString();
  const prefix = `${stamp} ${level.toUpperCase().padEnd(5)} [${scope}]`;

  if (context === undefined) {
    process.stderr.write(`${prefix} ${message}\n`);
    return;
  }

  process.stderr.write(`${prefix} ${message} ${JSON.stringify(context)}\n`);
};

export type Logger = {
  debug: (message: string, context?: unknown) => void;
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
  child: (childScope: string) => Logger;
};

export const createLogger = (scope: string): Logger => ({
  debug: (message, context) => write('debug', scope, message, context),
  info: (message, context) => write('info', scope, message, context),
  warn: (message, context) => write('warn', scope, message, context),
  error: (message, context) => write('error', scope, message, context),
  child: (childScope) => createLogger(`${scope}:${childScope}`),
});
