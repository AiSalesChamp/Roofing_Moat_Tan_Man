# CaptureBundle -> Twenty write mapping (RE Acquisition)

Auth on every call: `Authorization: Bearer <jwt>`. `workspaceId` from verified token. File upload is GraphQL-multipart only; record CRUD via REST (`/rest`, plural object name, `?upsert=true`).

Topological order: uploads → property → opportunity → note → note-targets → attachments → propertyInspection → dealStage.

## Step 0 — resolve Attachment FILES-field metadata id (cached per workspace)

Same as before — query `attachment.file` field metadata id for uploads.

## Step 1 — upload each media (phase 1) → fileId

Unchanged from original contract. Returns v4 `fileId` per audio/photo.

## Step 2 — upsert Property (match by address or APN)

`POST /rest/properties?upsert=true`

```json
{
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

- Match key: normalized `{street1, city, state, zip}` OR `apn` if present.
- Use deterministic `id = uuidv5(normalizedAddress, 'property')` for replay-safe upsert when no server id yet.

## Step 3 — upsert Opportunity (linked to Property)

`POST /rest/opportunities?upsert=true`

```json
{
  "name": "4820 N Cave Creek Rd — Capture <date>",
  "propertyId": "<propertyId>",
  "propertyAddress": { "...same as property..." },
  "dealStage": "SOURCED",
  "dealType": ["LAND"]
}
```

- If `target.opportunityId` is explicit and authorized, skip create and use that id.
- Otherwise upsert by property + capture date or use deterministic id from capture bundle.

## Step 4 — create Note (bodyV2 placeholder, upsert)

`POST /rest/notes?upsert=true`

```json
{
  "id": "<captureId>",
  "title": "Property capture - <capturedAt date> - <captureOrigin>",
  "bodyV2": {
    "markdown": "[RE acquisition capture pending extraction]\n\n<clientNotes>",
    "blocknote": null
  }
}
```

## Step 5 — link Note to targets (NoteTarget, upsert)

`POST /rest/noteTargets?upsert=true`

```json
{ "noteId": "<captureId>", "targetOpportunityId": "<opportunityId>" }
```

Also link to Property if supported via note target, or attach files directly to PropertyInspection.

## Step 6 — create Attachment per file (upsert)

Same pattern as original — deterministic Attachment ids via uuidv5(captureId, 'audio' | 'photo:N').

Attach to Note, Opportunity, or PropertyInspection as appropriate.

## Step 7 — create PropertyInspection (upsert)

`POST /rest/propertyInspections?upsert=true`

```json
{
  "id": "<uuidv5(captureId, 'inspection')>",
  "inspectionType": "DRIVE_BY",
  "inspectionDate": "<capturedAt>",
  "findingsSummary": {
    "markdown": "[Pending voice extraction]",
    "blocknote": null
  },
  "inspectionPropertyId": "<propertyId>",
  "inspectionOpportunityId": "<opportunityId>"
}
```

Map `captureOrigin` → `inspectionType`:
- `DRIVE_BY` → `DRIVE_BY`
- `SITE_WALK` → `WALKTHROUGH`
- `PHOTO_LOG` → `WALKTHROUGH`
- `VOICE_MEMO` → `DRIVE_BY`

## Step 8 — update dealStage (optional, idempotent + If-Match)

`PATCH /rest/opportunities/<opportunityId>` with `If-Match: <etag>`

```json
{ "dealStage": "QUALIFYING" }
```

Accepted values: `SOURCED`, `QUALIFYING`, `OFFER_OUT`, `UNDER_CONTRACT`, `DUE_DILIGENCE`, `ACQUIRED`, `DISPOSITION`, `EXIT_CLOSED`, `DEAD`.

Example disposition rules:
- Site memo with offer intent → `OFFER_OUT`
- Drive-by with seller contact → `QUALIFYING`
- Applied at most once per captureId (same idempotency guard as before).

## Step 9 — trigger extraction

Fire `acquisition-voice` Whisper→LLM pipeline keyed by `captureId`. Re-extraction UPDATES `findingsSummary`, `CallTranscript`, and Opportunity financial fields instead of duplicating.

## Security

Same as original: workspaceId and ownerId from token; explicit targets require record-level UPDATE permission.
