# RE Acquisition — Twenty App

Real estate acquisition CRM extension for [Twenty](https://twenty.com). Tracks wholesale, flip, land, and commercial/industrial deals through a single acquisition pipeline.

## What's inside

- **Custom objects:** Property, PropertyInspection, CallTranscript, ComparableSale
- **Opportunity extensions:** `dealStage` pipeline, `dealType` tags, financials, underwriting, disposition
- **Contact extensions:** `contactRole`, buyer markets, entity types on Company
- **Views:** Acquisition Pipeline kanban, filtered deal queues, DD calendar, sellers/buyers lists
- **Logic functions:** Stage-change task checklists, profit calculation, DD deadline reminders, contract generation on OFFER_OUT
- **Contract pipeline:** `../../re-acquisition/contracts/` — Gotenberg PDF generation, DocuSeal e-sign, n8n flows
- **Ingestion specs:** `../../re-acquisition/property-capture/` and `../../re-acquisition/acquisition-voice/`

## Deal Stage Pipeline

| Stage | Meaning |
|-------|---------|
| SOURCED | New lead |
| QUALIFYING | Contacting seller, gathering numbers |
| OFFER_OUT | LOI/offer submitted |
| UNDER_CONTRACT | PSA signed |
| DUE_DILIGENCE | Inspections, title, environmental |
| ACQUIRED | Closed — own or hold equitable interest |
| DISPOSITION | Wholesale assignment / flip rehab |
| EXIT_CLOSED | Sold or assigned out |
| DEAD | Passed or lost |

## Getting started

```bash
cd packages/twenty-apps/re-acquisition
cp .env.example .env.local
# Set TWENTY_API_URL and TWENTY_API_KEY

yarn install
yarn twenty dev --once    # publish app to local Twenty
yarn seed                 # populate demo deals
```

Requires a running Twenty server (`yarn start` from repo root) with Postgres and Redis.

## Integration layer

See `../../re-acquisition/property-capture/` for mobile capture → n8n → Twenty REST writes, `../../re-acquisition/acquisition-voice/` for seller call / site memo LLM extraction schemas, and `../../re-acquisition/contracts/` for contract PDF generation and DocuSeal e-signature when deals reach OFFER_OUT.
