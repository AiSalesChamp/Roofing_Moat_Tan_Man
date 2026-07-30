# Offline Sync Spec (client)

Implementation-agnostic (Expo/RN phone today, glasses later). Concrete and contract-bound.

## 1. Durable local queue
- Crash-safe store (SQLite/WAL or platform equivalent), NOT in-memory. App kill / reboot on a roof must not lose captures.
- One row per CaptureBundle + one row per media object. Each row carries a `state` and only deletes after server-confirmed `DONE`.
- Compress BEFORE enqueue: JPEG ~2048px long edge @ q0.7 (~1-2MB target for cellular); audio 16kHz mono AAC, target ~2-3MB on cellular. Keep each file <= 10MB. Captures on `networkType=CELLULAR` MUST be compressed before enqueue; the server may `422` an obviously-uncompressed memo (bitrate > 64kbps or sampleRate > 24kHz for voice).

## 2. Identity / idempotency (generated at capture, immutable)
- `captureId` = UUID (v7 preferred for ordering). THE idempotency key; equals `Note.id`.
- Per media object: `pendingMediaId` = UUID. Per-media idempotency key sent as `Idempotency-Key` on phase-1 `POST /media`; server atomically claims it and returns the SAME `fileId` on replay (no duplicate blob).
- `clientSeq` = per-device monotonic counter persisted across reboots (Lamport order).
- Compute each media `sha256` (full file) at capture and send it in the phase-1 sidecar AND in the bundle (`audio.sha256` is REQUIRED; `photos[].sha256` recommended). It is the truncation + swapped-bytes guard.

## 3. Capture state machine (per bundle)
`QUEUED` -> `MEDIA_UPLOADING` -> `MEDIA_DONE` -> `SUBMITTING` -> `RESOLVED|REVIEW_PENDING|PARKED` -> `DONE` | `FAILED` | `CONFLICT` | `DEAD_LETTER`.
Per media: `PENDING -> UPLOADING -> UPLOADED(fileId)`. Bundle cannot enter `SUBMITTING` until every media is `UPLOADED`.

## 4. Two-phase + partial-media resume
- Phase 1: for each media still `PENDING`, `POST /media` with its `pendingMediaId`. On `200/201` store the returned `fileId` onto the queue row (persist immediately). Re-uploads ONLY what's missing.
- Phase 2: `POST /captures` with all `fileId`s. If response `state=PARTIAL` + `missingMediaIds`, mark only those media `PENDING` and re-run phase 1 for them - never re-upload already-stored media, never resubmit the whole bundle blindly. `missingReason=GC_SWEPT` vs `NEVER_UPLOADED` lets the UI say "reconnecting older capture" vs "finishing upload".
- Resume after crash: reload queue; any media with `fileId` is done; any without re-enters phase 1.

## 5. Resumable upload for large media (flaky cellular)
- For any media `> ~2MB` (e.g. an 8MB audio over 3G), use a **chunked/resumable** session keyed on `pendingMediaId` (tus or S3-style multipart-part):
  - create session -> `PUT` byte ranges with `Content-Range`; the server tracks the committed offset and returns it (`committedBytes`).
  - on a drop (TCP reset / timeout), resume from the server-acked offset - do NOT restart at byte 0. A drop at 95% re-sends only the tail.
  - finalize: server verifies the assembled full-file SHA-256, then calls `uploadFilesFieldFile` once -> `fileId`.
- Single-shot multipart remains fine for small media (photos, short memos).

## 6. Idempotency & integrity on the wire
- `Idempotency-Key: <captureId>` on `/captures`; `Idempotency-Key: <pendingMediaId>` on `/media`.
- Send `sha256` per media so a same-key replay with swapped bytes is caught server-side (`409 IDEMPOTENCY_KEY_CONFLICT` on /media, body-hash conflict on /captures) rather than silently accepted.
- A timed-out POST is safe to retry ONLY because of the idempotency key (it may have committed server-side). The server's atomic claim serializes a parallel double-submit.

## 7. Optimistic concurrency
- Store the `etag` (server `updatedAt`) returned on first success. On any later re-submit that edits the Note body, send `If-Match: <etag>`.
- `409 CONFLICT` -> fetch `serverRepresentation`, merge (default policy: append-only for Attachments, last-writer-wins per-field for capture fields, surface a UI merge only when the same Note body field diverged), resubmit with the new `If-Match`.

## 8. Retry / backoff (progress-aware)
- Retry on `408/429/500/502/503/504` + transport errors. Do NOT retry `400/401/403/404/413/415/422`. `409` -> merge/fix, not blind retry.
- Exponential backoff WITH full jitter: `delay = random(0, min(cap, base * 2^attempt))`, `base ~1s`, `cap ~5min`. Prevents the thundering herd when a whole crew regains signal. Honor `Retry-After` when present.
- **Budget against progress, not raw attempts**: for a resumable media upload, do NOT decrement the attempt budget on an attempt that advanced the committed byte offset. Key `DEAD_LETTER` on "no forward progress across N attempts," so a big audio that needs many short cellular windows isn't dead-lettered while it is still making headway. Separate the media-upload budget from the bundle-submit budget.
- `maxAttempts ~10` (no-progress) then move to a `DEAD_LETTER` queue surfaced in the UI - never silently drop.

## 9. Ordering / causality
- Intra-device order: `clientSeq`. Cross-record causality: a `dispositionUpdate` sets `dependsOn:[captureId]`; server `202 PARKED` until that capture's Note exists. Client treats `202` as success-pending, polls, does not error. The PATCH is applied once (server `dispositionApplied` guard), so re-polls don't re-advance the stage.
- Never order causal events by `capturedAt` (offline clock skew). Send `capturedAt` (with offset) + `timezone` + optional `deviceClockUncertaintyMs`; server trusts its own `receivedAt` for windows/tie-breaks.

## 10. GC safety (multi-day offline)
- Orphan-GC TTL is sized to the **offline-capture window** (`max(retryHorizon, offlineCaptureWindow)`, recommend >= 72h), NOT the minutes-scale retry horizon, because a device can be powered off overnight between phase-1 pre-upload and phase-2 submit. Still, submit the bundle as soon as connectivity allows.
- If `/captures` returns `PARTIAL` citing a file the client thought uploaded (`missingReason=GC_SWEPT`), re-run phase 1 for it - the `pendingMediaId` makes that safe and dedup-free.
