# RE Acquisition — Twenty CRM Extension

Real estate acquisition layer for the Twenty-20 fork.

## Structure

```
re-acquisition/
├── property-capture/     # Mobile capture → n8n → Twenty
├── acquisition-voice/    # Seller call / site memo LLM extraction
├── contracts/            # PDF generation + DocuSeal e-sign → Twenty
└── land-funnel/          # Land wholesale-first funnel playbook (docs + static HTML preview)

packages/twenty-apps/re-acquisition/   # Twenty SDK app (install this)
```

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
