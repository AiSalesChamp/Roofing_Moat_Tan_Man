// Minimal flag parser: --key=value, --key value, and boolean --flag.
export type ParsedArgs = {
  flags: Record<string, string | boolean>;
  positional: string[];
};

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? '';

    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const body = token.slice(2);
    const equalsIndex = body.indexOf('=');

    if (equalsIndex !== -1) {
      flags[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];

    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next;
      index += 1;
      continue;
    }

    flags[body] = true;
  }

  return { flags, positional };
};

export const flagString = (args: ParsedArgs, name: string): string | undefined => {
  const value = args.flags[name];

  return typeof value === 'string' ? value : undefined;
};

export const flagBool = (args: ParsedArgs, name: string): boolean => args.flags[name] === true;

export const flagInt = (args: ParsedArgs, name: string): number | undefined => {
  const value = flagString(args, name);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`--${name} must be an integer, got "${value}"`);
  }

  return parsed;
};
