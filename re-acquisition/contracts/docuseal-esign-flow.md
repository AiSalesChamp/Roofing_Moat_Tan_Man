# n8n DocuSeal E-Sign Send Workflow

Sub-workflow called from contract generation after PDF is attached. Can also be triggered manually for re-send.

Entrypoint: internal sub-workflow or `POST /webhook/re-contract/send`.

## Input

```json
{
  "opportunityId": "uuid",
  "fileId": "uuid",
  "contractType": "PSA",
  "pdfBase64": "..."
}
```

## Workflow nodes

1. **Trigger** — sub-workflow input or webhook.
2. **HTTP Request: GET Opportunity** — fetch current `signatureStatus`, `signatureRequestId`, seller contact.
3. **IF: already SENT or SIGNED** — if `signatureRequestId` exists and status is `SENT|VIEWED|SIGNED`, return existing submission (idempotent).
4. **HTTP Request: GET Person** — seller email + name from `pointOfContact`.
5. **HTTP Request: DocuSeal create submission** — `POST ${DOCUSEAL_URL}/api/submissions` with:
   - `template_id` from env `DOCUSEAL_TEMPLATE_<contractType>` (e.g. `DOCUSEAL_TEMPLATE_PSA`)
   - `submitters`: Seller (seller email), Buyer (workspace default buyer email)
   - `documents`: uploaded PDF or reference to pre-uploaded DocuSeal template
   - `metadata.opportunityId` for webhook routing
6. **Function: Extract signing URL** — from response `submitters[0].embed_src` or `submitters[0].url`.
7. **HTTP Request: PATCH Opportunity** — set:
   ```json
   {
     "signatureStatus": "SENT",
     "signatureRequestId": "<submissionId>",
     "contractSentDate": "<now ISO8601>",
     "signedContractUrl": {
       "primaryLinkLabel": "Sign contract",
       "primaryLinkUrl": "<signingUrl>",
       "secondaryLinks": []
     }
   }
   ```
8. **Respond** — `{ opportunityId, signatureRequestId, signingUrl }`.

## DocuSeal template setup

Create one DocuSeal template per contract type with signature fields for Seller and Buyer roles. Store template IDs in n8n credentials or env:

```
DOCUSEAL_TEMPLATE_LOI=1
DOCUSEAL_TEMPLATE_PSA=2
DOCUSEAL_TEMPLATE_ASSIGNMENT=3
```

## Re-send rules

- Only re-send when `signatureStatus` is `GENERATED` or `DECLINED`
- New submission gets new `signatureRequestId`; old submission archived in DocuSeal

## Environment

| Variable | Purpose |
|----------|---------|
| `DOCUSEAL_URL` | Default `http://docuseal:3000` |
| `DOCUSEAL_API_TOKEN` | API authentication |
| `DOCUSEAL_TEMPLATE_LOI` | DocuSeal template id |
| `DOCUSEAL_TEMPLATE_PSA` | DocuSeal template id |
| `DOCUSEAL_TEMPLATE_ASSIGNMENT` | DocuSeal template id |
| `BUYER_SIGNER_EMAIL` | Default acquirer signer email |
| `BUYER_SIGNER_NAME` | Default acquirer entity name |
