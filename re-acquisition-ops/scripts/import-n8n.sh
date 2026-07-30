#!/usr/bin/env bash
# Import + activate RE n8n workflows into the local n8n container.

set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

load_env
require_cmd curl

N8N_URL="$(env_get N8N_URL http://127.0.0.1:5678)"
N8N_API_KEY="$(env_get N8N_API_KEY)"

# Wait for n8n
for i in $(seq 1 40); do
  if curl -fsS "$N8N_URL" >/dev/null 2>&1 || curl -fsS "$N8N_URL/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

CONTAINER="$(compose ps -q n8n | head -n1)"
if [ -z "$CONTAINER" ]; then
  err "n8n container not running — ./bin/re-ops up first"
  exit 1
fi

info "Importing workflows into n8n container..."
# Import all JSON files mounted at /home/node/workflows
if docker exec -u node "$CONTAINER" n8n import:workflow --separate --input=/home/node/workflows 2>&1; then
  info "Import OK"
else
  warn "CLI import reported errors (workflows may already exist) — continuing"
fi

if [ -z "$N8N_API_KEY" ]; then
  warn "N8N_API_KEY not set — cannot auto-activate via API."
  warn "One-time: open $N8N_URL → create owner account → Settings → API → copy key"
  warn "Then: add N8N_API_KEY=... to re-acquisition-ops/.env and re-run:"
  warn "  ./bin/re-ops import-n8n"
  warn "Or manually Activate each RE workflow in the n8n UI."
  exit 0
fi

info "Activating workflows via n8n API..."
# List workflows
list_json="$(curl -fsS -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows" || true)"
if [ -z "$list_json" ]; then
  warn "Could not list workflows — check N8N_API_KEY"
  exit 0
fi

# Activate any workflow whose name starts with "RE -"
python3 - <<'PY' "$list_json" "$N8N_URL" "$N8N_API_KEY" || true
import json, sys, urllib.request
raw, base, key = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.loads(raw)
items = data.get("data") or data.get("workflows") or []
if isinstance(data, list):
    items = data
for wf in items:
    name = wf.get("name") or ""
    wid = wf.get("id")
    if not wid or not name.startswith("RE -"):
        continue
    if wf.get("active"):
        print(f"already active: {name}")
        continue
    req = urllib.request.Request(
        f"{base.rstrip('/')}/api/v1/workflows/{wid}/activate",
        method="POST",
        headers={"X-N8N-API-KEY": key, "Content-Type": "application/json"},
        data=b"{}",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"activated: {name} ({resp.status})")
    except Exception as exc:
        print(f"failed activate {name}: {exc}")
PY

info "n8n import/activate done"
