#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/state"
mkdir -p "$STATE_DIR"
cd "$REPO_ROOT"

if command -v yarn >/dev/null 2>&1; then
  exec yarn start
elif command -v corepack >/dev/null 2>&1; then
  exec corepack yarn start
else
  echo "No yarn/corepack found" >&2
  exit 1
fi
