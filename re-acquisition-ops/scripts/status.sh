#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if [ -f "$ENV_FILE" ]; then
  load_env
else
  warn "No .env — run ./bin/re-ops init"
fi

echo "=== CRM process ==="
if [ -f "$STATE_DIR/crm.pid" ] && kill -0 "$(cat "$STATE_DIR/crm.pid")" 2>/dev/null; then
  info "yarn start pid $(cat "$STATE_DIR/crm.pid")"
else
  warn "CRM not tracked / not running"
fi

echo "=== Sidecar containers ==="
if [ -f "$ENV_FILE" ]; then
  compose ps || true
fi

echo "=== URLs (127.0.0.1 only) ==="
cat <<EOF
  CRM:           http://127.0.0.1:3001
  API:           http://127.0.0.1:3000
  Capture PWA:   http://127.0.0.1:3080
  Media gateway: http://127.0.0.1:3081
  n8n:           http://127.0.0.1:5678
  Copilot:       http://127.0.0.1:3005
  DocuSeal:      http://127.0.0.1:3030
  Gotenberg:     http://127.0.0.1:3002
  Ollama:        http://127.0.0.1:11434
EOF
