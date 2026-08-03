#!/usr/bin/env node
// Backtest: run the real extraction pipeline (Ollama) over the seed eval set
// and grade each field against the golden extraction.
//
//   node scripts/backtest.js                  # grade all seeds
//   node scripts/backtest.js --runs 3         # repeat for stability
//   node scripts/backtest.js --submit         # also push drafts to field-loop
//   node scripts/backtest.js --seed <name>    # single seed
//
// Grading tiers per golden-populated field:
//   exact  — normalized equality (structured fields must land here)
//   fuzzy  — token-overlap/substring match (free-text fields)
//   miss   — wrong or absent
// Plus hallucination count: fields the model populated that golden says are empty.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractWithOllama } from '../../acquisition-voice/runner/ollama.js';
import { validateExtraction } from '../../acquisition-voice/runner/validate.js';
import { flattenExtraction, isEmptyValue, labelForPath } from '../server/fields.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '..', 'evals', 'seed');

function parseArgs(argv) {
  const args = { runs: 1, submit: false, seed: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--runs' && argv[i + 1]) args.runs = Number(argv[++i]);
    else if (argv[i] === '--submit') args.submit = true;
    else if (argv[i] === '--seed' && argv[i + 1]) args.seed = argv[++i];
  }
  return args;
}

const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\w\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function tokenOverlap(a, b) {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((t) => tb.has(t)).length;
  return inter / Math.min(ta.size, tb.size);
}

function gradeValue(golden, extracted) {
  if (isEmptyValue(extracted)) return 'miss';
  if (typeof golden === 'number') {
    const num = Number(String(extracted).replace(/[$,]/g, ''));
    return num === golden ? 'exact' : 'miss';
  }
  if (typeof golden === 'boolean') {
    return String(extracted).toLowerCase() === String(golden) ? 'exact' : 'miss';
  }
  if (Array.isArray(golden)) {
    const arr = Array.isArray(extracted) ? extracted : [extracted];
    const matched = golden.filter((g) =>
      arr.some((e) => tokenOverlap(JSON.stringify(g), JSON.stringify(e)) >= 0.5),
    ).length;
    if (matched === golden.length && arr.length === golden.length) return 'exact';
    return matched >= Math.ceil(golden.length / 2) ? 'fuzzy' : 'miss';
  }
  if (normalize(golden) === normalize(extracted)) return 'exact';
  const overlap = tokenOverlap(golden, extracted);
  if (overlap >= 0.5 || normalize(extracted).includes(normalize(golden)) || normalize(golden).includes(normalize(extracted))) {
    return 'fuzzy';
  }
  return 'miss';
}

// Quotes are display evidence, not extraction targets — exclude from scoring.
const gradablePath = (path) => !path.endsWith('.quote');

function gradeAgainstGolden(golden, extraction) {
  const goldenLeaves = new Map(
    flattenExtraction(golden).filter((l) => gradablePath(l.path)).map((l) => [l.path, l.value]),
  );
  const extractedLeaves = new Map(
    flattenExtraction(extraction).filter((l) => gradablePath(l.path)).map((l) => [l.path, l.value]),
  );
  const rows = [];
  let hallucinations = 0;
  for (const [path, goldenValue] of goldenLeaves) {
    if (isEmptyValue(goldenValue)) continue;
    rows.push({ path, golden: goldenValue, extracted: extractedLeaves.get(path) ?? null, grade: gradeValue(goldenValue, extractedLeaves.get(path)) });
  }
  for (const [path, extractedValue] of extractedLeaves) {
    if (isEmptyValue(extractedValue)) continue;
    if (isEmptyValue(goldenLeaves.get(path))) hallucinations += 1;
  }
  return { rows, hallucinations };
}

