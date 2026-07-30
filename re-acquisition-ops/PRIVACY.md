# Privacy & client data safety

RE Acquisition Ops is designed for **local-first** use on your machine. Seller PII, call audio, and deal economics should not leave the box unless you explicitly send a contract for e-sign.

## Guarantees (default install)

| Control | Default |
|---------|---------|
| Network bind | `127.0.0.1` only — not on LAN/WAN |
| CRM telemetry | `TELEMETRY_ENABLED=false` |
| Demo autofill login | `SIGN_IN_PREFILLED=false` |
| LLM inference | Local Ollama only (no cloud API keys required) |
| File storage | Twenty `STORAGE_TYPE=local` |
| Secrets file | `re-acquisition-ops/.env` mode `600`, gitignored |
| Open WebUI | Auth enabled; community sharing off; telemetry off |
| n8n | Diagnostics / version phone-home disabled |

## What still leaves your machine (optional)

- **DocuSeal e-sign email** — if you send a contract for signature, seller/buyer emails and PDF go through DocuSeal (self-hosted by default on localhost).
- **You intentionally change `BIND_HOST`** — then LAN devices can reach services; only do this with a threat model review.
- **Phone field capture over LAN** — requires exposing ports; prefer USB reverse tunnel for sensitive sites.

## Operator checklist

1. Use a strong unique password for the Twenty workspace.
2. Never commit `.env`, `state/credentials.txt`, or API keys.
3. Keep `./bin/re-ops down` when not in use on shared machines.
4. Do not paste seller transcripts into cloud chat tools.
5. Back up Docker volumes + Postgres if deals are production data.

## Data locations

- Twenty DB: Docker volume from `packages/twenty-docker/docker-compose.dev.yml`
- Twenty files: `packages/twenty-server/.local-storage` (local storage)
- n8n / Ollama / DocuSeal: Docker volumes under compose project `re-ops`
- Capture offline queue: browser IndexedDB on the device running the PWA
