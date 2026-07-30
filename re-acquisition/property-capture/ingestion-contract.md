# CaptureBundle Ingestion Contract (HTTP)

Base URL: `https://{n8n-host}/webhook/capture` (n8n-hosted). All routes HTTPS only. `workspaceId`, `ownerId`, `matchConfidence`, `matchedRecordId` are **server-derived** - never read from the body.

## Auth (JWT verification is MANDATORY)
- Header: `Authorization: Bearer <jwt>` exactly (Twenty reads `ExtractJwt.fromAuthHeaderAsBearerToken` - no other scheme works).
- The server **MUST cryptographically verify** the token before trusting any claim: verify signature against Twenty's signing key, **reject `alg: none`**, check `exp`/`nbf`, validate `iss` and `aud`, check token-type and revocation status. Only AFTER successful verification are `workspaceId`/`workspaceMemberId` derived from the **verified** claims - never from the raw token body. A missing/malformed/expired/bad-signature token -> `401 UNAUTHENTICATED`.
- Token type drives attribution: an `ACCESS` token embeds `workspaceMemberId` (owner/createdBy auto-attributed); an `API_KEY` token has none, so ingestion sets `ownerId` explicitly from a configured map.
- `workspaceId` derives from the verified token (`sub`/`workspaceId`). A token for workspace A can never touch workspace B - and this is only true *because* the signature is actually verified.
- Required role permissions: `UPLOAD_FILE` (phase 1) and create/update on Note/NoteTarget/Attachment/Opportunity. Missing -> `403 FORBIDDEN_PERMISSION`.

## Request-size guardrails (enforced BEFORE body parse)
- The webhook/proxy rejects with `413 PAYLOAD_TOO_LARGE` based on `Content-Length` **before** the JSON is parsed or buffered. Concrete caps:
  - max JSON body: **256 KB** (`/captures`).
  - max media references per bundle: **51** (1 audio + `photos` maxItems 50).
  - max aggregate referenced bytes across all media: **256 MB**.
  - per-file: **<= 10 MB**.
- Order on `/captures`: verify JWT -> rate-limit (per-rep + per-workspace) -> `Content-Length` cap -> THEN parse + JSON-Schema validate. The giant-body-parsed-before-throttle window is closed.

## Rate limits (server-enforced, both endpoints)
| Scope | `/media` | `/captures` | `CREATE_NEW` / extraction |
|---|---|---|---|
| per rep | 60 req/min, <=4 concurrent uploads | 30 req/min | 10/min (tighter bucket) |
| per workspace | 600 req/min | 300 req/min | global concurrency + spend cap + circuit breaker |

Over-limit -> `429 RATE_LIMITED` + `Retry-After`. Limits are enforced server-side regardless of client backoff (malicious clients ignore jitter).

## Two-phase upload

### Phase 1 - per-media pre-upload (atomic, idempotent, resumable)
`POST /media`
- Headers: `Authorization`, `Idempotency-Key: <pendingMediaId>`, `Content-Type: multipart/form-data`.
- Body: one binary part + sidecar JSON `{ mediaId, captureId, kind: "audio"|"photo", mimeType, filename, byteSize, sha256, sequenceIndex? }`. **Never base64-in-JSON** (33% inflation, blows the 10MB body limit).
- **Atomic dedupe**: server claims `pendingMediaId` via `SET NX`/`INSERT ON CONFLICT DO NOTHING` BEFORE upload. Claim winner uploads; claim loser waits for and returns the winner's `fileId`. A double-upload may transiently create an orphan blob that orphan-GC sweeps - the keyed store guarantees a single referenced `fileId`.
- **Integrity**: server computes SHA-256 of received bytes and asserts it equals the sidecar `sha256`; mismatch -> `400 INVALID_FILE` (truncation / swapped-bytes guard), no `fileId` returned. A same-`mediaId` replay with different `sha256` -> `409 IDEMPOTENCY_KEY_CONFLICT`. Verified hash is persisted with the `fileId`.
- Server re-sniffs magic bytes (`extractFileInfoOrThrow`); asserts sniffed MIME is in the **narrow** allowlist `{image/jpeg,image/png,image/webp,image/heic, audio/m4a, audio/wav}` (NOT broad `image/*`; `image/svg+xml` excluded), transcodes/strips trailing bytes to defeat polyglots, then calls Twenty `uploadFilesFieldFile(file, fieldMetadataId=<Attachment.file FILES-field id>)`. Note: `uploadFilesFieldFile` mints its own `fileId = v4()` per call and takes no client id - dedupe lives entirely in the atomic `pendingMediaId` claim store.
- **Resumable for large media**: for `byteSize > ~2 MB`, use a chunked session keyed on `pendingMediaId` (tus-style or S3-style multipart-part): create session -> `PUT` byte ranges with `Content-Range` (server tracks committed offset) -> finalize (server verifies full-file SHA-256, then calls `uploadFilesFieldFile` once) -> `fileId`. A flaky-cellular drop resumes from the server-acked offset, not byte 0.
- Response `201` (new) or `200` (replay):
```json
{ "mediaId": "...", "fileId": "<v4-uuid>", "status": "created|already_exists",
  "uploadComplete": true, "committedBytes": 0, "detectedMimeType": "image/jpeg", "receivedAt": "<iso>" }
```
- Limits: per-file <= 10MB; <= 10 files per multipart request (`graphql-upload maxFiles=10`); files are TEMPORARY until referenced by a bundle. **Orphan-GC TTL = `max(clientRetryHorizon, offlineCaptureWindow)`, recommend >= 72h** (battery-death + overnight + next-shift). Sizing it to the retry horizon alone would sweep day-1 pre-uploads before a day-2 bundle submit.

