# Twenty contract write mapping

Auth on every call: `Authorization: Bearer <jwt>`. Record CRUD via REST (`/rest`, plural object name, `?upsert=true`). File upload is GraphQL-multipart only.

Topological order: fetch opportunity → render PDF → upload file → attachment → patch opportunity → DocuSeal send → webhook patch.

## Step 0 — fetch Opportunity + related records

`GET /rest/opportunities/<opportunityId>?depth=1`

Resolve:
- `property` via `propertyId`
- `pointOfContact` (seller Person) via standard relation
- `buyerAssigned` for assignment contracts

## Step 1 — render contract PDF (Gotenberg)

n8n loads template from `templates/<contractType>.html`, replaces `{{placeholders}}`, POSTs to Gotenberg:

```
POST ${GOTENBERG_URL}/forms/chromium/convert/html
Content-Type: multipart/form-data
files=@rendered.html
```

Returns binary PDF bytes.

## Step 2 — upload PDF to Twenty

GraphQL multipart `uploadFilesFieldFile` (same pattern as property-capture Step 1). Returns `fileId` (v4).

## Step 3 — create Attachment on Opportunity (upsert)

`POST /rest/attachments?upsert=true`

```json
{
  "id": "<uuidv5(opportunityId, 'contract:<contractType>')>",
  "name": "<contractType>-<propertyAddress-slug>.pdf",
  "file": [{ "fileId": "<fileId>", "label": "contract-draft" }],
  "targetOpportunityId": "<opportunityId>"
}
```

## Step 4 — patch Opportunity (generated)

`PATCH /rest/opportunities/<opportunityId>` with `If-Match: <etag>`

```json
{
  "signatureStatus": "GENERATED",
  "contractType": "PSA"
}
```

## Step 5 — DocuSeal: create submission

`POST ${DOCUSEAL_URL}/api/submissions`

```json
{
  "template_id": "<docuseal_template_id>",
  "send_email": true,
  "submitters": [
    {
      "role": "Seller",
      "email": "<sellerEmail>",
      "name": "<sellerName>"
    },
    {
      "role": "Buyer",
      "email": "<buyerEmail>",
      "name": "<buyerEntityName>"
    }
  ],
  "documents": [
    {
      "name": "contract.pdf",
      "file": "<base64 pdf>"
    }
  ],
  "metadata": {
    "opportunityId": "<opportunityId>",
    "workspaceId": "<workspaceId>"
  }
}
```

Store returned `id` as `signatureRequestId`.

## Step 6 — patch Opportunity (sent)

`PATCH /rest/opportunities/<opportunityId>`

```json
{
  "signatureStatus": "SENT",
  "signatureRequestId": "<docusealSubmissionId>",
  "contractSentDate": "<ISO8601>",
  "signedContractUrl": {
    "primaryLinkLabel": "Sign contract",
    "primaryLinkUrl": "<docusealSigningUrl>",
    "secondaryLinks": []
  }
}
```

## Step 7 — DocuSeal webhook: form.viewed

`PATCH /rest/opportunities/<opportunityId>`

```json
{ "signatureStatus": "VIEWED" }
```

Idempotent: skip if already `VIEWED`, `SIGNED`, or `DECLINED`.

## Step 8 — DocuSeal webhook: form.completed

1. `GET ${DOCUSEAL_URL}/api/submissions/<id>/documents` — download sealed PDF
2. Upload sealed PDF → `fileId`
3. `POST /rest/attachments?upsert=true` with `id=uuidv5(opportunityId,'contract:signed')`
4. `PATCH /rest/opportunities/<opportunityId>`:

```json
{
  "signatureStatus": "SIGNED",
  "dealStage": "UNDER_CONTRACT",
  "contractDate": "<today ISO date>",
  "signedContractUrl": {
    "primaryLinkLabel": "Signed contract",
    "primaryLinkUrl": "<docusealDocumentUrl>",
    "secondaryLinks": []
  }
}
```

`on-deal-stage-change` logic function auto-creates title / EMD / DD tasks.

## Step 9 — DocuSeal webhook: form.declined

```json
{ "signatureStatus": "DECLINED" }
```

## Idempotency

- Attachment ids: deterministic `uuidv5(opportunityId, 'contract:<type>')` and `uuidv5(opportunityId, 'contract:signed')`
- Webhook handler: claim row on `signatureRequestId` + event type; replay returns stored result
- Stage advance: only when `signatureStatus` transitions to `SIGNED` and `dealStage` is `OFFER_OUT`

## Security

- Contract webhook: verify `X-Webhook-Secret` header matches `N8N_CONTRACT_WEBHOOK_SECRET`
- DocuSeal webhook: verify `X-DocuSeal-Secret` matches `DOCUSEAL_WEBHOOK_SECRET`
- Twenty writes: workspace-scoped API key or forwarded Bearer JWT
