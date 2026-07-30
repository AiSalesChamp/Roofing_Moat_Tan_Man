# RE Acquisition Ops

Private, local land-acquisition CRM on top of Twenty — **one entrypoint**, localhost-only by default.

Twenty stays the CRM engine. This package is the product shell: secrets, sidecars, publish, seed, n8n import, and capture media uploads.

## Quick start

```bash
cd re-acquisition-ops

./bin/re-ops init          # secrets + privacy defaults
./bin/re-ops up            # Postgres/Redis + AI/contracts/PWA + CRM
./bin/re-ops login-help    # how to create workspace safely

# After you create a workspace API key in the CRM UI:
./bin/re-ops configure <TWENTY_API_KEY>
```

Then open:

| Surface | URL |
|---------|-----|
| CRM login | http://127.0.0.1:3001 |
| Capture PWA | http://127.0.0.1:3080 |
| n8n | http://127.0.0.1:5678 |
| Deal copilot | http://127.0.0.1:3005 |
| DocuSeal | http://127.0.0.1:3030 |

All ports bind to **127.0.0.1** (this computer only). See [PRIVACY.md](./PRIVACY.md).

## Daily commands

```bash
./bin/re-ops status
./bin/re-ops verify
./bin/re-ops down          # stop CRM + sidecars
./bin/re-ops pull-models   # refresh Ollama models
./bin/re-ops import-n8n    # re-import / activate workflows
./bin/re-ops publish       # re-publish SDK app after field changes
```

## First login (short)

1. http://127.0.0.1:3001 → create workspace (strong password).
2. Settings → APIs & Webhooks → create API key.
3. `./bin/re-ops configure <key>` — publishes RE app, seeds demo deals, imports n8n, pulls local models.
4. Capture PWA Settings → paste shared secret from `.env` (`N8N_CAPTURE_WEBHOOK_SECRET`).

Optional: create n8n owner at :5678, add `N8N_API_KEY` to `.env`, re-run `./bin/re-ops import-n8n` to auto-activate workflows.

## What this package owns

```
re-acquisition-ops/
├── bin/re-ops                 # CLI
├── docker-compose.yml         # Ollama, n8n, Open WebUI, DocuSeal, Gotenberg, PWA, media-gateway
├── services/media-gateway/    # Real GraphQL file uploads to Twenty
├── scripts/                   # init / up / configure / verify
├── PRIVACY.md
└── .env                       # generated secrets (gitignored)
```

Domain code still lives in:

- `packages/twenty-apps/re-acquisition` — objects, `dealStage`, views, logic functions
- `re-acquisition/` — voice, contracts templates, land-funnel docs, n8n JSON

## Capture media (fixed)

Photos/audio go to **media-gateway** (`:3081`) → Twenty `uploadFilesFieldFile` (GraphQL). No more stub `fileId = Idempotency-Key`.

## Requirements

- Docker
- Node.js ^24.5 + yarn/corepack (CRM runs from this monorepo via `yarn start`)
- ~16GB RAM recommended when Ollama + Twenty run together

## Stop / reset

```bash
./bin/re-ops down
# Full DB wipe (destructive):
docker compose -f ../packages/twenty-docker/docker-compose.dev.yml down -v
```
