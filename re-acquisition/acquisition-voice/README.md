# Acquisition Voice Extraction

Two LLM extraction pipelines that turn RE acquisition **voice** into structured Twenty CRM data:

1. **Seller call** transcripts (cold call / follow-up) → motivation, asking price, timeline, condition, follow-up commitments
2. **Site memo** (on-site voice memo) → property condition, access issues, comps, red flags, zoning notes

Both share an **identity/routing** block (property address + seller contact) so a call and a site memo land on the same Opportunity/Property.

```
acquisition-voice/
├── README.md
├── twenty-field-mapping.md
├── schemas/
│   ├── seller-call-extraction.schema.json
│   └── site-memo-extraction.schema.json
├── prompts/
│   ├── shared-guidelines.md
│   ├── seller-call-system-prompt.md
│   └── site-memo-system-prompt.md
└── samples/
    ├── seller-call-clean.txt
    └── site-memo.txt
```

## Pipelines

| | Seller Call | Site Memo |
|---|---|---|
| Input | Call transcript + CDR metadata | On-site voice memo |
| Primary match | Phone E.164 + property address | Property address + APN |
| Emphasis | Motivation, price, timeline, objections | Condition, access, comps, env/zoning |
| Target objects | Person, Opportunity, CallTranscript | Property, PropertyInspection, Opportunity |

## Evidence pattern

High-stakes fields (price, APN, dates) use `{value, quote}` — no quote means value is dropped.

See `twenty-field-mapping.md` for REST payload shapes.

## Runner output modes

```bash
cd runner
node index.js --transcript ../samples/seller-call-clean.txt --call-id call-1
```

- **Default**: extraction is submitted as a **pending draft** to the field-loop
  sidecar (`FIELD_LOOP_URL`, default `http://127.0.0.1:4680`) for human
  confirm — see `../field-loop/README.md`.
- `--direct`: legacy behavior, write straight to Twenty (no review loop).
- `--dry-run`: print the extraction JSON only.

Extraction uses Ollama structured outputs: the JSON schema is passed as the
`format` constraint and embedded in the system prompt, so any capable local
model (`OLLAMA_MODEL`) produces schema-valid JSON.
