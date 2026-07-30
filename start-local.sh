#!/usr/bin/env bash
#
# One-command local launch for Twenty-20 (RE Acquisition CRM).
#
# What this does:
#   1. Starts Postgres + Redis (packages/twenty-docker/docker-compose.dev.yml)
#   2. Optionally starts the contract services, DocuSeal + Gotenberg
#      (re-acquisition/contracts/docker-compose.yml), with --with-contracts
#   3. Installs dependencies if node_modules is missing
#   4. Runs `yarn start` (twenty-server API :3000, twenty-front :3001, worker)
#
# Usage:
#   ./start-local.sh                 # CRM only (Postgres, Redis, API, frontend, worker)
#   ./start-local.sh --with-contracts  # also start DocuSeal (:3030) + Gotenberg (:3002)
#
# Preferred product entrypoint (privacy defaults + sidecars + media gateway):
#   ./re-ops init && ./re-ops up
#   ./re-ops configure <TWENTY_API_KEY>
# See re-acquisition-ops/README.md
#
# This script is the lower-level CRM-only launcher. First-time RE setup:
#   1. Open http://localhost:3001 and create your workspace
#   2. Settings -> APIs & Webhooks -> create an API key
#   3. Prefer: ./re-ops configure <key>
#      Or manually publish from packages/twenty-apps/re-acquisition

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

WITH_CONTRACTS=false
for arg in "$@"; do
  case "$arg" in
    --with-contracts)
      WITH_CONTRACTS=true
      ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

info() { printf '\033[1;36m[start-local]\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m[start-local]\033[0m %s\n' "$1"; }
err() { printf '\033[1;31m[start-local]\033[0m %s\n' "$1" >&2; }

# Resolve a working yarn command even if the `yarn` binary itself isn't on
# PATH (corepack ships with Node but needs `corepack enable`, which requires
# sudo on most systems — `corepack yarn` works without that step).
if command -v yarn >/dev/null 2>&1; then
  YARN_CMD=(yarn)
elif command -v corepack >/dev/null 2>&1; then
  YARN_CMD=(corepack yarn)
else
  err "Neither 'yarn' nor 'corepack' was found. Install Node.js (which bundles corepack) and retry."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 24 ] 2>/dev/null; then
  warn "Detected Node $(node --version 2>/dev/null || echo unknown); this repo targets Node ^24.5.0."
  warn "Things may still work, but if yarn/build steps fail, upgrade Node first (e.g. via nvm/fnm)."
fi

if ! command -v docker >/dev/null 2>&1; then
  err "Docker was not found on PATH. Postgres + Redis run in Docker containers, so it's required."
  err ""
  err "Install it, then re-run this script:"
  err "  Ubuntu/Debian:  sudo apt install docker.io && sudo usermod -aG docker \$USER"
  err "  (or)            sudo snap install docker"
  err "  macOS:          brew install --cask docker   (then launch Docker Desktop once)"
  err ""
  err "After installing via apt/snap, you may need to log out and back in (or run"
  err "'newgrp docker') for group permissions to take effect."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  err "Docker is installed but the daemon isn't running/reachable."
  err "Start it (e.g. 'sudo systemctl start docker' or open Docker Desktop) and retry."
  exit 1
fi

info "Starting Postgres + Redis..."
docker compose -f packages/twenty-docker/docker-compose.dev.yml up -d --wait

if [ "$WITH_CONTRACTS" = true ]; then
  info "Starting DocuSeal (:3030) + Gotenberg (:3002)..."
  docker compose -f re-acquisition/contracts/docker-compose.yml up -d --wait
else
  info "Skipping contract services (DocuSeal/Gotenberg). Pass --with-contracts to include them."
fi

if [ ! -d node_modules ]; then
  info "node_modules not found, running yarn install (this can take a while)..."
  "${YARN_CMD[@]}" install
fi

if [ ! -f packages/twenty-server/.env ]; then
  warn "packages/twenty-server/.env not found — copying from .env.example."
  cp packages/twenty-server/.env.example packages/twenty-server/.env
fi

if [ ! -f packages/twenty-front/.env ]; then
  warn "packages/twenty-front/.env not found — copying from .env.example."
  cp packages/twenty-front/.env.example packages/twenty-front/.env
fi

info "Launching Twenty (API :3000, frontend :3001, worker)..."
info "Once it's up, open http://localhost:3001"
exec "${YARN_CMD[@]}" start
