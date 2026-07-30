# Running the contract pipeline locally

This is the concrete, copy-pasteable version of `README.md` for running
DocuSeal + Gotenberg fully locally alongside Twenty, so contract generation
and e-signature work without any external/cloud services.

## 1. Start Twenty first

```bash
cd /path/to/Twenty-20
./start-local.sh
```

Create your workspace at http://localhost:3001 and generate an API key
(Settings → APIs & Webhooks) before continuing.

## 2. Start the contract services

```bash
cd /path/to/Twenty-20
./start-local.sh --with-contracts
# or directly:
docker compose -f re-acquisition/contracts/docker-compose.yml up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| DocuSeal | 3030 | e-signature |
| DocuSeal Postgres | (internal) | DocuSeal's own database |
| Gotenberg | 3002 | HTML → PDF rendering |

## 3. First-time DocuSeal setup

1. Open http://localhost:3030 and create an admin account.
2. Settings → API → generate an API token → save as `DOCUSEAL_API_TOKEN`.
3. Create (or upload) templates for LOI, PSA, and Assignment contracts —
   see `templates/README.md` for the HTML source and placeholder reference.
4. Settings → Webhooks → add your n8n webhook URL (see step 5) and note the
   webhook secret → save as `DOCUSEAL_WEBHOOK_SECRET`.

## 4. Verify Gotenberg is reachable

```bash
curl --request POST http://localhost:3002/forms/chromium/convert/html \
  --form files=@templates/loi.html \
  -o /tmp/test-loi.pdf
open /tmp/test-loi.pdf   # or xdg-open on Linux
```

## 5. Set up n8n (contract generation + webhook write-back)

If you don't already run n8n, the quickest local option is:

```bash
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Then:

1. Open http://localhost:5678 and create an account.
2. Import `../n8n-workflows/contract-generation.json` (see that folder's
   README for credential + environment variable setup).
3. Activate the workflow and copy its webhook URL.

## 6. Wire the RE Acquisition app to the services

```bash
cd packages/twenty-apps/re-acquisition
cp .env.example .env.local
```

Edit `.env.local`:

```bash
TWENTY_API_URL=http://localhost:3000
TWENTY_API_KEY=<from Twenty Settings -> APIs & Webhooks>

N8N_CONTRACT_WEBHOOK_URL=http://localhost:5678/webhook/re-contract/generate
N8N_CONTRACT_WEBHOOK_SECRET=<pick a random secret, must match the n8n workflow>

DOCUSEAL_URL=http://localhost:3030
DOCUSEAL_API_TOKEN=<from step 3>

GOTENBERG_URL=http://localhost:3002
```

Then publish the app so the `on-offer-generate-contract` logic function
picks up the new env vars:

```bash
yarn install
yarn twenty dev --once
```

## 7. Test end-to-end

Move a deal's `dealStage` to `OFFER_OUT` in Twenty. The
`on-offer-generate-contract` logic function should fire the n8n webhook,
which renders a PDF via Gotenberg and attaches it to the deal
(`signatureStatus` → `GENERATED`). Check the deal's **Contracts** tab and
**Files** tab to confirm.

## Troubleshooting

- **Port already in use on 3001** — that's the Twenty frontend, not
  Gotenberg. Gotenberg is intentionally on 3002 (see `docker-compose.yml`).
- **401 from the n8n webhook** — `N8N_CONTRACT_WEBHOOK_SECRET` must match
  between `.env.local` and the n8n workflow's environment variable.
- **Logic function times out** — check `packages/twenty-server` logs; the
  contract webhook call has a 30s timeout (`timeoutSeconds` on the logic
  function definition).
