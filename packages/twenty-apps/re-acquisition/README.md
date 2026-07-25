# RE Acquisition — Twenty App

Real estate acquisition CRM extension for [Twenty](https://twenty.com). Tracks wholesale, flip, land, and commercial/industrial deals through a single acquisition pipeline.

## What's inside

- **Custom objects:** Property, PropertyInspection, CallTranscript, ComparableSale, InfrastructureSignal, MaoCalculation
- **Opportunity extensions:** `dealStage` pipeline, `dealType` tags, financials, underwriting, disposition
- **Contact extensions:** `contactRole`, buyer markets, entity types on Company
- **Views:** Acquisition Pipeline kanban, filtered deal queues, DD calendar, sellers/buyers lists
- **Dashboard:** `Acquisition Dashboard` page layout — pipeline value / projected profit / live deal
  counters, deals by stage and type, closings by month, plus an underwriting tab covering
  recommended exit path, hyperscale gate outcomes, and MAO by lead source
- **MAO engine:** three exit-path formulas (wholesale/flip, entitle & hold, hyperscale disposition)
  with comp weighting, recomputed automatically and stored append-only on MaoCalculation
- **Offer engine:** CAD-anchored `suggestedOfferPrice` —
  `cadLandMarketValue × countyMultiplier × offerAggressiveness`. Texas is a non-disclosure state,
  so comps are unavailable at offer time; the appraisal district's land value is the one public
  per-parcel anchor. `realizedValueRatio` (contract price ÷ CAD value) feeds a by-county dashboard
  average that calibrates `COUNTY_MULTIPLIERS` from the operator's own closings
- **Today queue:** `Today` view — deals whose `nextAction` is due today or overdue, oldest first.
  Every stage change leaves exactly one open next action
- **Front component:** `mao-comparison` — side-by-side exit-path panel on the deal record page,
  showing each path's gate reason and the comps and discounts behind its number
- **Logic functions:** Stage-change task checklists, profit calculation, DD deadline reminders, contract generation on OFFER_OUT, MAO recompute triggers
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
yarn twenty build         # build manifest + bundle front components (no server needed)
yarn twenty dev --once    # publish app to local Twenty
yarn seed                 # populate demo deals
```

Requires a running Twenty server (`yarn start` from repo root) with Postgres and Redis.

## Checks

```bash
yarn lint         # oxlint
yarn typecheck    # tsc --noEmit
yarn test         # MAO engine + offer engine + identifier validation
```

`src/constants/universal-identifiers.test.ts` enforces that every `universalIdentifier` and select
option id is a valid v4+ UUID and that none collide. The SDK flattens every identifier in the
manifest into one list and rejects the build on a duplicate or a non-UUID, so a bad id here fails
the publish rather than degrading at runtime — the test catches it at source level first.

## Integration layer

See `../../re-acquisition/property-capture/` for mobile capture → n8n → Twenty REST writes, `../../re-acquisition/acquisition-voice/` for seller call / site memo LLM extraction schemas, and `../../re-acquisition/contracts/` for contract PDF generation and DocuSeal e-signature when deals reach OFFER_OUT.
