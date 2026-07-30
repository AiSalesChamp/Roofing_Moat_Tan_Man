# RE Acquisition — Local AI Stack

Self-hosted AI services for voice extraction, field capture ingestion, and deal copilot.

## Quick start

```bash
# 1. Start Twenty CRM
./start-local.sh

# 2. Copy env and set your Twenty API key
cp packages/twenty-apps/re-acquisition/.env.example packages/twenty-apps/re-acquisition/.env.local
# Edit TWENTY_API_KEY

# 3. Start AI stack
export TWENTY_API_KEY=<your-key>
docker compose -f re-acquisition/docker-compose.ai.yml up -d

# 4. Pull Ollama models (first run only)
docker exec re-ai-stack-ollama-1 ollama pull qwen2.5:7b
docker exec re-ai-stack-ollama-1 ollama pull nomic-embed-text

# 5. Import n8n workflows
# Open http://localhost:5678 → Settings → Import from file
# Import all JSON files from re-acquisition/n8n-workflows/
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Ollama | http://localhost:11434 | Local LLM (extraction, copilot) |
| n8n | http://localhost:5678 | Voice extraction, capture ingestion, contracts |
| Open WebUI | http://localhost:3005 | Deal copilot with RAG |

## Webhook endpoints (after n8n import)

| Workflow | Path |
|----------|------|
| Voice extraction | `POST /webhook/re-voice/extract` |
| Capture media upload | `POST /webhook/re-capture/media` |
| Capture bundle submit | `POST /webhook/re-capture/bundle` |
| Contract generation | `POST /webhook/re-contract/generate` |
| Deal stage notification | `POST /webhook/re-contract/deal-stage-changed` |

## Acquisition voice (CLI)

```bash
cd re-acquisition/acquisition-voice/runner
npm install
TWENTY_API_KEY=... node index.js --transcript ../samples/seller-call-clean.txt --call-id test-call-001
```

## Property capture PWA

Serve locally for phone testing:

```bash
cd re-acquisition/property-capture/pwa
npx serve -l 3080
# Open http://<your-lan-ip>:3080 on phone
```

## Deal copilot

```bash
# Export CRM deals to markdown for RAG
./re-acquisition/copilot/export-deals.sh

# Open http://localhost:3005
# Knowledge is auto-mounted from copilot/knowledge/ and copilot/exports/
```
