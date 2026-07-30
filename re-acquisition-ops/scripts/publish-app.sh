#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

load_env
if [ -z "$(env_get TWENTY_API_KEY)" ]; then
  err "TWENTY_API_KEY missing — run configure first"
  exit 1
fi

wait_http "http://127.0.0.1:3000/healthz" "Twenty API" 30

info "Publishing RE Acquisition SDK app..."
(cd "$APP_DIR" && yarn_cmd install && yarn_cmd twenty dev --once)
info "App publish finished"