### Phase 2 - bundle submit
`POST /captures`
- Headers: `Authorization`, `Idempotency-Key: <captureId>`, `If-Match: <etag/updatedAt>` (omit on first submit), `Content-Type: application/json`.
- Body: a `CaptureBundle` (schema). Every media item must now carry a `fileId`. Any item still holding only `pendingMediaId` -> `200 { state: "PARTIAL", missingMediaIds: [...], missingReason: "NEVER_UPLOADED|GC_SWEPT" }`. `GC_SWEPT` tells the client a previously-uploaded file aged out and must be re-run through phase 1 (safe + dedup-free via `pendingMediaId`).

### Atomic idempotency claim (THE serialization point)
Server keys a dedicated row UNIQUE on `(workspaceId, captureId)`:
```sql
INSERT INTO capture_idempotency (workspaceId, captureId, bodyHash, state)
VALUES (:ws, :cap, :hash, 'IN_PROGRESS')
ON CONFLICT (workspaceId, captureId) DO NOTHING;  -- or Redis SET NX with TTL
```
Then re-read the row:
- **we won the claim** (no prior row) -> proceed to write; flip `state` to `DONE` + store `resultRecordIds` only after the final write step.
- **row exists, same `bodyHash`** -> return the original stored result (idempotent replay, no re-process). If still `IN_PROGRESS`, short-poll / return `202`.
- **row exists, different `bodyHash`** -> `409 IDEMPOTENCY_KEY_CONFLICT` immediately, **even while the original is IN_PROGRESS** (mutated-replay guard holds under parallelism, not just sequential replay).

`bodyHash` covers the JSON + each media `sha256`. The claim is written BEFORE any Twenty write, so a **parallel double-submit** of the same `captureId` is serialized: exactly one execution writes.

**Idempotency-record TTL** strictly exceeds the worst-case client retry horizon (sum of backoff up to `maxAttempts`), so a slow late retry still returns the stored result instead of re-entering the write path. TTL = `max(retryHorizon, offlineCaptureWindow)` (matches orphan-GC).

### Record-level idempotency on the Twenty side
- `captureId` = `Note.id`; per-photo Attachment ids deterministic (`uuidv5(captureId, "photo:"+sequenceIndex)`), audio `uuidv5(captureId, "audio")`.
- Twenty `?upsert=true` is an **application-level read-then-write** (findExistingRecords SELECT -> categorize -> separate insert/updateMany), NOT a Postgres `INSERT ... ON CONFLICT`, so it is NOT atomic on its own. The n8n claim is the only real serialization point. All writes still pass `?upsert=true` so a legit retry-after-commit UPDATES; any PK `unique_violation` is interpreted as "already committed by a concurrent/prior request" -> fetch + return the stored result, **never** propagated as a retryable 500.

## Response (200/201)
```json
{ "captureId": "...", "noteId": "...", "attachmentIds": ["..."],
  "state": "DONE | PARTIAL | CONFLICT | REVIEW_QUEUE | PARKED",
  "missingMediaIds": [], "missingReason": null, "etag": "<updatedAt>", "receivedAt": "<iso>",
  "resolution": { "decision": "AUTO_ATTACH | REVIEW_QUEUE | CREATE_NEW",
    "matchConfidence": 0, "matchMethod": "EXPLICIT_ID|PHONE|ADDRESS|NONE",
    "matchedRecordId": null, "candidates": [], "identityConflictFlag": false } }
```

