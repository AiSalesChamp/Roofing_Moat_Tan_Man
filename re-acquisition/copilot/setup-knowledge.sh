#!/usr/bin/env bash
# Copy land-funnel playbook into copilot/knowledge for Open WebUI RAG mount.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KNOWLEDGE_DIR="${SCRIPT_DIR}/knowledge"
LAND_FUNNEL="${RE_ROOT}/land-funnel"

mkdir -p "$KNOWLEDGE_DIR" "${SCRIPT_DIR}/exports"

echo "Syncing land-funnel docs to ${KNOWLEDGE_DIR}..."
find "$LAND_FUNNEL" -name '*.md' -exec cp {} "$KNOWLEDGE_DIR/" \;

if [[ -f "${RE_ROOT}/../docs/AI-NATIVE-SPATIAL-GAP-ANALYSIS.md" ]]; then
  cp "${RE_ROOT}/../docs/AI-NATIVE-SPATIAL-GAP-ANALYSIS.md" "$KNOWLEDGE_DIR/"
elif [[ -f "${SCRIPT_DIR}/../../docs/AI-NATIVE-SPATIAL-GAP-ANALYSIS.md" ]]; then
  cp "${SCRIPT_DIR}/../../docs/AI-NATIVE-SPATIAL-GAP-ANALYSIS.md" "$KNOWLEDGE_DIR/"
fi

echo "Knowledge sync complete ($(ls -1 "$KNOWLEDGE_DIR" | wc -l) files)."
