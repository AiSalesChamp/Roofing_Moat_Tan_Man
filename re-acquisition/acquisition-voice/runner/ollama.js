import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function loadPrompt(kind = 'seller-call') {
  const shared = readFileSync(join(ROOT, 'prompts/shared-guidelines.md'), 'utf8');
  const system = readFileSync(
    join(ROOT, `prompts/${kind}-system-prompt.md`),
    'utf8',
  );
  return `${shared}\n\n${system}\n\nRespond with ONLY valid JSON matching the schema. No markdown fences.`;
}

export function loadSchema(kind = 'seller-call') {
  const path = join(ROOT, `schemas/${kind}-extraction.schema.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function extractWithOllama({
  transcript,
  externalCallId,
  ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model = process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  kind = 'seller-call',
}) {
  const systemPrompt = loadPrompt(kind);
  const userContent = [
    `externalCallId: ${externalCallId}`,
    '',
    'TRANSCRIPT:',
    transcript,
  ].join('\n');

  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const raw = data.message?.content ?? '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Ollama returned non-JSON: ${raw.slice(0, 500)}`);
    parsed = JSON.parse(match[0]);
  }

  if (!parsed.extractionMeta) parsed.extractionMeta = {};
  parsed.extractionMeta.externalCallId =
    parsed.extractionMeta.externalCallId || externalCallId;

  return parsed;
}
