# Lead Sourcing Criteria — What Texas Land to Target

Volume comes first: get as many qualified Texas land leads into `SOURCED` as possible.
"Qualified" just means it clears the filters below — full underwriting happens later at
`QUALIFYING`/`DUE_DILIGENCE`.

## Baseline filters (apply to every list pull)

- **Location:** Texas only, prioritize counties with active or announced power-generation
  or large-load development (see growth signals below).
- **Acreage:** 5+ acres. Below that, land is rarely useful to a power/load developer even
  after assembly, and margins on tiny wholesale lots are thin.
- **Ownership:** Vacant/unimproved land only. Absentee owners (mailing address different
  from property address) and out-of-state owners convert better — less emotional
  attachment, easier motivation to sell.
- **Tenure:** Owned 5+ years, or free and clear (no mortgage) — signals lower payoff
  friction and higher seller flexibility on price.
- **Tax status:** Include tax-delinquent parcels — strong motivation signal.

## Growth signals to weight lists toward (Hold Lane candidates)

Pull these into a separate "high-priority" queue so they get expedited due diligence
instead of sitting in the general offer batch:

- Parcels within ~2 miles of existing or planned ERCOT substations/transmission lines
  (161kV+).
- Counties inside ERCOT's fastest-growing load zones (check ERCOT's Large Load
  interconnection queue and CDR reports for pipeline activity).
- Parcels adjacent to or near announced data center / crypto mining campuses — proximity
  drives up both power availability and buyer interest.
- Parcels with existing 3-phase power at the road, or within a short extension of it.
- Industrial or heavy-commercial zoning, or unzoned county land with an easy path to it.
- Road frontage on a state highway or FM road capable of handling heavy construction
  traffic.

## List sources

- County appraisal district (CAD) bulk data exports — ownership, acreage, land use code,
  mailing address, tax status.
- ERCOT interconnection queue and Capacity, Demand and Reserves (CDR) reports — publicly
  posted, shows where load growth is concentrated.
- Skip-tracing services layered on top of CAD pulls to get owner phone/email/mailing
  address.
- Driving-for-dollars in target corridors for vacant land not yet on a list.
- Referrals from title companies, land brokers, and surveyors already working these
  counties.

## Feed into the CRM

Every qualifying lead becomes a `Property` + `Opportunity` record at `dealStage =
SOURCED`, `dealType` including `LAND`, using the existing ingestion paths already built
in this repo:

- Bulk/manual entry: standard Twenty record creation.
- Field-captured leads (driving-for-dollars, doorknocking): see
  [`../property-capture/`](../property-capture/) for the mobile capture → n8n → Twenty
  ingestion contract.
- Seller call notes: see [`../acquisition-voice/`](../acquisition-voice/) for the call/
  site-memo extraction schemas that populate motivation and property details
  automatically.
