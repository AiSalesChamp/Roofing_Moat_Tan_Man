#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

load_env
fail=0

check() {
  local label="$1"
  local url="$2"
  if curl -fsS "$url" >/dev/null 2>&1; then
    info "OK  $label"
  else
    warn "FAIL $label ($url)"
    fail=1
  fi
}

check "Twenty API" "http://127.0.0.1:3000/healthz"
check "media-gateway" "http://127.0.0.1:3081/healthz"
check "Capture PWA" "http://127.0.0.1:3080/"
check "n8n" "http://127.0.0.1:5678/"
check "Ollama" "http://127.0.0.1:11434/api/tags"
check "Gotenberg" "http://127.0.0.1:3002/health"
check "DocuSeal" "http://127.0.0.1:3030/"
check "Open WebUI" "http://127.0.0.1:3005/"

API_KEY="$(env_get TWENTY_API_KEY)"
if [ -n "$API_KEY" ]; then
  if curl -fsS -H "Authorization: Bearer $API_KEY" \
    "http://127.0.0.1:3000/rest/opportunities?limit=1" >/dev/null 2>&1; then
    info "OK  Twenty REST (API key)"
  else
    warn "FAIL Twenty REST with API key — re-publish or check key"
    fail=1
  fi
else
  warn "SKIP Twenty REST — no TWENTY_API_KEY yet"
fi

if [ "$fail" -ne 0 ]; then
  err "Verify finished with failures"
  exit 1
fi
info "All checks passed"
