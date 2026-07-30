# Land Funnel — Wholesale-First, Buy-and-Hold-Second

Playbook for the Texas land acquisition business: mass-offer wholesale deals now to
generate assignment-fee capital, then reinvest that capital into buy-and-hold land
positioned for power-generation and large-load (data center, crypto mining) developer
exits.

This is a **documentation layer** on top of the existing Twenty CRM app in
[`packages/twenty-apps/re-acquisition`](../../packages/twenty-apps/re-acquisition) — it
does not change any CRM code. Every stage below maps onto the app's existing `dealStage`
and `dealType` fields so this playbook can be followed today and wired into the live app
later with no rework.

## Read in this order

| # | File | What it covers |
|---|------|-----------------|
| 1 | [01-funnel-overview.md](01-funnel-overview.md) | The two-lane funnel (Wholesale Lane vs. Hold Lane) and how it maps to `dealStage` |
| 2 | [02-exit-buyer-types.md](02-exit-buyer-types.md) | Who you sell to: Wholesale Investor, Whole-tail Buyer, Power/Load Developer |
| 3 | [03-lead-sourcing-criteria.md](03-lead-sourcing-criteria.md) | What Texas land to target and where to find owner lists |
| 4 | [04-offer-at-scale-playbook.md](04-offer-at-scale-playbook.md) | How to make lots of low-effort offers, on repeat |
| 5 | [05-wholesale-disposition-playbook.md](05-wholesale-disposition-playbook.md) | How signed contracts get assigned fast for fee income |
| 6 | [06-buy-and-hold-criteria.md](06-buy-and-hold-criteria.md) | The rubric for when to keep land instead of wholesaling it |
| 7 | [07-capital-reinvestment-loop.md](07-capital-reinvestment-loop.md) | How assignment fees fund the next buy-and-hold acquisition |
| 8 | [kpi-dashboard.md](kpi-dashboard.md) | Funnel metrics and targets |

## Scripts

Ready-to-use call/outreach scripts in [`scripts/`](scripts/):

- [seller-cold-call-script.md](scripts/seller-cold-call-script.md)
- [loi-follow-up-script.md](scripts/loi-follow-up-script.md)
- [buyer-list-outreach-script.md](scripts/buyer-list-outreach-script.md)

## Visual preview

[dashboard-preview.html](dashboard-preview.html) — open directly in a browser, no build
step. Static mockup of the two-lane board (Wholesale Lane / Hold Lane) with buyer-type
tags and a capital-reinvestment stat, in the same no-dependency style as the existing
[`../ui-preview.html`](../ui-preview.html).

## The one-sentence strategy

Make offers on a lot of Texas land, wholesale almost all of it fast for assignment fees,
and use that fee income — not outside capital — to buy and hold the small number of
parcels that a power-generation or large-load developer would actually want.
