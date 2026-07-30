#!/usr/bin/env bash
# Start Postgres/Redis, sidecar stack, and Twenty CRM (yarn start).

set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_cmd docker
require_cmd curl

if [ ! -f "$ENV_FILE" ]; then
  info "No .env yet — running init first"
  "$OPS_ROOT/scripts/init.sh"
fi

load_env

if ! docker info >/dev/null 2>&1; then
  err "Docker daemon not reachable. Start Docker and retry."
  exit 1
fi

info "Starting Twenty Postgres + Redis..."
# Do not inherit COMPOSE_PROJECT_NAME=re-ops — twenty-docker.dev uses project twenty-dev
# and ports 5432/6379 (often already running from a prior session).
if COMPOSE_PROJECT_NAME=twenty-dev docker compose \
  -f "$REPO_ROOT/packages/twenty-docker/docker-compose.dev.yml" up -d --wait; then
  :
else
  if docker ps --format '{{.Names}}' | grep -q '^twenty-dev-db-1$'; then
    warn "Postgres/Redis already up (twenty-dev) — continuing"
  else
    err "Could not start Postgres/Redis"
    exit 1
  fi
fi

info "Starting RE sidecars (AI, contracts, capture PWA, media-gateway)..."
compose up -d --build

if [ ! -d "$REPO_ROOT/node_modules" ]; then
  info "Installing monorepo dependencies (first run — can take a while)..."
  (cd "$REPO_ROOT" && yarn_cmd install)
fi

mkdir -p "$STATE_DIR"
CRM_PID_FILE="$STATE_DIR/crm.pid"
CRM_LOG="$STATE_DIR/crm.log"

if [ -f "$CRM_PID_FILE" ] && kill -0 "$(cat "$CRM_PID_FILE")" 2>/dev/null; then
  info "CRM already running (pid $(cat "$CRM_PID_FILE"))"
else
  info "Starting Twenty CRM (API :3000, front :3001, worker)..."
  info "Logs: $CRM_LOG"
  # Use wrapper script — bash functions are not valid nohup targets
  : >"$CRM_LOG"
  nohup "$OPS_ROOT/scripts/start-crm.sh" >>"$CRM_LOG" 2>&1 &
  echo $! >"$CRM_PID_FILE"
fi

# Health waits (front may take longer on first compile)
wait_http "http://127.0.0.1:3000/healthz" "Twenty API" 90 || warn "API not healthy yet — check $CRM_LOG"
wait_http "http://127.0.0.1:3081/healthz" "media-gateway" 30 || warn "media-gateway not up yet"
wait_http "http://127.0.0.1:5678/healthz" "n8n" 40 || wait_http "http://127.0.0.1:5678" "n8n" 20 || warn "n8n not up yet"

cat <<EOF

$(printf '\033[1;32m')RE Acquisition is starting.$(printf '\033[0m')

  CRM login:     http://127.0.0.1:3001
  Capture PWA:   http://127.0.0.1:3080
  n8n:           http://127.0.0.1:5678
  Deal copilot:  http://127.0.0.1:3005
  DocuSeal:      http://127.0.0.1:3030

All ports bound to 127.0.0.1 (this machine only).

First time:
  1. ./bin/re-ops login-help
  2. Create workspace + API key in CRM
  3. ./bin/re-ops configure <YOUR_API_KEY>

EOF
