---
name: re-local-ai-stack
description: Bring up and operate the RE Acquisition local AI stack — Ollama, n8n, Open WebUI deal copilot, model pulls, workflow import, and RAG refresh. Use when starting docker-compose.ai.yml, configuring extraction/copilot, importing n8n workflows, or debugging local AI integrations.
---

# RE Local AI Stack

Compose file: `re-acquisition/docker-compose.ai.yml`  
Guide: `re-acquisition/README-ai-stack.md`

## Quick start

```bash
# 1. Twenty CRM
./start-local.sh   # or yarn start / ./launch-crm.sh

# 2. App env
cp packages/twenty-apps/re-acquisition/.env.example \
   packages/twenty-apps/re-acquisition/.env.local
# Set TWENTY_API_KEY (and webhook URLs as needed)

# 3. AI stack
export TWENTY_API_KEY=<your-key>
docker compose -f re-acquisition/docker-compose.ai.yml up -d

# 4. Models (first run)
docker exec re-ai-stack-ollama-1 ollama pull qwen2.5:7b
docker exec re-ai-stack-ollama-1 ollama pull nomic-embed-text

# 5. n8n — http://localhost:5678 → Import from file
#    Import all JSON under re-acquisition/n8n-workflows/
#    Activate each workflow
```

## Services

| Service | URL | Role |
|---------|-----|------|
| Ollama | http://localhost:11434 | Extraction + copilot LLM |
| n8n | http://localhost:5678 | Voice, capture, contracts, notifications |
| Open WebUI | http://localhost:3005 | Deal copilot + RAG |

Default models: `qwen2.5:7b` (chat), `nomic-embed-text` (embeddings).

## n8n webhooks (after import + activate)

| Workflow file | Path |
|---------------|------|
| `voice-extraction.json` | `POST /webhook/re-voice/extract` |
| `capture-media-upload.json` | `POST /webhook/re-capture/media` |
| `capture-bundle-submit.json` | `POST /webhook/re-capture/bundle` |
| `contract-generation.json` | `POST /webhook/re-contract/generate` |
| `deal-stage-notification.json` | `POST /webhook/re-contract/deal-stage-changed` |
| `task-reminder.json` | Cron (overlaps SDK DD reminder — prefer one source of truth) |

Credentials in n8n: `TWENTY_API_KEY`, DocuSeal token, webhook secrets matching app `.env.local`.

From containers → host Twenty: `http://host.docker.internal:3000`.

## Smoke tests

**Voice CLI**

```bash
cd re-acquisition/acquisition-voice/runner && npm install
TWENTY_API_KEY=... node index.js \
  --transcript ../samples/seller-call-clean.txt --call-id test-001 --dry-run
```

**Capture PWA**

```bash
cd re-acquisition/property-capture/pwa && npx serve -l 3080
```

**Contracts** (separate compose): see skill `re-contract-pipeline`.

## Deal copilot (Open WebUI)

```bash
./re-acquisition/copilot/export-deals.sh
./re-acquisition/copilot/setup-knowledge.sh   # if present / as documented
```

- Knowledge mounts: `copilot/knowledge/` (land-funnel) + `copilot/exports/` (CRM snapshots)
- Persona: `copilot/deal-copilot-system-prompt.md` — answer “what should the operator do TODAY?”
- Refresh exports after meaningful CRM changes so RAG stays current

## Port map (full local)

| Port | Service |
|------|---------|
| 3000 | Twenty API |
| 3001 | Twenty front |
| 3002 | Gotenberg |
| 3005 | Open WebUI |
| 3030 | DocuSeal |
| 5678 | n8n |
| 11434 | Ollama |
| 3080 | Capture PWA (serve) |

## Common failures

| Symptom | Fix |
|---------|-----|
| Ollama extract fails | Models not pulled; check `OLLAMA_BASE_URL` |
| Webhook 404 | Workflow not imported or not **activated** |
| n8n → Twenty connection refused | Use `host.docker.internal`, not `localhost` |
| Copilot outdated | Re-run `export-deals.sh`; confirm knowledge mount |
| Capture from phone fails | n8n URL must be LAN IP, not `localhost` |

## References

- Stack README: `re-acquisition/README-ai-stack.md`
- Voice: skill `acquisition-voice-extraction`
- Capture: skill `property-capture-pwa`
- Contracts: skill `re-contract-pipeline`
- App publish: skill `re-acquisition-app-publish`
