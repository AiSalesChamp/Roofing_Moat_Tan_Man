# Property Capture — CaptureBundle Contract

Device-agnostic field-capture contract feeding the RE acquisition voice pipeline into [Twenty](https://twenty.com) via an [n8n](https://n8n.io) ingestion endpoint.

An acquisitions rep — phone today, smart glasses tomorrow — records a voice memo + property photos against a deal or parcel, the device queues it offline, then two-phase uploads it. The server resolves the Property/Opportunity, writes Note + NoteTarget + Attachments + PropertyInspection into Twenty, optionally advances `dealStage`, and triggers the Whisper→LLM extraction pipeline.

## What the contract is

A single JSON envelope — `CaptureBundle` (`schemas/capture-bundle.schema.json`) — plus HTTP ingestion contract, Twenty write mapping, offline-sync spec, and n8n flow.

The envelope carries **only what the client knows**. It NEVER carries `workspaceId`, `ownerId`, or server-resolved match ids.

| File | Purpose |
|---|---|
| `schemas/capture-bundle.schema.json` | Envelope schema (draft-07) |
| `ingestion-contract.md` | HTTP contract: auth, upload, idempotency |
| `twenty-write-mapping.md` | CaptureBundle → Twenty REST/GraphQL writes |
| `offline-sync-spec.md` | Client durable queue and retry |
| `n8n-ingestion-flow.md` | n8n workflows for `/media` and `/captures` |

## Capture types

| `captureOrigin` | Use case |
|---|---|
| `DRIVE_BY` | Quick drive-by with photos + voice note |
| `SITE_WALK` | On-site walkthrough inspection |
| `PHOTO_LOG` | Photo-only property documentation |
| `VOICE_MEMO` | Voice memo without photos |

## Match key

Primary resolution: **property address** (street + city + state + zip). Secondary: APN. Tertiary: explicit `opportunityId` or `propertyId`.

## Write sequence

```
phase-1 uploads (fileId per media)
  -> upsert Property (by normalized address/APN)
  -> upsert Opportunity (linked to Property)
  -> Note (id = captureId)
  -> NoteTarget(s)
  -> Attachment per file
  -> PropertyInspection record
  -> PATCH dealStage (optional)
  -> trigger acquisition-voice extraction
```

See `twenty-write-mapping.md` for exact REST payloads.
