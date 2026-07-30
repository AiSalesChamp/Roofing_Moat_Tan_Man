# Schema drift: live workspace vs. this app's source

**Status: NOT reconciled. Publishing this app before reconciling risks fighting the
live schema.**

Recorded 2026-07-30 by inspecting the live workspace through the Twenty connector and
comparing against the `.object.ts` / `.field.ts` files in `src/`.

## Why this matters

`yarn twenty dev` publishes the app manifest. Objects and fields that exist in the
live workspace but have **no source here** are not in that manifest. Depending on how
the SDK reconciles, they are either ignored or treated as removable — and the second
outcome destroys live data. Nothing should be published until the inventory below is
either backfilled into source or consciously accepted.

## A. Live in the workspace, no source in this repo

These exist in the live workspace and have no corresponding definition in `src/`.

### Objects

| Object | Records | Notes |
|---|---|---|
| `mao_calculations` | 1 | Scaffolded and partly wired — `opportunity` carries `maoWholesaleFlip`, `maoEntitleHold`, `maoHyperscaleDisposition`, `maoLastComputedAt`, `hyperscaleGateStatus`, `hyperscaleGateReason`, `recommendedExitType`. The one record has `computedAt: null`. |
| `infrastructure_signals` | 0 | Interconnection / substation / fiber / water fields. Never populated. |

### Property fields

| Field | Type | Notes |
|---|---|---|
| `cadLandMarketValue` | CURRENCY | Texas is a non-disclosure state; this is the per-parcel valuation anchor. The lead engine writes it. |
| `zoningTrajectory` | SELECT | `UPZONING_LIKELY` / `STABLE` / `DOWNZONING_RISK` / `UNKNOWN` |

### Opportunity fields

`targetMargin`, `suggestedOfferPrice`, `entitlementCarryCost`, `postEntitlementValue`,
`offerAggressiveness`, `countyMultiplierOverride`, `realizedValueRatio`,
`hyperscaleGateStatus`, `hyperscaleGateReason`, `recommendedExitType`,
`maoWholesaleFlip`, `maoEntitleHold`, `maoHyperscaleDisposition`, `maoLastComputedAt`,
`nextAction`, `nextActionDate`, `county`.

### Comparable sale fields

`roadAccessRating`, `buildabilityRating`, `isPowerFiberAdjacent`.

## B. Source in this repo, not live in the workspace

| Source file | Object | Notes |
|---|---|---|
| `src/objects/call-log.object.ts` | `callLog` | The live workspace has `call_recordings` and `call_transcripts` but no `call_logs`. Several field files reference it: `call-log-on-opportunity`, `call-log-on-person`, `call-logs-on-opportunity`, `call-logs-on-person`. Either the object was never published, or it was published and later removed. |

## C. Type problem on an existing live field

`property.acreage` is a NUMBER field with **0 decimals** — the live GraphQL schema
reports it as `integer`.

This is wrong for land. A 0.34-acre lot stores as `0`; a 1.52-acre tract stores as
`1`. Every acreage-derived figure downstream (price per acre, and any comparable
selection that filters on size) inherits the error.

Fix is a field settings change, not a type change: `settings: { decimals: 4 }`. Four
decimals because CAD rolls publish acreage to four places.

The lead engine stores full precision in its own Postgres (`numeric(14,4)`), so no
data is lost while this is outstanding — but what reaches Twenty is truncated.

## Recommended order

1. Backfill source for section A. Mechanical: each field's exact type, options, and
   enum values are readable from the live schema via
   `learn_tools(["create_one_opportunity", "create_one_property", ...])`.
2. Resolve section B — publish `callLog`, or delete it and its four relation fields.
3. Fix section C's decimals.
4. Publish the lead-engine additions
   (`src/constants/lead-engine-identifiers.ts` and everything importing it).
5. Only then point the engine at the workspace and run a live `yarn promote`.

Steps 1–3 are independent of the lead engine and can be done in any order. Step 4 is
what the engine's promotion depends on: without it, `engineParcelId`, `countyFips`,
`mailingAddress`, `isAbsentee`, `motivationScore` and `lastDistressEventAt` do not
exist on `property`, and the upsert will reject those keys.
