---
name: re-deal-stage-conventions
description: RE Acquisition pipeline conventions for dealStage, dealType, signatureStatus, and contractType — including stage task checklists, contract type resolution, and wholesale vs hold lane routing. Use when moving deals, filtering views, wiring stage automations, generating contracts, or mapping land-funnel playbook actions to CRM fields.
---

# RE Deal Stage Conventions

Source of truth: `packages/twenty-apps/re-acquisition/src/constants/universal-identifiers.ts` and Opportunity fields under `src/fields/`.

## Critical: use `dealStage`, not `stage`

The acquisition kanban is driven by custom SELECT **`dealStage`**. Do not read or write Twenty's built-in Opportunity `stage` for this pipeline.

Default for new deals: `SOURCED`.

## `dealStage` values (ordered)

| Value | Meaning |
|-------|---------|
| `SOURCED` | New lead entered CRM |
| `QUALIFYING` | Ownership / motivation / parcel check |
| `OFFER_OUT` | Offer or LOI out — triggers contract webhook if `signatureStatus` is `NOT_SENT` |
| `UNDER_CONTRACT` | Seller signed; terms locked |
| `DUE_DILIGENCE` | Light DD (title, survey/GIS, access) |
| `ACQUIRED` | Wholesale: equitable interest / shopping; Hold: closed |
| `DISPOSITION` | Assigning or preparing resale |
| `EXIT_CLOSED` | Fee collected or exit sale closed |
| `DEAD` | Lost / dead |

Do not invent new stage strings.

## `dealType` (MULTI_SELECT tags)

Allowed values: `WHOLESALE`, `FLIP`, `LAND`, `COMMERCIAL`, `INDUSTRIAL`.

- A land wholesale deal is typically `["LAND", "WHOLESALE"]`.
- Tags are additive — do not treat `dealType` as a single enum.

## Contract automation

On `dealStage` → `OFFER_OUT` (`on-offer-generate-contract.ts`):

1. Skip if `signatureStatus` is set and not `NOT_SENT`.
2. Resolve contract type:
   - `dealType` contains `WHOLESALE` → `ASSIGNMENT`
   - else → `PSA`
   - honor explicit `contractType` when already set (`LOI` | `PSA` | `ASSIGNMENT`)
3. POST `{ opportunityId, contractType }` to `N8N_CONTRACT_WEBHOOK_URL`.

### `signatureStatus` machine

`NOT_SENT` → `GENERATED` → `SENT` → `VIEWED` → `SIGNED` | `DECLINED`

On DocuSeal signed webhook: set `SIGNED`, store `signedContractUrl` / `signatureRequestId`, advance `dealStage` to `UNDER_CONTRACT`.

## Stage → auto tasks

Created by `on-deal-stage-change.ts` (title prefix `[STAGE]` for idempotency):

| Stage | Tasks |
|-------|-------|
| `UNDER_CONTRACT` | Order title search; Track earnest money deposit; Set due diligence deadline |
| `DUE_DILIGENCE` | Schedule property inspection; Order survey (if land); Review environmental report (commercial/industrial); Verify zoning and entitlements |
| `ACQUIRED` | Notify buyers list (wholesale); Create rehab scope (flip); Update insurance and utilities |
| `DISPOSITION` | Market to buyers list; Track assignment or listing status |

Also fires optional `N8N_DEAL_STAGE_WEBHOOK_URL` notification (best-effort).

## Profit formula

When financial fields change (`on-profit-calculation.ts`):

```
projectedProfit = ARV - contractPrice - rehabEstimate - holdingCostEstimate - assignmentFee
```

All currency fields use `{ amountMicros, currencyCode }` (see `re-acquisition-rest-writes`).

## Two lanes, one pipeline (land-funnel)

Same `dealStage` funnel for all deals. After light DD, route by tags/docs — **not** a separate CRM stage:

| Lane | Default? | `dealType` | Exit |
|------|----------|------------|------|
| Wholesale | Yes | include `WHOLESALE` (+ usually `LAND`) | Assignment fee → `EXIT_CLOSED` |
| Hold | Rare — power/load criteria | `LAND` without wholesale assumption | Close → entitle → resell → `EXIT_CLOSED` |

Playbook lives in `re-acquisition/land-funnel/` — map actions to existing fields/views; do not add stages for lane routing.

## Suggested stage advances from ingestion

| Signal | Target `dealStage` |
|--------|--------------------|
| New capture / seller call | `SOURCED` or stay |
| Drive-by with seller contact | `QUALIFYING` |
| Site memo with `offerIntent=true` | `OFFER_OUT` |
| Contract signed (DocuSeal) | `UNDER_CONTRACT` |

Apply stage PATCHes at most once per capture/idempotency key; use `If-Match`.

## References

- Stage field: `packages/twenty-apps/re-acquisition/src/fields/opportunity-deal-stage.field.ts`
- Logic: `src/logic-functions/on-deal-stage-change.ts`, `on-offer-generate-contract.ts`
- Funnel docs: `re-acquisition/land-funnel/01-funnel-overview.md`
- REST payloads: skill `re-acquisition-rest-writes`
