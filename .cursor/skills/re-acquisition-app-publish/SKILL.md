---
name: re-acquisition-app-publish
description: Publish, seed, and debug the RE Acquisition Twenty SDK app — yarn twenty dev, env vars, logic-function webhooks, and common local failures. Use when installing or updating packages/twenty-apps/re-acquisition, wiring N8N_* env, seeding demo deals, or troubleshooting missing fields/views/automations.
---

# RE Acquisition App Publish

App path: `packages/twenty-apps/re-acquisition/`

## Prerequisites

1. Twenty running from repo root (`yarn start` or `./start-local.sh` / `./launch-crm.sh`)
2. Postgres + Redis up (dev docker compose)
3. API key from Twenty UI: **Settings → APIs & Webhooks**

## Publish + seed

```bash
cd packages/twenty-apps/re-acquisition
cp .env.example .env.local
# Set TWENTY_API_URL (http://localhost:3000) and TWENTY_API_KEY

yarn install
yarn twenty dev --once    # publish objects, fields, views, logic functions
yarn seed                 # idempotent demo deals
```

`--once` publishes a single sync; use watch mode only when actively iterating on the app.

## Env vars (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `TWENTY_API_URL` | Twenty API base |
| `TWENTY_API_KEY` | Workspace API key |
| `N8N_CONTRACT_WEBHOOK_URL` | OFFER_OUT → contract generate |
| `N8N_CONTRACT_WEBHOOK_SECRET` | Shared with n8n |
| `N8N_DEAL_STAGE_WEBHOOK_URL` | Optional stage notifications |
| `N8N_VOICE_EXTRACTION_WEBHOOK_URL` | Voice extract webhook |
| `N8N_CAPTURE_*` | Capture media/bundle URLs + secret |
| `DOCUSEAL_*` / `GOTENBERG_URL` | Contract services |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Local extraction |

Logic functions read webhook URLs from **app runtime env** after publish — missing URL = silent skip (contract) or no notification, not a hard crash.

From Docker n8n to host Twenty: `TWENTY_API_URL=http://host.docker.internal:3000`.

## What publish provisions

- Objects: Property, PropertyInspection, CallTranscript, ComparableSale, CallLog
- Opportunity: `dealStage`, `dealType`, financials, signature/contract fields
- Views, nav items, page layouts, roles (acquisitions / disposition)
- Logic functions: stage tasks, contract trigger, profit calc, DD reminder, post-install

Universal ids: `src/constants/universal-identifiers.ts` — add new ids in the correct block with next sequential suffix (see skills `twenty-sdk-field`, `twenty-logic-function`).

## After schema changes

1. Edit field/object/logic under `src/`
2. Register id in `universal-identifiers.ts`
3. `yarn twenty dev --once`
4. Confirm SELECT options exist before any REST write
5. Re-run `yarn seed` if demo data shape changed

## Common failures

| Symptom | Fix |
|---------|-----|
| Missing `dealStage` / custom fields | App not published; run `yarn twenty dev --once` |
| REST SELECT rejected | Option string typo or app out of date |
| Contract never fires | `N8N_CONTRACT_WEBHOOK_URL` unset, n8n inactive, or `signatureStatus` ≠ `NOT_SENT` |
| Seed / REST 401 | Bad or expired `TWENTY_API_KEY` |
| n8n can't reach Twenty | Use `host.docker.internal`, not `localhost`, from containers |
| Duplicate demo deals | Seed is idempotent by design — check deterministic ids in `seed.ts` |
| Using stock `stage` | Wrong field — use `dealStage` (skill `re-deal-stage-conventions`) |

## Verify quickly

- UI: Acquisition Pipeline kanban shows custom stages
- API: `GET /rest/opportunities` returns `dealStage` / `dealType`
- Logic: move a deal to `OFFER_OUT` → n8n receive (if stack up)
- Seed: several deals across stages after `yarn seed`

## References

- App README: `packages/twenty-apps/re-acquisition/README.md`
- Env template: `packages/twenty-apps/re-acquisition/.env.example`
- CLAUDE.md RE section
- Field/logic scaffolders: `twenty-sdk-field`, `twenty-logic-function`
- Contracts: skill `re-contract-pipeline`
- AI stack: skill `re-local-ai-stack`
