# Exit Buyer Types

Three distinct buyers sit at the end of this funnel. Each wants a different level of
finished product, pays a different price, and closes on a different timeline. Knowing
which one a parcel is headed toward — as early as possible — determines whether the deal
belongs in the Wholesale Lane or Hold Lane.

## 1. Wholesale Investor

- **Who:** Cash buyers on your buyers list — flippers, other wholesalers, small land
  investors.
- **What they want:** An already-under-contract deal at a discount they can flip or hold
  themselves. No work done to the land.
- **Price:** Lowest of the three. You collect an assignment fee, not the property's
  value.
- **Timeline:** Days to a few weeks from contract to assignment.
- **Volume:** This is the default exit for almost every deal sourced.

## 2. Whole-tail Buyer

- **Who:** End-user or small investor who wants land that's a step above raw dirt —
  cleared, fenced, surveyed, road access confirmed — but not fully entitled.
- **What they want:** Land with the obvious friction removed so they can build, farm, or
  hold it without doing the legwork themselves.
- **Price:** Mid-tier. You're paid for the light rehab (clearing, minor road/access work,
  a survey) plus a normal resale margin, not for development-grade positioning.
- **Timeline:** Weeks to a couple months — you close, do light work, relist.
- **Volume:** A small slice of Hold Lane deals — parcels good enough to improve
  cheaply and flip at a real profit, but not large or well-positioned enough for a power
  or load developer.

## 3. Power / Load Developer

- **Who:** Power-generation developers (solar, gas peaker, battery storage) and
  large-load developers (data centers, crypto mining operations) sourcing large Texas
  parcels near grid infrastructure.
- **What they want:** Site-control-ready or development-ready land: confirmed acreage,
  transmission/substation proximity, ERCOT interconnection feasibility, zoning path,
  water access, road frontage capable of handling construction traffic. See
  [06-buy-and-hold-criteria.md](06-buy-and-hold-criteria.md) for the exact bar.
- **Price:** Highest of the three, by a wide margin — this is the exit that justifies
  tying up capital in a Hold Lane deal.
- **Timeline:** Months, sometimes longer — due diligence, interconnection studies, and
  entitlement work all happen before this buyer closes.
- **Volume:** The smallest slice of deals. These are the parcels the whole capital
  reinvestment strategy exists to fund.

## Suggested future CRM field (not implemented yet)

Per the current scope, no CRM code changes are made in this pass. When ready to wire this
into the live app, add a companion field to the existing `dealType` / `dispositionStatus`
fields on Opportunity:

```
Field: exitBuyerType (SELECT)
Options:
  WHOLESALE_INVESTOR   — default
  WHOLETAIL_BUYER
  POWER_LOAD_DEVELOPER
```

This slots in next to `packages/twenty-apps/re-acquisition/src/fields/opportunity-deal-type.field.ts`
and `opportunity-disposition-status.field.ts` using the same `defineField` pattern, so it
can be built later without changing any of the funnel logic documented here.
