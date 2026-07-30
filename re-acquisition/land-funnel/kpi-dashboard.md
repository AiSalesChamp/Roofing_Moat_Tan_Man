# KPI Dashboard — Funnel Targets

Track these weekly. Every metric here should be pullable from the existing Opportunity
fields already in `packages/twenty-apps/re-acquisition` — no new fields required.

## Top-of-funnel volume

| Metric | Target | Source field(s) |
|---|---|---|
| New leads sourced / week | 100+ | `dealStage = SOURCED`, created this week |
| Leads qualified / week | 60%+ of sourced | `dealStage = QUALIFYING` |
| Offers sent (LOIs) / week | 80%+ of qualified | `dealStage = OFFER_OUT` |

## Conversion

| Metric | Target | Source field(s) |
|---|---|---|
| Offer → signed contract rate | 3–8% | `dealStage = UNDER_CONTRACT` / `OFFER_OUT` count |
| Avg. days offer → signed | < 21 days | `opportunity-offer-date` → `opportunity-contract-date` |
| DD pass-through rate (Wholesale Lane) | 90%+ | `dealStage = ACQUIRED` / `UNDER_CONTRACT` |

## Wholesale Lane (Phase 1 — cash generation)

| Metric | Target | Source field(s) |
|---|---|---|
| Avg. days contract → assigned | < 14 days | `opportunity-contract-date` → `opportunity-exit-date` |
| Avg. assignment fee | Track trend, aim to increase quarter over quarter | `opportunity-assignment-fee` |
| % of deals wholesaled vs. held | 90%+ wholesaled while pool builds (Phase 1) | `dispositionStatus` / Hold Lane flag |
| Stale disposition deals (14+ days in `DISPOSITION`, unresolved) | 0 | `dealStage = DISPOSITION`, time in stage |

## Hold Lane (Phase 2+ — capital deployment)

| Metric | Target | Source field(s) |
|---|---|---|
| % of trailing-90-day assignment fee income committed to Hold Lane acquisitions (reinvestment rate) | Start at 0%, grow deliberately — see [07-capital-reinvestment-loop.md](07-capital-reinvestment-loop.md) | Assignment fee totals vs. acquisition spend |
| Parcels currently held | Track count and total acreage | `dealStage = ACQUIRED/DISPOSITION`, held flag |
| Avg. projected exit margin (Hold Lane) | Meaningfully higher than avg. wholesale fee | `opportunity-projected-profit` |
| Holding cost as % of projected exit price | < 10% | `opportunity-holding-cost` / `opportunity-exit-price` |

## Overall health

| Metric | Target | Source field(s) |
|---|---|---|
| Dead deal rate | Track, don't over-optimize — a healthy top-of-funnel produces a lot of dead deals | `dealStage = DEAD` |
| Total pipeline value | Growing month over month | Sum of `contractPrice` across active stages |
| Cash reinvestment pool balance | Growing month over month, never below 1–2 months of operating buffer | Manual/finance tracking until wired into CRM |

## Review cadence

- **Weekly:** volume and conversion metrics — catches funnel slowdowns fast.
- **Monthly:** Wholesale Lane and Hold Lane performance — catches pricing/margin drift.
- **Quarterly:** reinvestment rate and overall health — confirms the Phase 1 → Phase 2
  transition (see [07-capital-reinvestment-loop.md](07-capital-reinvestment-loop.md)) is
  progressing deliberately, not accidentally.
