# RE Acquisition — Twenty CRM Extension

Real estate acquisition layer for the Twenty-20 fork.

## Structure

```
re-acquisition/
├── property-capture/     # Mobile capture → n8n → Twenty (PWA: capture + review queue + pipeline glance)
├── acquisition-voice/    # Seller call / site memo LLM extraction
├── field-loop/           # Draft-and-confirm sidecar: pending drafts, eval log, autonomy ratchet
├── glasses-app/          # Ray-Ban Display web app (600x600, Neural Band pinch-to-confirm)
├── contracts/            # PDF generation + DocuSeal e-sign → Twenty
└── land-funnel/          # Land wholesale-first funnel playbook (docs + static HTML preview)

packages/twenty-apps/re-acquisition/   # Twenty SDK app (install this)
```

## Draft-and-confirm loop (field layer)

Voice extractions no longer write straight to Twenty. They land as pending
drafts in `field-loop/`; a human confirms/edits from the PWA Review tab (or
pinch-confirms on the glasses app), and the confirm fires the CRM upsert.
Every resolution feeds an eval log that earns per-field autonomy over time.
Start here: `field-loop/README.md`. Fork policy: `TWENTY-FORK-HYGIENE.md`.

## Install

1. Start Twenty: `yarn start` from repo root
2. Publish app: see `packages/twenty-apps/re-acquisition/README.md`
3. Seed demo data: `yarn seed` from app directory

## Deal pipeline

Single kanban on `dealStage`: Sourced → Qualifying → Offer Out → Under Contract → Due Diligence → Acquired → Disposition → Exit Closed → Dead

Tag deals with `dealType`: Wholesale, Flip, Land, Commercial, Industrial

## Contract e-signature

When a deal moves to `OFFER_OUT`, the app triggers n8n to generate a contract PDF (Gotenberg) and send it for signature (DocuSeal). On signature, `dealStage` advances to `UNDER_CONTRACT` automatically.

Setup: `re-acquisition/contracts/README.md`

## Land wholesale-first funnel

For the Texas land vertical specifically — wholesale at scale first for assignment-fee
capital, then reinvest that capital into buy-and-hold land positioned for power-
generation / large-load developer exits — see `re-acquisition/land-funnel/`. Start at
`land-funnel/README.md`.
