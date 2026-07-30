#!/usr/bin/env bash
# Generate secrets, write .env, apply privacy defaults to Twenty server/front.

set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_cmd openssl
require_cmd docker

mkdir -p "$STATE_DIR" "$OPS_ROOT/secrets"

if [ -f "$ENV_FILE" ]; then
  warn ".env already exists at $ENV_FILE"
  if [ "${1:-}" != "--force" ]; then
    info "Pass --force to regenerate missing secrets only (keeps TWENTY_API_KEY)."
  fi
else
  cp "$OPS_ROOT/.env.example" "$ENV_FILE"
  info "Created $ENV_FILE from .env.example"
fi

ensure_secret() {
  local key="$1"
  local bytes="${2:-32}"
  local current
  current="$(env_get "$key")"
  if [ -z "$current" ] || [ "$current" = "change-me" ]; then
    env_set "$key" "$(random_hex "$bytes")"
    info "Generated $key"
  fi
}

ensure_secret APP_SECRET 32
ensure_secret N8N_CONTRACT_WEBHOOK_SECRET 24
ensure_secret N8N_CAPTURE_WEBHOOK_SECRET 24
ensure_secret N8N_VOICE_WEBHOOK_SECRET 24
ensure_secret N8N_ENCRYPTION_KEY 24
ensure_secret DOCUSEAL_SECRET_KEY_BASE 32
ensure_secret OPEN_WEBUI_SECRET_KEY 32
ensure_secret OPEN_WEBUI_PASSWORD 12

# Same secret for PWA media + n8n capture (one value to paste in Settings)
CAPTURE_SECRET="$(env_get N8N_CAPTURE_WEBHOOK_SECRET)"
env_set MEDIA_GATEWAY_SECRET "$CAPTURE_SECRET"

env_set BIND_HOST "127.0.0.1"
env_set COMPOSE_PROJECT_NAME "re-ops"

# Privacy defaults on Twenty host env
SERVER_ENV="$REPO_ROOT/packages/twenty-server/.env"
FRONT_ENV="$REPO_ROOT/packages/twenty-front/.env"

if [ ! -f "$SERVER_ENV" ]; then
  cp "$REPO_ROOT/packages/twenty-server/.env.example" "$SERVER_ENV"
  info "Created packages/twenty-server/.env"
fi
if [ ! -f "$FRONT_ENV" ]; then
  cp "$REPO_ROOT/packages/twenty-front/.env.example" "$FRONT_ENV"
  info "Created packages/twenty-front/.env"
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# Patch server .env keys (awk upsert)
upsert_server() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  if grep -qE "^${key}=" "$SERVER_ENV"; then
    awk -v key="$key" -v value="$value" '
      $0 ~ "^"key"=" { print key"="value; next }
      { print }
    ' "$SERVER_ENV" >"$tmp"
  else
    cat "$SERVER_ENV" >"$tmp"
    printf '%s=%s\n' "$key" "$value" >>"$tmp"
  fi
  mv "$tmp" "$SERVER_ENV"
}

upsert_server APP_SECRET "${APP_SECRET}"
upsert_server TELEMETRY_ENABLED false
# Prefill demo login in local dev (seed user tim@apple.dev). Safer than blocking
# signup: isMultiWorkspaceEnabled=false means new emails cannot create a 2nd workspace.
upsert_server SIGN_IN_PREFILLED true
upsert_server STORAGE_TYPE local
upsert_server FRONTEND_URL http://127.0.0.1:3001
upsert_server SERVER_URL http://127.0.0.1:3000

# App .env.local for SDK publish / seed
APP_ENV="$APP_DIR/.env.local"
cp "$APP_DIR/.env.example" "$APP_ENV"
{
  echo "TWENTY_API_URL=http://127.0.0.1:3000"
  echo "TWENTY_API_KEY=$(env_get TWENTY_API_KEY)"
  echo "N8N_CONTRACT_WEBHOOK_URL=http://127.0.0.1:5678/webhook/re-contract/generate"
  echo "N8N_CONTRACT_WEBHOOK_SECRET=$(env_get N8N_CONTRACT_WEBHOOK_SECRET)"
  echo "N8N_DEAL_STAGE_WEBHOOK_URL=http://127.0.0.1:5678/webhook/re-contract/deal-stage-changed"
  echo "N8N_VOICE_EXTRACTION_WEBHOOK_URL=http://127.0.0.1:5678/webhook/re-voice/extract"
  echo "N8N_VOICE_WEBHOOK_SECRET=$(env_get N8N_VOICE_WEBHOOK_SECRET)"
  echo "N8N_CAPTURE_MEDIA_WEBHOOK_URL=http://127.0.0.1:5678/webhook/re-capture/media"
  echo "N8N_CAPTURE_BUNDLE_WEBHOOK_URL=http://127.0.0.1:5678/webhook/re-capture/bundle"
  echo "N8N_CAPTURE_WEBHOOK_SECRET=$(env_get N8N_CAPTURE_WEBHOOK_SECRET)"
  echo "MEDIA_GATEWAY_URL=http://127.0.0.1:3081"
  echo "MEDIA_GATEWAY_SECRET=$(env_get MEDIA_GATEWAY_SECRET)"
  echo "DOCUSEAL_URL=http://127.0.0.1:3030"
  echo "GOTENBERG_URL=http://127.0.0.1:3002"
  echo "OLLAMA_BASE_URL=http://127.0.0.1:11434"
  echo "OLLAMA_MODEL=$(env_get OLLAMA_MODEL qwen2.5:7b)"
  echo "OPEN_WEBUI_URL=http://127.0.0.1:3005"
} >"$APP_ENV"

chmod 600 "$ENV_FILE" "$APP_ENV" 2>/dev/null || true

# Credentials card (local only, gitignored via state/)
CREDS="$STATE_DIR/credentials.txt"
{
  echo "RE Acquisition — local credentials (private machine only)"
  echo "Generated: $(date -Iseconds)"
  echo ""
  echo "Open WebUI password (first signup — use a private email):"
  echo "  $(env_get OPEN_WEBUI_PASSWORD)"
  echo ""
  echo "Webhook secrets live in re-acquisition-ops/.env (mode 600)."
  echo "Create Twenty account at http://127.0.0.1:3001 — use a strong password."
  echo "Never commit this file or .env."
} >"$CREDS"
chmod 600 "$CREDS"

info "Init complete."
info "Privacy: TELEMETRY_ENABLED=false, SIGN_IN_PREFILLED=false, bind 127.0.0.1"
info "Next: ./bin/re-ops up"
info "Then open http://127.0.0.1:3001 and create your workspace (see ./bin/re-ops login-help)"
