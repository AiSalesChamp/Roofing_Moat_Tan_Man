# n8n Contract Generation Workflow

Triggered by Twenty logic function `on-offer-generate-contract` when `dealStage` → `OFFER_OUT` and `signatureStatus` = `NOT_SENT`.

Entrypoint: `POST /webhook/re-contract/generate` (configure as `N8N_CONTRACT_WEBHOOK_URL`).

## Workflow nodes

1. **Webhook (POST /webhook/re-contract/generate)** — JSON body `{ opportunityId, contractType? }`. Reads `X-Webhook-Secret`.
2. **Function: Verify secret** — assert header === `N8N_CONTRACT_WEBHOOK_SECRET`; `401` on mismatch.
3. **Function: Atomic idempotency claim** — `INSERT (opportunityId, state=IN_PROGRESS) ON CONFLICT DO NOTHING`. Re-read: DONE → return stored result; IN_PROGRESS → `202`; WON → continue.
4. **HTTP Request: GET Opportunity** — `GET /rest/opportunities/:id?depth=1` with workspace API key. `404` if missing.
5. **HTTP Request: GET Property** — if `propertyId` present, `GET /rest/properties/:id`.
6. **HTTP Request: GET Person** — seller from `pointOfContactId`.
7. **Function: Resolve contractType** — use body `contractType` or map `dealType`: `WHOLESALE` → `ASSIGNMENT`, else `PSA`. Override with Opportunity `contractType` if set.
8. **Function: Build template data** — map fields per `templates/README.md`.
9. **Function: Render HTML** — load template file, replace `{{placeholders}}`.
10. **HTTP Request: Gotenberg convert** — `POST ${GOTENBERG_URL}/forms/chromium/convert/html` multipart `files=@rendered.html`. Returns PDF binary.
11. **HTTP Request: uploadFilesFieldFile** — GraphQL multipart upload (cached Attachment.file fieldMetadataId). Returns `fileId`.
12. **HTTP Request: create Attachment** — `POST /rest/attachments?upsert=true`, deterministic id `uuidv5(opportunityId, 'contract:'+contractType)`.
13. **HTTP Request: PATCH Opportunity** — `{ signatureStatus: "GENERATED", contractType }`.
14. **Execute Workflow: DocuSeal send** — call Workflow B with `{ opportunityId, fileId, contractType, pdfBase64 }`.
15. **Function: Finalize idempotency** — store `{ attachmentId, signatureRequestId, state: DONE }`.
16. **Respond to Webhook** — `200 { opportunityId, contractType, signatureStatus, attachmentId }`.

## Error handling

- Gotenberg timeout (30s): retry once, then `500` and leave `signatureStatus` at `NOT_SENT`
- Upload failure: do not PATCH opportunity; release idempotency claim for retry
- Partial success (PDF uploaded, DocuSeal failed): set `signatureStatus=GENERATED`, respond `207` with error detail

## Environment

| Variable | Purpose |
|----------|---------|
| `TWENTY_API_URL` | Twenty server base URL |
| `TWENTY_API_KEY` | Workspace API key for REST writes |
| `GOTENBERG_URL` | Default `http://gotenberg:3000` |
| `N8N_CONTRACT_WEBHOOK_SECRET` | Shared secret with logic function |
| `DOCUSEAL_URL` | DocuSeal API base |
| `DOCUSEAL_API_TOKEN` | DocuSeal API key |

## contractType → template file

| contractType | Template |
|--------------|----------|
| `LOI` | `templates/loi.html` |
| `PSA` | `templates/purchase-sale-agreement.html` |
| `ASSIGNMENT` | `templates/assignment-contract.html` |
