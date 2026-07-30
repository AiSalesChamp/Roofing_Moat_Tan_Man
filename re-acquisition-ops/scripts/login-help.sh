#!/usr/bin/env bash
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

OPEN_WEBUI_PASSWORD=""
if [ -f "$ENV_FILE" ]; then
  OPEN_WEBUI_PASSWORD="$(env_get OPEN_WEBUI_PASSWORD)"
fi

cat <<EOF

RE Acquisition — safe first login (private / local)

1) Open CRM (localhost only):
     http://127.0.0.1:3001

2) Create YOUR workspace with a strong password.
   - Prefer a unique email you control
   - Do NOT reuse cloud passwords
   - Data stays in local Docker Postgres + Twenty storage

3) Create an API key:
     Settings → APIs & Webhooks → Create key
   Copy it once — paste into:
     ./bin/re-ops configure <API_KEY>

4) Optional sidecars after configure:
   - Capture phone UI:  http://127.0.0.1:3080
   - n8n owner signup:  http://127.0.0.1:5678  (local only)
   - Deal copilot:      http://127.0.0.1:3005
$(if [ -n "$OPEN_WEBUI_PASSWORD" ]; then echo "     Suggested first password: $OPEN_WEBUI_PASSWORD"; fi)
   - DocuSeal admin:    http://127.0.0.1:3030

Privacy defaults already applied by init:
  - All ports bind 127.0.0.1 (not on your LAN)
  - TELEMETRY_ENABLED=false on Twenty
  - SIGN_IN_PREFILLED=false (no demo login autofill)
  - Ollama local only — no cloud LLM for extraction
  - Secrets in re-acquisition-ops/.env (mode 600, gitignored)

Never:
  - Commit .env / credentials.txt / API keys
  - Change BIND_HOST to 0.0.0.0 without TLS + auth review
  - Point extraction at a public cloud model with seller PII

EOF
