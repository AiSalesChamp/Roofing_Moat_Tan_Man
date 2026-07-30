# Schema drift: live workspace vs. this app's source

**Status: source reconciled 2026-07-30. Publish still requires the adoption check
below before running `yarn twenty dev` against the live workspace.**

Original inventory recorded 2026-07-30 by inspecting the live workspace through the
Twenty connector. Same day, everything in section A was backfilled into source:

## What was reconciled

- `src/objects/mao-calculation.object.ts` — `maoCalculation` object (exitType,
  maoValue, version, gateStatus, gateReason, inputsSnapshot, computedAt) plus
  relations to opportunity (`opportunityId`) and property (`propertyId`).
- `src/objects/infrastructure-signal.object.ts` — `infrastructureSignal` object
  (interconnectionStatus, substation/transmission/fiber distances, waterAccess,
  estimatedTimelineMonths, assessedDate, notes) plus relation to property
  (`infraPropertyId`).
- 17 opportunity underwriting fields — `maoWholesaleFlip`, `maoEntitleHold`,
  `maoHyperscaleDisposition`, `maoLastComputedAt`, `targetMargin`,
  `suggestedOfferPrice`, `entitlementCarryCost`, `postEntitlementValue`,
  `offerAggressiveness`, `countyMultiplierOverride`, `realizedValueRatio`,
  `hyperscaleGateStatus`, `hyperscaleGateReason`, `recommendedExitType`,
  `nextAction`, `nextActionDate`, `county` — as `src/fields/opportunity-*.field.ts`.
- 2 property fields — `cadLandMarketValue`, `zoningTrajectory`.
- 4 comparableSale fields — `acreage` (decimals: 4), `roadAccessRating`,
  `buildabilityRating`, `isPowerFiberAdjacent` — added to
  `src/objects/comparable-sale.object.ts`.
- `property.acreage` now declares `settings: { decimals: 4 }` (section C fix).
- All identifiers live in `src/constants/underwriting-identifiers.ts`
  (id blocks a100000a, a100000b, a1000012, a1000093, a1000094).

Deliberate deviations from the live schema (improvements, not drift):

- `infrastructureSignal` distance fields use `decimals: 2`; live has integers.
  The hyperscale gate is "&lt;2 miles to 161kV+" — 1.5 mi is not an integer.
- `comparableSale.acreage` uses `decimals: 4`; live has an integer.
- Opportunity `hyperscaleGateStatus` third option is `NOT_EVALUATED` (matches
  live opportunity enum); `maoCalculation.gateStatus` third option is
  `NOT_APPLICABLE` (matches live maoCalculation enum). They are different enums
  on purpose — do not "fix" one to match the other.

## Remaining before a live publish (the adoption check)

The live workspace's copies of these objects/fields were created ad hoc (UI or
connector), so they do not carry this app's universal identifiers. Whether
`yarn twenty dev` adopts a live field whose `name` matches a manifest entry, or
errors on the name collision, is SDK-version-dependent and has not been tested
against this workspace. Before publishing:

1. Publish to a scratch workspace first and verify the app applies cleanly.
2. Then attempt the live workspace. If publish errors on existing names, the
   fields must be adopted or recreated deliberately — with an export/import of
   the affected records (`mao_calculations` has 1 row, `infrastructure_signals`
   0, opportunity field values on ~6 records).

## Section B resolution: callLog stays

`src/objects/call-log.object.ts` and its four relation fields remain in source
on purpose — the voice pipeline logs calls, live just doesn't have the object
yet. Publishing creates it; that is additive and safe.

## Note on `name` in connector schemas

The Twenty connector's `create_one_*`/`find_many_*` schemas expose a `name`
property for every object. For app-published objects whose label identifier is
another field (property → `propertyAddress`, comparableSale → `salePrice`), that
`name` is the connector's synthesized display label, not a real column — do not
write it via REST (`re-lead-engine/src/promote/promote.ts` used to; the shared
writer removes it). For the UI-created objects (`maoCalculation`,
`infrastructureSignal`) `name` is a real TEXT field, and source defines it as
the label identifier.
