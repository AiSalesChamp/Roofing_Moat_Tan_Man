# Contract services — DocuSeal + Gotenberg

Self-hosted e-signature and PDF rendering for the RE acquisition contract pipeline.

## Usage

```bash
# From repo root — runs alongside Twenty dev Postgres/Redis
docker compose -f re-acquisition/contracts/docker-compose.yml up -d

# Stop
docker compose -f re-acquisition/contracts/docker-compose.yml down
```

## Services

| Service | Port | URL |
|---------|------|-----|
| DocuSeal | 3030 | http://localhost:3030 |
| Gotenberg | 3002 | http://localhost:3002 |

> Gotenberg is intentionally kept off 3000/3001 — those ports are used by the
> Twenty API server and frontend dev server respectively.

## First-time DocuSeal setup

1. Open http://localhost:3030 and create admin account
2. Settings → API → generate API token → set `DOCUSEAL_API_TOKEN`
3. Create templates for LOI, PSA, Assignment (or upload generated PDFs)
4. Settings → Webhooks → add `http://<n8n-host>/webhook/re-contract/docuseal`
5. Copy webhook secret → `DOCUSEAL_WEBHOOK_SECRET`

## Environment

Copy `env.example` to `.env` in this directory or export vars in your shell / n8n credentials.

## Verify Gotenberg

```bash
curl --request POST http://localhost:3002/forms/chromium/convert/html \
  --form files=@templates/loi.html \
  -o /tmp/test-loi.pdf
```

## Verify DocuSeal API

```bash
curl -H "X-Auth-Token: $DOCUSEAL_API_TOKEN" http://localhost:3030/api/templates
```
