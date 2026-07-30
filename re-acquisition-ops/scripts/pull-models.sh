#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

load_env
MODEL="$(env_get OLLAMA_MODEL qwen2.5:7b)"
EMBED="$(env_get OLLAMA_EMBED_MODEL nomic-embed-text)"

CONTAINER="$(compose ps -q ollama 2>/dev/null | head -n1 || true)"

info "Pulling Ollama models (local only — can take several minutes)..."
if [ -n "$CONTAINER" ]; then
  docker exec "$CONTAINER" ollama pull "$MODEL"
  docker exec "$CONTAINER" ollama pull "$EMBED"
elif command -v ollama >/dev/null 2>&1; then
  ollama pull "$MODEL"
  ollama pull "$EMBED"
elif curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:11434/api/pull" -d "{\"name\":\"$MODEL\"}"
  curl -fsS "http://127.0.0.1:11434/api/pull" -d "{\"name\":\"$EMBED\"}"
else
  err "No Ollama found (container, CLI, or :11434). Install Ollama or: docker compose --profile bundled-ollama up -d"
  exit 1
fi
info "Models ready: $MODEL, $EMBED"
