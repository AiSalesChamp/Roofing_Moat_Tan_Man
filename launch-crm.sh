#!/usr/bin/env bash
# One-key launcher for the local Twenty CRM.
# Starts Postgres + Redis (Docker), starts the dev server, and opens the browser.

set -uo pipefail

REPO="$HOME/Desktop/Twenty-20"
URL="http://localhost:3001"
COMPOSE="$REPO/packages/twenty-docker/docker-compose.dev.yml"

cd "$REPO" || { echo "Repo not found at $REPO"; read -r -p "Press Enter to close..."; exit 1; }

# Keyboard-launched shells don't read your shell profile, so load nvm if you use it.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1

open_browser_when_ready() {
  for _ in $(seq 1 150); do
    if curl -sf -o /dev/null "$URL"; then
      xdg-open "$URL" >/dev/null 2>&1
      return 0
    fi
    sleep 2
  done
}

# Already running? Just open the browser and stop.
if curl -sf -o /dev/null "$URL"; then
  echo "CRM already running - opening $URL"
  xdg-open "$URL" >/dev/null 2>&1
  exit 0
fi

echo "==> Starting database & redis (Docker)..."
docker compose -f "$COMPOSE" up -d

echo "==> Waiting for the app to come up; your browser will open automatically..."
open_browser_when_ready &

echo "==> Starting Twenty CRM (keep this window open while you use the app)..."
exec node .yarn/releases/yarn-4.13.0.cjs start
