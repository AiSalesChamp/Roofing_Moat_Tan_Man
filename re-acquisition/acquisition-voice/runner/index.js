#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { extractWithOllama } from './ollama.js';
import { validateExtraction } from './validate.js';
import { TwentyWriter, writeSiteMemoExtraction } from './twenty-writer.js';
import { submitDraft } from './draft-client.js';

function parseArgs(argv) {
  const args = {
    transcript: null,
    callId: `call-${Date.now()}`,
    dryRun: false,
    skipCrm: false,
    direct: false,
    kind: 'seller-call',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--transcript' && argv[i + 1]) args.transcript = argv[++i];
    else if (a === '--call-id' && argv[i + 1]) args.callId = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-crm') args.skipCrm = true;
    else if (a === '--direct') args.direct = true;
    else if (a === '--kind' && argv[i + 1]) args.kind = argv[++i];
    else if (a === '--help') {
      console.log(
        [
          'Usage: node index.js --transcript <file> [--call-id <id>] [--kind seller-call|site-memo]',
          '',
          'Default: extraction lands as a PENDING DRAFT in the field-loop store',
          '(FIELD_LOOP_URL, default http://127.0.0.1:4680) for human confirm.',
          '',
          '  --direct    legacy behavior — write straight to Twenty, no draft/review',
          '  --dry-run   print extraction JSON, write nowhere',
          '  --skip-crm  alias of --dry-run',
        ].join('\n'),
      );
      process.exit(0);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.transcript) {
    console.error('Error: --transcript <file> is required');
    process.exit(1);
  }

  const transcriptBody = readFileSync(args.transcript, 'utf8');
  console.log(`Extracting from ${args.transcript} (callId=${args.callId})...`);

  const extraction = await extractWithOllama({
    transcript: transcriptBody,
    externalCallId: args.callId,
    kind: args.kind,
  });

  validateExtraction(extraction, args.kind);
  console.log('Schema validation passed.');

  if (args.dryRun || args.skipCrm) {
    console.log(JSON.stringify(extraction, null, 2));
    return;
  }

  if (args.direct) {
    const writer = new TwentyWriter({});
    const result =
      args.kind === 'site-memo'
        ? await writeSiteMemoExtraction(writer, extraction, transcriptBody)
        : await writer.writeSellerCallExtraction(extraction, transcriptBody);
    console.log('Twenty CRM upsert complete:', JSON.stringify(result, null, 2));
    return;
  }

  // Default: draft-and-confirm loop. The extraction waits in the field-loop
  // store for a human confirm (or earns an auto-commit from the policy).
  const result = await submitDraft({
    kind: args.kind,
    sourceId: args.callId,
    transcript: transcriptBody,
    extraction,
    meta: { source: 'acquisition-voice-runner', transcriptFile: args.transcript },
  });
  console.log(
    `Draft ${result.draft.id} → ${result.decision}` +
      (result.decision === 'pending' ? ' (review in PWA or glasses app)' : ''),
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