async function submitDraftToFieldLoop(seed, extraction, transcript) {
  const url = (process.env.FIELD_LOOP_URL || 'http://127.0.0.1:4680').replace(/\/$/, '');
  const res = await fetch(`${url}/api/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.FIELD_LOOP_SECRET
        ? { 'X-Field-Loop-Secret': process.env.FIELD_LOOP_SECRET }
        : {}),
    },
    body: JSON.stringify({
      kind: seed.kind,
      sourceId: `${seed.sourceId}-${Date.now()}`,
      transcript,
      extraction,
      meta: { source: 'backtest' },
    }),
  });
  if (!res.ok) throw new Error(`field-loop submit failed: ${res.status}`);
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv);
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
  const seedFiles = readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !args.seed || f.includes(args.seed));
  if (!seedFiles.length) {
    console.error('No seed files matched.');
    process.exit(1);
  }
  console.log(`Backtest: ${seedFiles.length} seed(s) × ${args.runs} run(s), model=${model}\n`);

  const totals = { exact: 0, fuzzy: 0, miss: 0, hallucinations: 0, fields: 0 };
  for (const file of seedFiles) {
    const seed = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8'));
    const transcript = readFileSync(join(SEED_DIR, seed.transcriptFile), 'utf8');
    for (let run = 1; run <= args.runs; run++) {
      const started = Date.now();
      const idKey = seed.kind === 'site-memo' ? 'externalMemoId' : 'externalCallId';
      let extraction;
      try {
        extraction = await extractWithOllama({
          transcript,
          externalCallId: seed.sourceId,
          kind: seed.kind,
        });
        if (!extraction.extractionMeta[idKey]) extraction.extractionMeta[idKey] = seed.sourceId;
        validateExtraction(extraction, seed.kind);
      } catch (err) {
        console.log(`✗ ${seed.sourceId} run ${run}: EXTRACTION FAILED — ${err.message}\n`);
        continue;
      }
      const { rows, hallucinations } = gradeAgainstGolden(seed.golden, extraction);
      const counts = { exact: 0, fuzzy: 0, miss: 0 };
      for (const row of rows) counts[row.grade] += 1;
      totals.exact += counts.exact;
      totals.fuzzy += counts.fuzzy;
      totals.miss += counts.miss;
      totals.hallucinations += hallucinations;
      totals.fields += rows.length;

      console.log(
        `${seed.sourceId} run ${run} (${((Date.now() - started) / 1000).toFixed(1)}s): ` +
          `${counts.exact} exact, ${counts.fuzzy} fuzzy, ${counts.miss} miss, ${hallucinations} hallucinated`,
      );
      for (const row of rows) {
        const icon = row.grade === 'exact' ? '✓' : row.grade === 'fuzzy' ? '≈' : '✗';
        const shown = (v) => JSON.stringify(v)?.slice(0, 60);
        console.log(
          `  ${icon} ${labelForPath(row.path).padEnd(18)} golden=${shown(row.golden)}` +
            (row.grade === 'exact' ? '' : ` got=${shown(row.extracted)}`),
        );
      }
      console.log('');

      if (args.submit) {
        const result = await submitDraftToFieldLoop(seed, extraction, transcript);
        console.log(`  → draft ${result.draft.id} (${result.decision})\n`);
      }
    }
  }

  const hit = totals.exact + totals.fuzzy;
  console.log('— Backtest summary —');
  console.log(`fields graded: ${totals.fields}`);
  console.log(`exact: ${totals.exact}  fuzzy: ${totals.fuzzy}  miss: ${totals.miss}  hallucinated: ${totals.hallucinations}`);
  console.log(
    `hit rate (exact+fuzzy): ${totals.fields ? ((hit / totals.fields) * 100).toFixed(1) : 0}%  ` +
      `strict rate (exact): ${totals.fields ? ((totals.exact / totals.fields) * 100).toFixed(1) : 0}%`,
  );
  console.log(
    '\nReminder: the March of Nines is measured here. The loop ships while accuracy < 100% —\n' +
      'confirm/edit beats typing — and autonomy only ratchets up per field as this number earns it.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
