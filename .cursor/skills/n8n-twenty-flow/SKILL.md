---
name: n8n-twenty-flow
description: Scaffold an idempotent n8n workflow that writes to Twenty CRM via REST. Use when building ingestion, contract, or integration flows between external services and Twenty.
---

# n8n → Twenty Integration Flow Scaffolder

Use when documenting or building n8n workflows that write to Twenty. Follow the patterns in `re-acquisition/property-capture/` and `re-acquisition/contracts/`.

## Standard flow skeleton

Every production n8n → Twenty flow should include:

1. **Webhook entry** — `POST` with JSON or multipart
2. **Auth verify** — JWT signature check OR shared `X-Webhook-Secret`
3. **Rate limit + size gate** — reject before parsing large bodies
4. **Schema validate** — JSON Schema or required-field check
5. **Atomic idempotency claim** — `INSERT ON CONFLICT DO NOTHING`, re-read row state
6. **Twenty writes** — topological order, all `?upsert=true` with deterministic ids
7. **Finalize claim** — flip to `DONE`, store result for replay
8. **Respond** — return ids + etag

## Idempotency claim pattern

```
INSERT (workspaceId, idempotencyKey, bodyHash, state=IN_PROGRESS)
ON CONFLICT (workspaceId, idempotencyKey) DO NOTHING

Re-read:
- WON claim → continue
- DONE + same bodyHash → return stored result (200)
- IN_PROGRESS + same bodyHash → 202 / short-poll
- DIFFERENT bodyHash → 409 IDEMPOTENCY_KEY_CONFLICT
```

Use `captureId`, `opportunityId`, or `signatureRequestId + eventType` as keys.

## Twenty REST writes

Base: `${TWENTY_API_URL}/rest/<pluralObject>?upsert=true`

Auth: `Authorization: Bearer ${TWENTY_API_KEY}`

Deterministic ids for replay safety:

```javascript
const id = uuidv5(`${opportunityId}:contract:${contractType}`, NAMESPACE);
```

### Write order (contracts)

```
upload file → attachment → patch opportunity → external service → patch opportunity
```

### Write order (capture)

```
upload media → property → opportunity → note → noteTarget → attachments → inspection → dealStage
```

## PATCH with concurrency

```http
PATCH /rest/opportunities/:id
If-Match: <etag>
Content-Type: application/json

{ "dealStage": "UNDER_CONTRACT" }
```

On `409`: re-fetch; skip if target state already applied.

## GraphQL file upload

Attachments need `fileId` from GraphQL multipart `uploadFilesFieldFile`. Cache `fieldMetadataId` for `attachment.file` per workspace (query once, store in n8n static data).

## Webhook security

| Source | Header | Env var |
|--------|--------|---------|
| Twenty logic fn → n8n | `X-Webhook-Secret` | `N8N_*_WEBHOOK_SECRET` |
| DocuSeal → n8n | `X-DocuSeal-Secret` | `DOCUSEAL_WEBHOOK_SECRET` |
| Mobile capture → n8n | `Authorization: Bearer <jwt>` | verify signature + exp |

Never trust body-supplied `workspaceId` — derive from verified token.

## Flow documentation template

Create `re-acquisition/<feature>/<flow-name>-flow.md`:

```markdown
# n8n <Feature> Workflow

Entrypoint: POST /webhook/<path>

## Workflow nodes
1. Webhook ...
2. Function: Verify ...
...

## Environment
| Variable | Purpose |
...

## Error handling
- ...
```

Also create `twenty-<feature>-write-mapping.md` with exact REST JSON payloads.

## Reference flows

- Capture ingestion: [n8n-ingestion-flow.md](../../../re-acquisition/property-capture/n8n-ingestion-flow.md)
- Write mapping: [twenty-write-mapping.md](../../../re-acquisition/property-capture/twenty-write-mapping.md)
- Contract generation: [contract-generation-flow.md](../../../re-acquisition/contracts/contract-generation-flow.md)
- DocuSeal webhook: [docuseal-webhook-flow.md](../../../re-acquisition/contracts/docuseal-webhook-flow.md)
- Contract writes: [twenty-contract-write-mapping.md](../../../re-acquisition/contracts/twenty-contract-write-mapping.md)

## n8n node tips

- Use **Function** nodes for validation, idempotency, template rendering
- Use **HTTP Request** nodes for Twenty REST, Gotenberg, DocuSeal
- Use **Switch** on `event_type` or `decision` fields
- Use **Execute Workflow** to chain sub-flows (generate → send)
- Store credentials in n8n: `TWENTY_API_KEY`, `DOCUSEAL_API_TOKEN`
