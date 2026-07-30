# n8n DocuSeal Webhook Workflow

Receives DocuSeal webhook events and writes back to Twenty. Configure DocuSeal webhook URL to `POST /webhook/re-contract/docuseal`.

## Webhook events

| DocuSeal event | Action |
|----------------|--------|
| `form.viewed` | `signatureStatus` → `VIEWED` |
| `form.completed` | attach sealed PDF, `signatureStatus` → `SIGNED`, `dealStage` → `UNDER_CONTRACT` |
| `form.declined` | `signatureStatus` → `DECLINED` |

## Workflow nodes

1. **Webhook (POST /webhook/re-contract/docuseal)** — raw JSON from DocuSeal.
2. **Function: Verify webhook secret** — assert `X-DocuSeal-Secret` === `DOCUSEAL_WEBHOOK_SECRET`; `401` on mismatch.
3. **Function: Parse event** — extract `event_type`, `data.id` (submission id), `data.metadata.opportunityId`.
4. **Function: Atomic idempotency claim** — key = `submissionId + event_type`. DONE → return stored; WON → continue.
5. **HTTP Request: GET Opportunity** — lookup by `signatureRequestId` if `opportunityId` missing from metadata.
6. **Switch: event_type**

### Branch: form.viewed

7a. **IF** `signatureStatus` already `VIEWED|SIGNED` → skip (idempotent).
8a. **PATCH** `{ "signatureStatus": "VIEWED" }`.

### Branch: form.completed

7b. **HTTP Request: download sealed PDF** — `GET ${DOCUSEAL_URL}/api/submissions/:id/documents` or webhook payload `documents[0].url`.
8b. **HTTP Request: uploadFilesFieldFile** — upload sealed PDF.
9b. **HTTP Request: create Attachment** — `id=uuidv5(opportunityId,'contract:signed')`, `targetOpportunityId`.
10b. **PATCH Opportunity**:
    ```json
    {
      "signatureStatus": "SIGNED",
      "dealStage": "UNDER_CONTRACT",
      "contractDate": "<today>",
      "signedContractUrl": {
        "primaryLinkLabel": "Signed contract",
        "primaryLinkUrl": "<sealedDocumentUrl>",
        "secondaryLinks": []
      }
    }
    ```
    Use `If-Match` etag; on `409` re-fetch and skip if already `UNDER_CONTRACT`.

### Branch: form.declined

7c. **PATCH** `{ "signatureStatus": "DECLINED" }`.

11. **Function: Finalize idempotency** — store result, TTL 30 days.
12. **Respond** — `200 { opportunityId, event_type, signatureStatus }`.

## Stage advance guard

Only advance `dealStage` to `UNDER_CONTRACT` when:
- `event_type` = `form.completed`
- Current `dealStage` = `OFFER_OUT`
- `signatureStatus` was not already `SIGNED`

This prevents duplicate task creation from `on-deal-stage-change` if webhook replays.

## DocuSeal webhook configuration

In DocuSeal admin → Webhooks:
- URL: `https://<n8n-host>/webhook/re-contract/docuseal`
- Secret: value of `DOCUSEAL_WEBHOOK_SECRET`
- Events: `form.viewed`, `form.completed`, `form.declined`

## Environment

| Variable | Purpose |
|----------|---------|
| `DOCUSEAL_URL` | DocuSeal API base |
| `DOCUSEAL_WEBHOOK_SECRET` | Webhook HMAC/secret verification |
| `TWENTY_API_URL` | Twenty REST base |
| `TWENTY_API_KEY` | Workspace API key |
