#!/usr/bin/env bash
# Export active Twenty CRM deals to markdown for Open WebUI RAG ingestion.
# Usage: TWENTY_API_KEY=... ./export-deals.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORT_DIR="${SCRIPT_DIR}/exports"
TWENTY_API_URL="${TWENTY_API_URL:-http://localhost:3000}"
TWENTY_API_KEY="${TWENTY_API_KEY:-}"

if [[ -z "$TWENTY_API_KEY" ]]; then
  echo "Error: TWENTY_API_KEY is required" >&2
  exit 1
fi

mkdir -p "$EXPORT_DIR"

auth_header="Authorization: Bearer ${TWENTY_API_KEY}"

fetch_json() {
  local path="$1"
  curl -sf -H "$auth_header" -H "Content-Type: application/json" \
    "${TWENTY_API_URL}${path}"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g' | sed 's/^-\|-$//g' | cut -c1-60
}

micros_to_dollars() {
  local micros="${1:-0}"
  if [[ -z "$micros" || "$micros" == "null" ]]; then
    echo "n/a"
    return
  fi
  awk "BEGIN { printf \"%.2f\", ${micros} / 1000000 }"
}

echo "Fetching opportunities from ${TWENTY_API_URL}..."

# Fetch opportunities (active deals — not EXIT_CLOSED or DEAD)
response=$(fetch_json "/rest/opportunities?limit=200&depth=1" || echo '{"data":{"opportunities":[]}}')

count=0
echo "$response" | python3 -c "
import json, sys, os, re

data = json.load(sys.stdin)
opps = data.get('data', {}).get('opportunities', [])
if not opps and isinstance(data.get('data'), list):
    opps = data['data']
export_dir = os.environ.get('EXPORT_DIR', 'exports')
os.makedirs(export_dir, exist_ok=True)

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', (s or 'deal').lower()).strip('-')[:60]

def fmt_addr(addr):
    if not addr:
        return 'Unknown address'
    if isinstance(addr, str):
        return addr
    parts = [
        addr.get('addressStreet1', ''),
        addr.get('addressCity', ''),
        addr.get('addressState', ''),
        addr.get('addressPostcode', ''),
    ]
    return ', '.join(p for p in parts if p) or 'Unknown address'

def micros(v):
    if not v:
        return 'n/a'
    if isinstance(v, dict):
        m = v.get('amountMicros', 0)
        return f'\${m/1e6:,.2f}'
    return str(v)

dead_stages = {'DEAD', 'EXIT_CLOSED'}
count = 0
for opp in opps:
    stage = opp.get('dealStage', 'UNKNOWN')
    if stage in dead_stages:
        continue
    oid = opp.get('id', 'unknown')
    addr = fmt_addr(opp.get('propertyAddress'))
    fname = f'{oid}-{slug(addr)}.md'
    path = os.path.join(export_dir, fname)
    motivation = opp.get('motivation') or []
    deal_type = opp.get('dealType') or []
    lines = [
        f'# Deal: {addr}',
        '',
        f'- **Opportunity ID:** {oid}',
        f'- **Deal stage:** {stage}',
        f'- **Deal type:** {\", \".join(deal_type) if deal_type else \"n/a\"}',
        f'- **Motivation:** {\", \".join(motivation) if motivation else \"n/a\"}',
        f'- **Asking price:** {micros(opp.get(\"askingPrice\"))}',
        f'- **Offer price:** {micros(opp.get(\"offerPrice\"))}',
        f'- **DD deadline:** {opp.get(\"ddDeadline\") or \"n/a\"}',
        f'- **Closing date:** {opp.get(\"closingDate\") or \"n/a\"}',
        '',
        '## What to do today',
        '',
    ]
    if stage == 'SOURCED':
        lines.append('- Qualify the lead: confirm motivation, timeline, and asking price.')
        lines.append('- Run comp analysis and decide wholesale vs hold lane.')
    elif stage == 'QUALIFYING':
        lines.append('- Complete qualification call; confirm property details and seller motivation.')
        lines.append('- Prepare offer terms per land-funnel wholesale-first playbook.')
    elif stage == 'OFFER_OUT':
        lines.append('- Follow up on LOI/offer within 24-48 hours.')
        lines.append('- Check contract signature status.')
    elif stage == 'UNDER_CONTRACT':
        lines.append('- Begin due diligence checklist; confirm DD deadline.')
    elif stage == 'DUE_DILIGENCE':
        lines.append('- Complete remaining DD items before deadline.')
        lines.append('- Line up disposition buyer if wholesale lane.')
    elif stage == 'ACQUIRED':
        lines.append('- Execute disposition or hold strategy per funnel lane.')
    elif stage == 'DISPOSITION':
        lines.append('- Close buyer assignment; track projected profit.')
    else:
        lines.append(f'- Review deal at stage {stage} and take next pipeline action.')
    lines.append('')
    with open(path, 'w') as f:
        f.write('\n'.join(lines))
    count += 1

print(f'Exported {count} deal(s) to {export_dir}')
" EXPORT_DIR="$EXPORT_DIR"

echo "Done. Re-ingest in Open WebUI or restart the container to pick up new files."
