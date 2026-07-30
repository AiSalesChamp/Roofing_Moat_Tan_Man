#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

CRM_PID_FILE="$STATE_DIR/crm.pid"
if [ -f "$CRM_PID_FILE" ]; then
  pid="$(cat "$CRM_PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping CRM (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    # yarn start may spawn children — best-effort
    sleep 2
    pkill -P "$pid" 2>/dev/null || true
  fi
  rm -f "$CRM_PID_FILE"
fi

if [ -f "$ENV_FILE" ]; then
  info "Stopping sidecars..."
  compose down || true
fi

info "Postgres/Redis left running (shared with monorepo). To stop them:"
info "  docker compose -f packages/twenty-docker/docker-compose.dev.yml down"
info "Down complete."
