---
name: acquisition-voice-extraction
description: Run and extend RE Acquisition voice extraction — seller-call and site-memo pipelines from STT through Ollama to Twenty upserts with evidence-quoted fields. Use when working on acquisition-voice, transcribing calls/memos, extraction schemas/prompts, the CLI runner, or n8n voice-extraction webhooks.
---

# Acquisition Voice Extraction

Path: `re-acquisition/acquisition-voice/`

Two pipelines share identity/routing (address + seller) so a call and a site memo land on the same Property/Opportunity.

| Pipeline | Input | Primary match | Targets |
|----------|-------|---------------|---------|
| Seller call | Call transcript (+ CDR) | Phone E.164 + address | Person, Opportunity, CallTranscript |
| Site memo | On-site voice memo | Address + APN | Property, PropertyInspection, Opportunity |

## Evidence pattern (non-negotiable)

High-stakes fields (price, APN, dates) use `{ value, quote }`. **No quote → drop the value.** Never invent data not spoken or clearly implied.

See `prompts/shared-guidelines.md` and schemas under `schemas/`.

## End-to-end chain

```
audio → STT (faster-whisper) → Ollama extract → JSON Schema validate → Twenty REST upsert
```

### STT

```bash
cd re-acquisition/acquisition-voice/stt
pip install -r requirements.txt
python transcribe.py /path/to/call.m4a > transcript.txt
```

### CLI runner

```bash
cd re-acquisition/acquisition-voice/runner
npm install
TWENTY_API_KEY=... node index.js \
  --transcript ../samples/seller-call-clean.txt \
  --call-id test-call-001 \
  --kind seller-call   # or site-memo
# --dry-run  print JSON only
# --skip-crm validate without writing
```

Requires Ollama (`OLLAMA_BASE_URL`, default `qwen2.5:7b`). Samples: `samples/seller-call-clean.txt`, `samples/site-memo.txt`.

### n8n path

Import `re-acquisition/n8n-workflows/voice-extraction.json`.

`POST /webhook/re-voice/extract` — body with `transcript` and/or `audioPath`, plus `externalCallId` / capture id. Secret: `N8N_VOICE_WEBHOOK_SECRET`.

## Schemas and prompts

| Kind | Schema | System prompt |
|------|--------|---------------|
| seller-call | `schemas/seller-call-extraction.schema.json` | `prompts/seller-call-system-prompt.md` |
| site-memo | `schemas/site-memo-extraction.schema.json` | `prompts/site-memo-system-prompt.md` |

Shared rules: `prompts/shared-guidelines.md`.

When changing extraction shape: update schema + prompt + `twenty-field-mapping.md` + runner validate/writer together.

## Write mapping (summary)

Full payloads: [twenty-field-mapping.md](../../../re-acquisition/acquisition-voice/twenty-field-mapping.md). Use skill `re-acquisition-rest-writes` for shapes/order.

**Seller call:** Person (name/emails/phones) → Property/Opportunity (address, leadSource, motivation, askingPrice, dealType) → CallTranscript (body, outcome, extractedData RAW_JSON) → Tasks for follow-ups.

**Site memo:** Property → Opportunity → PropertyInspection (type, condition, findings) → comps as ComparableSale → PATCH `dealStage` to `OFFER_OUT` when `offerIntent=true`.

Ids: deterministic from `externalCallId` / `externalMemoId` (= captureId). Re-extraction **updates** findings/transcript/financials — do not duplicate records.

## Checklist for changes

- [ ] Schema still validates samples
- [ ] Evidence fields remain `{ value, quote }`
- [ ] Field mapping matches SDK SELECT options (publish app first)
- [ ] Runner `--dry-run` then live upsert against local Twenty
- [ ] n8n workflow still aligned if webhook path used

## References

- Field mapping: `re-acquisition/acquisition-voice/twenty-field-mapping.md`
- Stages: skill `re-deal-stage-conventions`
- REST: skill `re-acquisition-rest-writes`
- AI stack: skill `re-local-ai-stack`
