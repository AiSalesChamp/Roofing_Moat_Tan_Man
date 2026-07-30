# n8n Ingestion Workflow (node-by-node)

Two webhook entrypoints share helper sub-nodes. All Twenty calls reuse the per-rep Bearer token forwarded from the incoming request, AFTER the token is cryptographically verified.

## Workflow A - `POST /media` (phase 1)
1. **Webhook (POST /media)** - `multipart/form-data`, raw binary enabled. Reads `Idempotency-Key` header (= `pendingMediaId`).
2. **Function: Verify JWT + Auth** - MANDATORY: verify signature, reject `alg:none`, check `exp`/`nbf`/`iss`/`aud`/revocation; derive `workspaceId`/`workspaceMemberId` from VERIFIED claims; reject any body-supplied `workspaceId`. `401` on failure. Per-rep upload rate-limit + concurrency cap (<=4) here.
3. **Function: Size + Sniff** - enforce `<=10MB` (`413`); magic-byte sniff, assert sniffed MIME in the NARROW allowlist (`image/jpeg|png|webp|heic`, `audio/m4a|wav`; SVG excluded) else `415`; assert filename ext matches else `400 INVALID_FILE`. Transcode/strip trailing bytes (anti-polyglot).
4. **Function: Verify sha256** - compute SHA-256 of received bytes; assert == sidecar `sha256` else `400 INVALID_FILE` (truncation guard). For `byteSize > ~2MB`, this runs at the resumable-session **finalize** over the assembled object.
5. **Function: Atomic claim by mediaId** - `SET NX`/`INSERT ON CONFLICT DO NOTHING` on `pendingMediaId` in the key store (Redis / a Twenty helper object). Re-read: claim HIT with same stored sha256 -> **Respond 200** with stored `fileId` (`status: already_exists`); HIT with different sha256 -> `409 IDEMPOTENCY_KEY_CONFLICT`; claim WON -> continue. (Claim is atomic, closing the TOCTOU race; loser of a concurrent claim waits + returns winner's fileId.)
6. **HTTP Request: uploadFilesFieldFile** - GraphQL multipart to Twenty (`fieldMetadataId` = cached Attachment.file FILES-field id). Returns `fileId` (`v4`).
7. **Function: Persist key** - store `pendingMediaId -> fileId` (+ verified sha256, receivedAt) on the claim row; flip to `UPLOADED`.
8. **Respond to Webhook** - `201 { mediaId, fileId, status:"created", uploadComplete:true, committedBytes, detectedMimeType, receivedAt }`.

(Resumable path: a session-create + range-`PUT` loop precedes step 6; the server tracks `committedBytes` and only calls step 6 at finalize.)

## Workflow B - `POST /captures` (phase 2)
1. **Webhook (POST /captures)** - JSON. Reads `Idempotency-Key` (= `captureId`) and `If-Match`.
2. **Function: Verify JWT + scope** - MANDATORY signature/exp/iss/aud/revocation verify; derive `workspaceId` from verified claims. `401` on failure.
3. **Function: Rate-limit + size gate** - per-rep + per-workspace token bucket; reject over -> `429 Retry-After`. Enforce `Content-Length <= 256KB` BEFORE buffering -> `413`. (Order: verify -> rate-limit -> size cap -> THEN parse.)
4. **Function: Validate bundle** - JSON-Schema validate (draft-07 CaptureBundle); reject body `workspaceId`/`ownerId`/`matchConfidence`/`matchedRecordId` -> `400`. Enforce media-ref count + aggregate bytes -> `413`.
5. **Function: Atomic idempotency claim** - `INSERT (workspaceId, captureId, bodyHash, state=IN_PROGRESS) ON CONFLICT (workspaceId, captureId) DO NOTHING`; re-read row. We WON -> continue. Row same bodyHash + DONE -> **Respond** stored result. Row same bodyHash + IN_PROGRESS -> **Respond 202**/short-poll. Row DIFFERENT bodyHash -> `409 IDEMPOTENCY_KEY_CONFLICT` (even while original IN_PROGRESS). This is the single serialization point for parallel double-submit.
6. **IF: All media uploaded** - any item with only `pendingMediaId` (no `fileId`) -> **Respond** `200 { state:"PARTIAL", missingMediaIds:[...], missingReason }`. Else continue.
7. **Function: Resolve record** - explicit `target.*Id`: verify exists + in-workspace (`404` if cross-tenant/absent) + record-level UPDATE permission (`403 FORBIDDEN_RECORD` if unauthorized). Else hint match -> `matchConfidence`, `matchMethod`, `identityConflictFlag`, `decision` (hint AUTO_ATTACH also requires record-level UPDATE).
8. **Switch: decision**
   - `REVIEW_QUEUE` -> **Twenty create** a ReviewQueue pending row (key `captureId`, media fileIds, hints, retention TTL); write NO business record. Respond `200 state:REVIEW_QUEUE`.
   - `CREATE_NEW` -> tighter rate bucket; **Twenty create** Person + Opportunity (owner = `ctx.workspaceMemberId`), then fall through to write.
   - `AUTO_ATTACH` -> fall through to write.
9. **HTTP Request: create Note (upsert)** - `POST /rest/notes?upsert=true` `id=captureId`, `bodyV2:{markdown:"[pending extraction]\n"+clientNotes, blocknote:null}`. PK `unique_violation` -> treat as already-committed: fetch + use stored result.
10. **HTTP Request: create NoteTarget(s) (upsert)** - `POST /rest/noteTargets?upsert=true`; `targetPersonId` and/or `targetOpportunityId` from resolution.
11. **Loop + HTTP Request: create Attachment per file (upsert)** - `POST /rest/attachments?upsert=true`; deterministic record `id=uuidv5(captureId,...)`; `file:[{fileId(v4),label}]`; one `target*Id`. Promotes temp files to permanent. `unique_violation` -> already-committed.
12. **IF dispositionUpdate** - check `dispositionApplied` flag (short-circuit if set) and `dependsOn` captures DONE; if not ready, **Respond** `202 PARKED` and enqueue a retry (n8n Wait/poll, single-writer). If ready -> **HTTP Request PATCH** `/rest/opportunities/:id { stage }` with `If-Match`; `409` -> surface for review, do not re-advance; on success set `dispositionApplied=true`.
13. **HTTP Request: trigger acquisition-voice extraction** - kick Whisper→LLM pipeline keyed by `captureId` to fill PropertyInspection/CallTranscript + Opportunity fields.
14. **Function: Finalize idempotency result** - flip claim row to `DONE`, store `captureId -> {noteId, attachmentIds, etag, state}` (TTL = max(retryHorizon, offlineCaptureWindow)). Only now is the write considered complete; a crash before this leaves the row IN_PROGRESS for safe re-drive under claim TTL.
15. **Respond to Webhook** - `200/201` with `noteId`, `attachmentIds`, `etag`, `resolution`, `receivedAt`.

Shared: a one-time/cached **Function: resolve Attachment.file fieldMetadataId** node (per-workspace metadata query) feeds Workflow A step 6.

Crash/re-drive: every write step is idempotent (`?upsert=true` + deterministic ids), so a writer that won the claim then crashed mid-sequence is re-driven once the claim TTL allows; progress recorded on the claim row lets retries resume rather than re-run blindly.