## Record resolution (server-only)
1. Explicit `target.opportunityId/personId`: verify (a) exists, (b) in caller workspace, (c) caller has **record-level UPDATE permission** (Twenty `ObjectRecordPermission` / role scopes) on that specific record. Cross-workspace/absent -> `404 TARGET_NOT_FOUND` (never `403`, to avoid cross-tenant existence leak). In-workspace but unauthorized -> `403 FORBIDDEN_RECORD`. "In caller workspace" is necessary but NOT sufficient - this closes the intra-workspace cross-rep hijack. EXPLICIT_ID then wins.
2. Else hint match -> `matchConfidence` 0..100 (phone primary for CALL, address for DOOR_KNOCK/INSPECTION). Phone/address normalized server-side before matching; matcher input length-bounded (schema maxLengths) to cap cost. A hint-based AUTO_ATTACH onto an existing record ALSO requires record-level UPDATE permission, same as an explicit id.
3. Routing: `>=85` single unambiguous candidate AND `identityConflictFlag=false` -> **AUTO_ATTACH**. `50..84`, multiple candidates, or `identityConflictFlag=true` -> **REVIEW_QUEUE** (persist pending row + media, write NO business record). `<50` + door-knock new -> **CREATE_NEW** (Person/Opportunity owned by caller; tighter `CREATE_NEW` rate bucket; bursts flagged to REVIEW_QUEUE). `identityConflictFlag=true` HARD-BLOCKS auto-attach at any confidence.
Client-supplied confidence is ignored.

## State machine
`QUEUED(client)` -> `MEDIA_UPLOADING` -> (`PARTIAL` re-upload loop) -> `SUBMITTED` -> `CLAIMED` -> resolve: `RESOLVED` | `REVIEW_PENDING` | `PARKED`(disposition waiting on dependsOn) -> `WRITTEN` (Note+NoteTarget+Attachments) -> `EXTRACTION_TRIGGERED` (Whisper->Claude) -> `DONE`. Conflict path: `SUBMITTED` -> `CONFLICT(409)` -> client merge -> resubmit with new `If-Match`. A writer that claimed then crashed mid-sequence is safely re-driven once the claim TTL allows, since every sub-step is idempotent (`?upsert=true` + deterministic ids).

## Retryable vs terminal
- RETRY (with idempotency key, exp backoff + full jitter): `408, 429, 500, 502, 503, 504`, plus network timeout / connection reset (no HTTP response). Honor `Retry-After` on `429/503`.
- TERMINAL (do not retry): `400, 401, 403, 404, 413, 415, 422`. `409` is terminal-for-retry but triggers a MERGE flow (CONFLICT) or fix-and-resubmit (IDEMPOTENCY_KEY_CONFLICT), not a blind resend.

## Error catalog
| HTTP | code | meaning | client action |
|---|---|---|---|
| 400 | INVALID_BUNDLE | schema validation failed | fix, do not retry |
| 400 | INVALID_FILE | content/extension mismatch (sniff) or sha256 mismatch (truncation) | re-encode/re-upload |
| 401 | UNAUTHENTICATED | missing/malformed/expired/bad-signature token | refresh token, retry |
| 403 | FORBIDDEN_PERMISSION | role lacks UPLOAD_FILE / object write | terminal |
| 403 | FORBIDDEN_RECORD | in-workspace but no record-level UPDATE on target | terminal; drop to matchHints or escalate |
| 404 | TARGET_NOT_FOUND | explicit id absent or cross-workspace | drop to matchHints |
| 409 | CONFLICT | record updatedAt > If-Match | merge, resubmit |
| 409 | IDEMPOTENCY_KEY_CONFLICT | same key, different body/sha256 | regenerate captureId or restore body |
| 413 | PAYLOAD_TOO_LARGE | file>10MB / body>256KB / >51 refs / aggregate>256MB | compress / batch |
| 415 | UNSUPPORTED_MEDIA_TYPE | sniffed MIME not in narrow allowlist | drop file |
| 422 | UNPROCESSABLE | semantic (bad stage enum, duration>1800, bitrate/sampleRate over voice cap) | fix, terminal |
| 429 | RATE_LIMITED | per-rep/per-workspace cap | backoff per Retry-After |
| 202 | PARKED | disposition awaiting dependsOn capture | server retries; poll |

## PII governance (homeowner data)
Bundles carry third-party PII: homeowner voice, photos, exact GPS (`geo` + `exif.gps`), name, address, phone. The homeowner did not authenticate.
- **Retention**: REVIEW_QUEUE pending rows and orphaned media carry a retention TTL; expired rows + their media are purged.
- **Erasure**: a deletion path keyed by person/homeowner removes the Note, Attachments, media blobs, REVIEW_QUEUE rows, and derived transcripts.
- **EXIF GPS**: server-side stripping on ingest is the default policy (configurable retain-with-flag). Bundle `geo` is treated as sensitive.
- **Media access**: signed download URLs are short-TTL (<= 5 min), bound to the authenticated rep where possible, and every fetch re-checks record-level authorization (possession of a URL is not authorization). URLs are NEVER logged or stored in the idempotency/result store. Temp pre-upload store and permanent Attachment blobs are encrypted at rest. Media is served `Content-Disposition: attachment` with a restrictive `Content-Type`, never inline-rendered.
- **Audit log**: every media fetch and record attachment is logged (who, what, when).
- **Processor disclosure**: the Whisper->Claude extraction pipeline is a third-party processor; transcripts it produces are PII and inherit the same retention/erasure rules.
