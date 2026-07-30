#!/usr/bin/env bash
# Shared helpers for re-ops scripts.

set -euo pipefail

OPS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$OPS_ROOT/.." && pwd)"
ENV_FILE="${OPS_ENV_FILE:-$OPS_ROOT/.env}"
STATE_DIR="$OPS_ROOT/state"
APP_DIR="$REPO_ROOT/packages/twenty-apps/re-acquisition"

info() { printf '\033[1;36m[re-ops]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[re-ops]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[re-ops]\033[0m %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    err "Missing $ENV_FILE — run: ./bin/re-ops init"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

yarn_cmd() {
  if command -v yarn >/dev/null 2>&1; then
    yarn "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack yarn "$@"
  else
    err "Neither yarn nor corepack found. Install Node.js ^24.5 first."
    exit 1
  fi
}

env_get() {
  local key="$1"
  local default="${2:-}"
  if [ -f "$ENV_FILE" ]; then
    local value
    value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
  fi
  printf '%s' "$default"
}

env_set() {
  local key="$1"
  local value="$2"
  mkdir -p "$(dirname "$ENV_FILE")"
  touch "$ENV_FILE"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # portable in-place replace
    local tmp
    tmp="$(mktemp)"
    awk -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $0 ~ "^"key"=" {
        print key"="value
        done=1
        next
      }
      { print }
      END { if (!done) print key"="value }
    ' "$ENV_FILE" >"$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

random_hex() {
  local bytes="${1:-32}"
  openssl rand -hex "$bytes"
}

wait_http() {
  local url="$1"
  local label="${2:-$url}"
  local attempts="${3:-60}"
  local i=0
  info "Waiting for $label ..."
  while [ "$i" -lt "$attempts" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      info "$label is up"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  err "Timed out waiting for $label ($url)"
  return 1
}

compose() {
  load_env
  docker compose --env-file "$ENV_FILE" -f "$OPS_ROOT/docker-compose.yml" "$@"
}
