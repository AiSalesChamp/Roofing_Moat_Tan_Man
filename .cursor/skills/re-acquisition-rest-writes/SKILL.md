---
name: re-acquisition-rest-writes
description: Write correct Twenty REST upserts for the RE Acquisition app — composite field shapes, amountMicros currency, deterministic uuidv5 ids, topological write order, and GraphQL-only file upload. Use when building or editing capture, voice extraction, contract, n8n, or any integration that creates or updates Property, Opportunity, Note, Attachment, PropertyInspection, CallTranscript, Person, or ComparableSale records.
---

# RE Acquisition REST Writes

Use when writing Twenty records from integrations under `re-acquisition/` or logic that upserts the RE Acquisition data model.

## Hard rules

1. **CRUD = REST** — `POST ${TWENTY_API_URL}/rest/<plural>?upsert=true` with `Authorization: Bearer <token>`.
2. **Files = GraphQL only** — multipart `uploadFilesFieldFile` → `fileId`. Never upload files via REST.
3. **Never use stock `stage`** — pipeline position is `dealStage`. See `re-deal-stage-conventions`.
4. **SELECT values must already exist** — provisioned by publishing `packages/twenty-apps/re-acquisition`. Do not invent option strings.
5. **Deterministic ids** — use `uuidv5(seed, namespace)` so retries upsert instead of duplicating.

## Composite field shapes

| Type | Payload |
|------|---------|
| ADDRESS | `{ addressStreet1, addressStreet2, addressCity, addressState, addressPostcode, addressCountry }` |
| FULL_NAME | `{ firstName, lastName }` |
| EMAILS | `{ primaryEmail, additionalEmails: [] }` |
| PHONES | `{ primaryPhoneNumber, primaryPhoneCountryCode, primaryPhoneCallingCode, additionalPhones: null }` |
| CURRENCY | `{ amountMicros, currencyCode }` — dollars × `1_000_000` |
| RICH_TEXT | `{ markdown, blocknote }` (`blocknote` may be `null`) |
| RAW_JSON | arbitrary JSON (e.g. CallTranscript.extractedData) |
| MULTI_SELECT | string array, e.g. `["LAND", "WHOLESALE"]` |

```javascript
const toMicros = (dollars) => Math.round(Number(dollars) * 1_000_000);
// 250000 → { amountMicros: 250000000000, currencyCode: 'USD' }
```

## Deterministic ids

```javascript
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = process.env.UUID_NAMESPACE; // workspace-stable UUID
const propertyId = uuidv5(normalizedAddress, NAMESPACE);
const inspectionId = uuidv5(`${captureId}:inspection`, NAMESPACE);
const attachmentId = uuidv5(`${captureId}:photo:0`, NAMESPACE);
const contractAttachmentId = uuidv5(`${opportunityId}:contract:${contractType}`, NAMESPACE);
```

Prefer explicit authorized `target.opportunityId` / `propertyId` when the client supplies them.

## Write order

### Capture / voice ingestion

```
upload media (GraphQL) → Property → Opportunity → Person (if seller)
  → Note → NoteTarget → Attachments → PropertyInspection | CallTranscript
  → PATCH Opportunity (dealStage / financials) → Tasks
```

### Contract generation

```
GET Opportunity → render PDF → upload file (GraphQL) → Attachment
  → PATCH Opportunity (signatureStatus, contractType)
  → DocuSeal send → webhook PATCH (SIGNED → dealStage UNDER_CONTRACT)
```

Wrong order creates orphans or broken links. Property before Opportunity; `fileId` before Attachment.

## Example payloads

### Property

`POST /rest/properties?upsert=true`

```json
{
  "id": "<uuidv5>",
  "propertyAddress": {
    "addressStreet1": "4820 N Cave Creek Rd",
    "addressStreet2": null,
    "addressCity": "Phoenix",
    "addressState": "AZ",
    "addressPostcode": "85018",
    "addressCountry": "United States"
  },
  "apn": "123-45-678A",
  "county": "Maricopa",
  "propertyClass": "LAND"
}
```

Match key: normalized address **or** `apn`.

### Opportunity

`POST /rest/opportunities?upsert=true`

```json
{
  "id": "<uuidv5>",
  "name": "4820 N Cave Creek Rd — Capture 2026-07-19",
  "propertyId": "<propertyId>",
  "propertyAddress": { "...same ADDRESS shape..." },
  "dealStage": "SOURCED",
  "dealType": ["LAND"],
  "askingPrice": { "amountMicros": 250000000000, "currencyCode": "USD" }
}
```

### Note + target

```json
{
  "id": "<captureId>",
  "title": "Property capture - 2026-07-19 - DRIVE_BY",
  "bodyV2": { "markdown": "...", "blocknote": null }
}
```

```json
{ "noteId": "<captureId>", "targetOpportunityId": "<opportunityId>" }
```

### PropertyInspection

Map `captureOrigin` → `inspectionType`:

| captureOrigin | inspectionType |
|---------------|----------------|
| `DRIVE_BY` | `DRIVE_BY` |
| `SITE_WALK` | `WALKTHROUGH` |
| `PHOTO_LOG` | `WALKTHROUGH` |
| `VOICE_MEMO` | `DRIVE_BY` |

### Concurrent stage / status PATCH

```http
PATCH /rest/opportunities/:id
If-Match: <etag>

{ "dealStage": "QUALIFYING" }
```

On `409`: re-fetch; skip if target state already applied.

## Auth and tenancy

- Derive `workspaceId` / owner from verified JWT or API key — never trust body-supplied workspace.
- Explicit target ids require record-level UPDATE permission.
- From Docker n8n to host Twenty: use `host.docker.internal` in `TWENTY_API_URL`.

## References

- Capture mapping: [twenty-write-mapping.md](../../../re-acquisition/property-capture/twenty-write-mapping.md)
- Voice mapping: [twenty-field-mapping.md](../../../re-acquisition/acquisition-voice/twenty-field-mapping.md)
- Contract mapping: [twenty-contract-write-mapping.md](../../../re-acquisition/contracts/twenty-contract-write-mapping.md)
- n8n skeleton: see skill `n8n-twenty-flow`
- Enums / stages: see skill `re-deal-stage-conventions`
