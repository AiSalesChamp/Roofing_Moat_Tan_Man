---
name: land-funnel-playbook
description: Map the Texas land wholesale-first playbook onto existing RE Acquisition CRM fields — two lanes, buyer types, hold criteria, KPIs, and outreach scripts. Use when applying land-funnel docs, advising deal next actions, building copilot/RAG answers, or translating playbook steps into dealStage/dealType updates. Does not invent new CRM objects.
---

# Land Funnel Playbook → CRM

Docs: `re-acquisition/land-funnel/`  
**Documentation only** — do not add CRM stages/objects for this playbook. Map everything to existing `dealStage` / `dealType` / financial fields in `packages/twenty-apps/re-acquisition`.

## Strategy (one sentence)

Mass-offer Texas land, wholesale almost everything for assignment fees, reinvest fees into the few parcels a power/load developer would want.

## Two lanes, one pipeline

Same `dealStage` for all deals. Route after light `DUE_DILIGENCE` — not a separate stage:

| Lane | Default? | Tags | Meaning of later stages |
|------|----------|------|-------------------------|
| Wholesale | Yes (~90%+) | `dealType` includes `LAND` + `WHOLESALE` | `ACQUIRED` = shopping contract; `DISPOSITION` = assign; `EXIT_CLOSED` = fee collected |
| Hold | Rare | `LAND` (no wholesale assumption) | `ACQUIRED` = took title; `DISPOSITION` = entitle/prep; exit to whole-tail or developer |

Default assumption: **wholesale it** unless Hold Lane criteria clear.

Stage meanings: skill `re-deal-stage-conventions` + `01-funnel-overview.md`.

## Read order

| # | File |
|---|------|
| 1 | `01-funnel-overview.md` |
| 2 | `02-exit-buyer-types.md` |
| 3 | `03-lead-sourcing-criteria.md` |
| 4 | `04-offer-at-scale-playbook.md` |
| 5 | `05-wholesale-disposition-playbook.md` |
| 6 | `06-buy-and-hold-criteria.md` |
| 7 | `07-capital-reinvestment-loop.md` |
| 8 | `kpi-dashboard.md` |

Scripts: `scripts/seller-cold-call-script.md`, `loi-follow-up-script.md`, `buyer-list-outreach-script.md`.  
Preview: `dashboard-preview.html`.

## Exit buyer types

| Buyer | Lane | What they buy |
|-------|------|---------------|
| Wholesale investor | Wholesale | Under-contract deal; you take assignment fee |
| Whole-tail buyer | Hold (small slice) | Lightly improved land |
| Power / load developer | Hold | Large, grid-proximate, site-control-ready parcels |

## Hold Lane gate (`DUE_DILIGENCE`)

From `06-buy-and-hold-criteria.md` — need most of:

- 20+ acres (or assemblable)
- Power access (~2 mi of substation / 161kV+)
- Load-zone growth (ERCOT large-load / data center activity)
- Water access
- Highway / FM road frontage
- Zoning path (industrial/heavy or clean unzoned)
- Clean title
- Price supports hold vs wholesale fee

5+ checks → principal review before committing capital. Otherwise stay Wholesale Lane.

## CRM mapping rules for agents

When advising or automating from this playbook:

1. **Never invent stages** — only the nine `dealStage` values.
2. Tag wholesale deals `["LAND", "WHOLESALE"]`; keep Hold deals as `LAND` (+ other types as needed).
3. Offers at scale → many records at `OFFER_OUT` (LOI batch), not custom “mass offer” entities.
4. KPIs pull from existing fields (`askingPrice`, `assignmentFee`, `projectedProfit`, dates, `dispositionStatus`) — see `kpi-dashboard.md`.
5. Copilot answers should cite stage + one concrete next action (see `copilot/deal-copilot-system-prompt.md`).
6. Prefer scripts in `land-funnel/scripts/` for call/LOI/buyer outreach copy.

## Operator “do today” pattern

1. Identify deal (`dealStage`, motivation, asking, DD deadline).
2. Apply lane rules (wholesale default; hold only if criteria met).
3. Recommend one action: call script, offer math check, stage advance, buyer blast, or DD warning if ≤7 days.

## References

- Overview: `re-acquisition/land-funnel/README.md`
- Stages/enums: skill `re-deal-stage-conventions`
- Copilot stack: skill `re-local-ai-stack`
- REST field shapes: skill `re-acquisition-rest-writes`
