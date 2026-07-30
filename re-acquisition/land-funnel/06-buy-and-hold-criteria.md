# Buy-and-Hold Routing Criteria

This is the gate. A deal only leaves the Wholesale Lane and enters the Hold Lane if it
clears this rubric during `DUE_DILIGENCE`. Default to wholesaling anything that doesn't
clearly pass — capital is scarce early on, and it should only go toward parcels with a
real shot at a power/load developer exit (see
[02-exit-buyer-types.md](02-exit-buyer-types.md)).

## Hold Lane checklist

A parcel should be considered for Hold Lane if it meets most of the following:

- [ ] **Acreage:** 20+ acres (single parcel or assemblable with adjacent parcels already
      in the pipeline). Power/load developers need scale; small lots rarely qualify no
      matter how well positioned.
- [ ] **Power access:** Within ~2 miles of a substation or 161kV+ transmission line, or
      has documented interest/feasibility from ERCOT's interconnection queue.
- [ ] **Load-zone growth:** Located in a county with active ERCOT large-load
      interconnection requests or announced data center/crypto/industrial development
      nearby.
- [ ] **Water access:** Confirmed well, municipal, or surface water rights — required for
      most power generation and a plus for data centers.
- [ ] **Road frontage:** Direct frontage on a state highway or FM road able to support
      heavy construction and utility equipment traffic.
- [ ] **Zoning path:** Already zoned industrial/heavy-commercial, or unzoned county land
      with no obvious entitlement blockers.
- [ ] **Clean title:** No major easement, mineral rights conflict, or flood-plain issue
      that would kill a large-scale build.
- [ ] **Price supports the hold:** The discount secured on contract is deep enough that
      holding costs (see below) don't erode the exit margin below what a wholesale exit
      would have paid.

If a parcel clears 5+ of these, flag it for principal review before deciding to hold
instead of wholesale — this is a capital allocation decision, not just an operations
one.

## What "buy and hold" actually means operationally

- `dealStage` moves through `ACQUIRED` the same as a wholesale deal, but here it means
  the company actually closes and takes title, funded from the reinvestment pool (see
  [07-capital-reinvestment-loop.md](07-capital-reinvestment-loop.md)).
- `dealStage = DISPOSITION` now means prep work, not shopping to a buyers list:
  - **Whole-tail path:** clear brush, confirm/mark boundaries, get a survey, resolve
    access — enough to justify a step up in price to a whole-tail buyer.
  - **Full development path:** commission a survey, environmental phase 1, utility/
    interconnection feasibility study, and start zoning/entitlement work — enough to
    market directly to a power/load developer.
- Track holding costs explicitly (`opportunity-holding-cost.field.ts` already exists) —
  property tax, any loan carry, and prep work costs all eat into the exit margin and
  need to be underwritten before committing capital.
- Track exit target via `opportunity-exit-price.field.ts` and `opportunity-exit-date.field.ts`
  — every Hold Lane deal needs both, so it's clear from day one what "good" looks like
  and when.

## Re-routing back to Wholesale Lane

If a Hold Lane deal stalls — DD reveals a killer issue, the entitlement path stalls, or
holding costs start exceeding the projected exit margin — route it back to the Wholesale
Lane rather than holding onto a deal that no longer pencils. A mediocre wholesale exit
beats a Hold Lane deal that ties up capital indefinitely.
