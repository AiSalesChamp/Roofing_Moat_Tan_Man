---
name: re-contract-pipeline
description: End-to-end RE Acquisition contract pipeline — OFFER_OUT logic function, Gotenberg PDF, DocuSeal e-sign, n8n webhooks, and signatureStatus write-back to Twenty. Use when working on contract generation, e-signature, DocuSeal, Gotenberg, or dealStage OFFER_OUT / UNDER_CONTRACT automation.
---

# RE Contract Pipeline

Chain: `dealStage` → `OFFER_OUT` → logic fn → n8n → Gotenberg PDF → DocuSeal → webhook → `SIGNED` + `UNDER_CONTRACT`.

## Services (ports)

| Service | Port | Notes |
|---------|------|-------|
| Twenty API | 3000 | |
| Twenty front | 3001 | |
| Gotenberg | 3002 | Keep off 3000/3001 |
| DocuSeal | 3030 | |
| n8n | 5678 | |

```bash
docker compose -f re-acquisition/contracts/docker-compose.yml up -d
```

Templates: `re-acquisition/contracts/templates/` — `loi.html`, `purchase-sale-agreement.html`, `assignment-contract.html`.

## Trigger (SDK logic function)

`packages/twenty-apps/re-acquisition/src/logic-functions/on-offer-generate-contract.ts`

Fires on `opportunity.updated` when:

- `dealStage` newly equals `OFFER_OUT`
- `signatureStatus` is empty or `NOT_SENT`

Body to n8n: `{ opportunityId, contractType }`.

Contract type resolution:

- explicit Opportunity `contractType` if set
- else `dealType` includes `WHOLESALE` → `ASSIGNMENT`
- else → `PSA`
- also valid: `LOI`

Env on app: `N8N_CONTRACT_WEBHOOK_URL`, `N8N_CONTRACT_WEBHOOK_SECRET`.

## n8n generate flow

Import `re-acquisition/n8n-workflows/contract-generation.json`.

Entrypoint: `POST /webhook/re-contract/generate`

Order (see `contracts/contract-generation-flow.md`):

1. Verify `X-Webhook-Secret`
2. Atomic idempotency claim on `opportunityId`
3. GET Opportunity (+ Property, seller Person)
4. Resolve `contractType` → render HTML template
5. Gotenberg `POST /forms/chromium/convert/html` → PDF
6. GraphQL `uploadFilesFieldFile` → `fileId`
7. `POST /rest/attachments?upsert=true` with `uuidv5(opportunityId, 'contract:'+type)`
8. PATCH `{ signatureStatus: "GENERATED", contractType }`
9. DocuSeal create submission → PATCH `{ signatureStatus: "SENT", signatureRequestId }`

On Gotenberg/upload failure: leave `NOT_SENT` so retry can re-fire. Partial (PDF ok, DocuSeal fail): stay `GENERATED`.

## DocuSeal webhook

Entrypoint: `POST /webhook/re-contract/docuseal` — secret `DOCUSEAL_WEBHOOK_SECRET`.

| Event | Twenty action |
|-------|---------------|
| `form.viewed` | `signatureStatus` → `VIEWED` |
| `form.completed` | upload sealed PDF, `SIGNED`, `dealStage` → `UNDER_CONTRACT`, set `signedContractUrl` |
| `form.declined` | `signatureStatus` → `DECLINED` |

Idempotency key: `submissionId + event_type`. PATCH with `If-Match`; skip if already at target state.

## `signatureStatus` machine

`NOT_SENT` → `GENERATED` → `SENT` → `VIEWED` → `SIGNED` | `DECLINED`

Do not re-trigger generate if status is past `NOT_SENT`.

## First-time DocuSeal setup

1. http://localhost:3030 — admin account
2. API token → `DOCUSEAL_API_TOKEN`
3. Templates for LOI / PSA / Assignment
4. Webhook → n8n `/webhook/re-contract/docuseal` + secret

Verify Gotenberg:

```bash
curl -X POST http://localhost:3002/forms/chromium/convert/html \
  --form files=@re-acquisition/contracts/templates/loi.html -o /tmp/test-loi.pdf
```

## Checklist

- [ ] Contracts compose + AI/n8n stack running
- [ ] App `.env.local` has contract webhook URL/secret
- [ ] Logic fn published (`yarn twenty dev --once`)
- [ ] n8n workflows imported and **activated**
- [ ] DocuSeal webhook points at n8n (use `host.docker.internal` if needed)
- [ ] Writes use skill `re-acquisition-rest-writes` (GraphQL files, micros, uuidv5)

## References

- Write mapping: `re-acquisition/contracts/twenty-contract-write-mapping.md`
- Generate flow: `re-acquisition/contracts/contract-generation-flow.md`
- DocuSeal flow: `re-acquisition/contracts/docuseal-webhook-flow.md`
- Stages: skill `re-deal-stage-conventions`
- n8n skeleton: skill `n8n-twenty-flow`
