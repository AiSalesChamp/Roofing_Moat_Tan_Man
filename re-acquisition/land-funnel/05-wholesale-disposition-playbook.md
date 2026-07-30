# Wholesale Disposition Playbook

Once a deal clears light due diligence and is routed to the Wholesale Lane, the goal is
to convert it into assignment-fee cash as fast as possible. Speed here is what feeds the
capital reinvestment loop.

## Stage flow (Wholesale Lane)

1. `DUE_DILIGENCE` passes light checks → `dealStage = ACQUIRED`.
   - "Acquired" for a wholesale deal means equitable interest is locked (contract signed),
     not that you've closed and taken title.
2. `dealStage = DISPOSITION`, `dispositionStatus = MARKETING`.
   - Deal appears in the existing **Wholesale Queue** view
     (`packages/twenty-apps/re-acquisition/src/views/wholesale-queue.view.ts`), which
     already filters to `dealType contains WHOLESALE` and `dealStage in
     [ACQUIRED, DISPOSITION]`.
3. Shop it to the buyers list (see
   [`scripts/buyer-list-outreach-script.md`](scripts/buyer-list-outreach-script.md)).
4. Buyer commits → `dispositionStatus = UNDER_CONTRACT` (the buyer's assignment
   agreement, not the original seller contract).
5. Assignment fee collected at closing → `dispositionStatus = ASSIGNED`, `dealStage =
   EXIT_CLOSED`.
6. Log the assignment fee against `opportunity-assignment-fee.field.ts` for KPI tracking
   and to feed the reinvestment loop.

## Who to shop it to, and in what order

1. **Top buyers first** — the buyers on your list with the fastest close history and
   highest close rate for this parcel's size/county. Don't blast the whole list at once;
   protect your reputation with buyers who close.
2. **Full buyers list** — if no bite in 48–72 hours, send to the full list segmented by
   `personBuyerMarkets` (already tracked on Person) matching the deal's county/region.
3. **Backup: double-close** — if no assignment buyer surfaces quickly and the spread is
   still solid, be ready to close in the company's name and resell immediately rather
   than let the deal die. This does not make it a Hold Lane deal — it's still meant to
   turn over fast.

## Pricing the assignment

- Assignment fee = spread between your contract price and what the buyer pays.
- Cap the ask using `opportunity-max-assignment-spread.field.ts` as the ceiling — don't
  price yourself out of a fast close for the sake of a marginally bigger fee.
- Bigger, well-positioned parcels (even ones not quite clearing the Hold Lane bar) can
  support a bigger spread — buyers pay more for land with real upside.

## Keep it moving

- Anything sitting in `DISPOSITION` for more than ~2 weeks needs a pricing review — drop
  the ask or widen the buyer pool rather than let cash sit tied up in an unsold contract.
- Every `EXIT_CLOSED` wholesale deal should immediately trigger a check against
  [07-capital-reinvestment-loop.md](07-capital-reinvestment-loop.md) — is there a Hold
  Lane deal ready to be funded with this fee?
