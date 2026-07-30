#!/usr/bin/env bash
# After first login: wire API key, publish SDK app, seed, import n8n, pull models.

set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

API_KEY="${1:-}"
if [ -z "$API_KEY" ]; then
  API_KEY="$(env_get TWENTY_API_KEY)"
fi
if [ -z "$API_KEY" ]; then
  err "Usage: ./bin/re-ops configure <TWENTY_API_KEY>"
  err "Create key at http://127.0.0.1:3001 → Settings → APIs & Webhooks"
  exit 1
fi

load_env
env_set TWENTY_API_KEY "$API_KEY"
load_env

# Sync into app .env.local
APP_ENV="$APP_DIR/.env.local"
if [ ! -f "$APP_ENV" ]; then
  "$OPS_ROOT/scripts/init.sh"
fi
# refresh key line
tmp="$(mktemp)"
awk -v key="$API_KEY" '
  /^TWENTY_API_KEY=/ { print "TWENTY_API_KEY="key; next }
  { print }
' "$APP_ENV" >"$tmp"
mv "$tmp" "$APP_ENV"
chmod 600 "$APP_ENV"

# Recreate media-gateway + n8n with new API key
info "Restarting sidecars with API key..."
compose up -d --build media-gateway n8n

"$OPS_ROOT/scripts/publish-app.sh"
"$OPS_ROOT/scripts/import-n8n.sh"
"$OPS_ROOT/scripts/pull-models.sh" || warn "Model pull failed or skipped — run later: ./bin/re-ops pull-models"

info "Seeding demo data..."
(cd "$APP_DIR" && yarn_cmd seed) || warn "Seed failed — check API key / publish"

"$OPS_ROOT/scripts/verify.sh" || warn "Some verify checks failed — see above"

cat <<EOF

$(printf '\033[1;32m')Configure complete.$(printf '\033[0m')

  Login:       http://127.0.0.1:3001
  Pipeline:    Acquisition Pipeline view (dealStage kanban)
  Capture PWA: http://127.0.0.1:3080
               Settings → n8n http://127.0.0.1:5678
               Settings → webhook secret = N8N_CAPTURE_WEBHOOK_SECRET from .env

Credentials reminder: $STATE_DIR/credentials.txt

EOF
