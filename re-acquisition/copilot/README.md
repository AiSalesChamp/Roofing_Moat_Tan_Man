# Deal Copilot (Open WebUI)

RAG-powered parcel Q&A: "What do I do on this parcel today?"

## Setup

```bash
# 1. Sync land-funnel playbook into knowledge mount
./re-acquisition/copilot/setup-knowledge.sh

# 2. Export live CRM deals
TWENTY_API_KEY=<key> ./re-acquisition/copilot/export-deals.sh

# 3. Start AI stack (Open WebUI mounts knowledge/ and exports/)
docker compose -f re-acquisition/docker-compose.ai.yml up -d
```

## Usage

1. Open http://localhost:3005
2. Create a new chat
3. Paste the system prompt from `deal-copilot-system-prompt.md` (or save as a preset)
4. Ask: *"What should I do today on 4820 N Cave Creek Rd?"*

## Refresh CRM data

Re-run export after CRM changes:

```bash
TWENTY_API_KEY=... ./re-acquisition/copilot/export-deals.sh
```

Open WebUI reads from the mounted `exports/` volume — restart the container or re-ingest the collection if your Open WebUI version requires it.

## Link from Twenty CRM

Add an external link on opportunity records:

```
http://localhost:3005/?q=What+should+I+do+today+on+{propertyAddress}
```

## Files

| File | Purpose |
|------|---------|
| `deal-copilot-system-prompt.md` | Copilot persona and response rules |
| `export-deals.sh` | CRM → markdown export for RAG |
| `setup-knowledge.sh` | Copy land-funnel docs to `knowledge/` |
| `knowledge/` | Static playbook (auto-mounted) |
| `exports/` | Per-deal CRM snapshots (auto-mounted) |
