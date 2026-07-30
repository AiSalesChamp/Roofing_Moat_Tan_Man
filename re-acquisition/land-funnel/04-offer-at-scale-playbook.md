# Offer-at-Scale Playbook

The core lever of the wholesale-first strategy: more offers out the door means more
signed contracts, means more assignment-fee cash to fund the Hold Lane. This is a numbers
game — treat every list pull as a batch, not a one-off.

## Cadence

- Pull/refresh sourcing lists weekly (see
  [03-lead-sourcing-criteria.md](03-lead-sourcing-criteria.md)).
- Move every qualifying lead to `SOURCED` the day it's pulled — don't pre-filter by
  "gut feel," let the funnel do the filtering.
- Batch move `SOURCED` → `QUALIFYING` in one pass per week: confirm ownership, pull
  county parcel data, log a one-line motivation note.
- Batch move `QUALIFYING` → `OFFER_OUT` in the same pass — send the LOI same day
  qualifying finishes. Speed matters more than a perfect offer.

## Offer math (keep it simple and consistent)

Use a flat, defensible formula so offers can be generated at volume without
re-underwriting each parcel by hand:

```
Offer price = (Estimated market price per acre x acreage) x discount factor
```

- Discount factor starts around 50–65% of estimated market value for raw land with
  unknown condition — tighten it as comps get better for a given county.
- Track `pricePerAcre` on the Opportunity (already exists:
  `opportunity-price-per-acre.field.ts`) so every offer is comparable across the batch.
- If a parcel looks like a Hold Lane candidate on the growth-signal filters, the offer
  can go slightly higher — you're underwriting a bigger back-end exit, not just a flip.

## Low-effort LOI generation

Don't write LOIs by hand. The app already automates this:

- Logic function `on-offer-generate-contract` fires when `dealStage` → `OFFER_OUT`.
- It triggers the n8n flow in
  [`../contracts/contract-generation-flow.md`](../contracts/contract-generation-flow.md),
  which renders [`../contracts/templates/loi.html`](../contracts/templates/loi.html),
  converts it to PDF, and queues it for e-signature via DocuSeal.
- Your job at this stage is just to get the deal to `OFFER_OUT` with clean data
  (offer price, property, seller contact) — the paperwork happens automatically.

## Follow-up cadence

Most sellers don't respond to the first offer. Don't let `OFFER_OUT` deals go stale:

- Day 3: follow-up call/text (see
  [`scripts/loi-follow-up-script.md`](scripts/loi-follow-up-script.md)).
- Day 10: second follow-up, offer a small concession if the parcel is a strong fit.
- Day 21: mark `DEAD` if no response, but keep the lead in the CRM for a future list
  pull — land owners' motivation changes over time.

## What "worth a due-diligence pass" means

Move `UNDER_CONTRACT` deals into `DUE_DILIGENCE` — don't skip it, but keep it light for
Wholesale Lane deals:

- Confirm title is clean enough to close or double-close.
- Confirm acreage and access match what was offered on.
- Confirm no major red flags (easements that kill buildability, flood plain covering the
  whole parcel, landlocked with no legal access).

That's it for Wholesale Lane. Full underwriting (survey, environmental, utility studies)
only happens after a deal is routed into the Hold Lane — see
[06-buy-and-hold-criteria.md](06-buy-and-hold-criteria.md).
