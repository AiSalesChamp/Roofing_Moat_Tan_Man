---
name: property-capture-pwa
description: Build and extend the RE Acquisition property-capture PWA and CaptureBundle contract — offline IndexedDB queue, two-phase media then bundle sync, captureOrigin mapping, and n8n ingestion. Use when working on field capture, offline sync, capture schemas, or the phone PWA under re-acquisition/property-capture.
---

# Property Capture PWA + CaptureBundle

Path: `re-acquisition/property-capture/`

Device captures voice + photos offline, then two-phase uploads into Twenty via n8n. The envelope is **CaptureBundle** — client-known data only. Never put `workspaceId`, `ownerId`, or server match ids in the bundle.

## Key docs

| File | Purpose |
|------|---------|
| `schemas/capture-bundle.schema.json` | Envelope schema |
| `ingestion-contract.md` | Auth, upload, idempotency HTTP |
| `twenty-write-mapping.md` | REST/GraphQL writes |
| `offline-sync-spec.md` | Client queue + state machine |
| `n8n-ingestion-flow.md` | `/media` and `/captures` flows |
| `pwa/` | v0 phone app |

## `captureOrigin`

| Value | Use |
|-------|-----|
| `DRIVE_BY` | Quick drive-by + photos + voice |
| `SITE_WALK` | On-site walkthrough |
| `PHOTO_LOG` | Photos only |
| `VOICE_MEMO` | Voice only |

Match key: normalized address → APN → explicit authorized `opportunityId` / `propertyId`.

## Two-phase sync (required)

1. **Phase 1 — media:** `POST /webhook/re-capture/media` per file → `fileId`. Idempotency key = `pendingMediaId`. Persist `fileId` immediately.
2. **Phase 2 — bundle:** `POST /webhook/re-capture/bundle` with all `fileId`s. Idempotency key = `captureId` (= Note.id).

Bundle must not submit until every media is `UPLOADED`. On `PARTIAL` + `missingMediaIds`, re-upload only missing media — never blind full resubmit.

n8n JSON: `capture-media-upload.json`, `capture-bundle-submit.json`.

## Client state machine

```
QUEUED → MEDIA_UPLOADING → MEDIA_DONE → SUBMITTING
  → RESOLVED | REVIEW_PENDING | PARKED → DONE
  | FAILED | CONFLICT | DEAD_LETTER
```

Per media: `PENDING → UPLOADING → UPLOADED(fileId)`.

`captureId` = UUID (v7 preferred), immutable. Compress before enqueue on cellular (JPEG ~2048px q0.7; audio 16kHz mono AAC; ≤10MB/file).

## Server write sequence

```
uploads → Property → Opportunity → Note → NoteTarget
  → Attachments → PropertyInspection → optional dealStage PATCH
  → trigger acquisition-voice extraction
```

Details: skill `re-acquisition-rest-writes` + `twenty-write-mapping.md`.

`captureOrigin` → `inspectionType`: `DRIVE_BY`/`VOICE_MEMO` → `DRIVE_BY`; `SITE_WALK`/`PHOTO_LOG` → `WALKTHROUGH`.

## PWA v0

```bash
cd re-acquisition/property-capture/pwa
npx serve -l 3080
# Phone: http://<lan-ip>:3080
```

| File | Role |
|------|------|
| `app.js` | UI: address, GPS, camera, hold-to-record |
| `db.js` | IndexedDB queue |
| `sync.js` | Two-phase upload + retry |
| `sw.js` | Service worker |

Settings: n8n base URL (LAN IP from phone), webhook secret = `N8N_CAPTURE_WEBHOOK_SECRET`.

Prereqs: Twenty up, AI stack up, capture n8n workflows imported/activated.

## When changing capture

- [ ] Update `capture-bundle.schema.json` + samples
- [ ] Keep phase-1 before phase-2; never send server ids from client
- [ ] Align PWA `sync.js` with `ingestion-contract.md`
- [ ] Align n8n flows + `twenty-write-mapping.md`
- [ ] Idempotency keys: `pendingMediaId` (media), `captureId` (bundle)
- [ ] Retry only on 408/429/5xx; merge on 409; never retry 4xx auth/validation

## References

- Offline spec: `re-acquisition/property-capture/offline-sync-spec.md`
- Voice after capture: skill `acquisition-voice-extraction`
- n8n skeleton: skill `n8n-twenty-flow`
- Stages: skill `re-deal-stage-conventions`
