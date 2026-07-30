# re-lead-engine

Distressed-land lead engine for Texas. Ingests public foreclosure and tax-delinquency
records, resolves them to parcels and owners, scores motivation to sell, and promotes
only qualified leads into the Twenty CRM workspace.

**Phase 0.** Two distress sources, one identity source, rules-based scoring, mail-only
outbound, compliance built in from the start.

## The architectural boundary

Twenty is the CRM/workflow layer. It is **not** the data warehouse.

```
┌──────────────────────────────┐                ┌──────────────────────────┐
│  ENGINE (own Postgres+PostGIS)│                │  TWENTY CRM              │
│                              │                │                          │
│  IDENTITY LAYER  (annual)    │                │  properties              │
│    parcels                   │   promote      │  people                  │
│    owners                    │  ─────────▶    │  distressEvents          │
│    parcel_owners             │  only qualified │  opportunities           │
│                              │     leads      │                          │
│  SIGNAL LAYER    (monthly)   │                │                          │
│    distress_events           │                │                          │
│                              │  ◀─────────    │  opt-outs                │
│  raw_scrapes, lead_scores,   │  state sync    │                          │
│  suppression, withholds      │                │                          │
└──────────────────────────────┘                └──────────────────────────┘
```

Texas has 254 counties and millions of parcels. Loading raw parcel data into Twenty
would destroy UI performance and turn every schema change into a migration problem.
The engine is the system of record for parcels and distress events; Twenty is the
system of record for human interaction.

### Two layers, two clocks

The design turns on separating **identity** from **signal**.

| | Identity | Signal |
|---|---|---|
| Question | Who owns this, where does mail go | Is this owner in trouble |
| Source | County appraisal roll (bulk file) | LGBS / PBFCM tax-sale postings |
| Cadence | Annual (certified roll) | Monthly (sales are the first Tuesday) |
| Join key | `(county_fips, apn_normalized)` | same |

They join on `(county_fips, apn_normalized)`. That join is what turns "a parcel is
being auctioned" into "*this person* at *this address* is about to lose *this* land."

Neither Phase 0 distress source provides an owner name or a mailing address, so the
appraisal roll is not optional — it is the only path to a mailable lead.

## Setup

Requires Node 24+, Yarn 4, Docker, and `poppler-utils` (for `pdftotext`).

```bash
cd re-lead-engine
cp .env.example .env      # then edit — see "Configuration" below
yarn install
yarn db:up                # Postgres 16 + PostGIS on port 5433
yarn db:migrate
```

Port 5433 is deliberate: 5432 belongs to `twenty-dev-db`. The engine must not share a
database with the CRM, or a Twenty migration can take the warehouse down.

## Commands

```bash
# Signal layer
yarn ingest --source=lgbs               # statewide TX, ~4,200 records, ~25s
yarn ingest --source=pbfcm              # ~186 per-county PDFs
yarn ingest --source=lgbs --limit=2     # smoke test (reports what it skipped)

# Identity layer
yarn ingest --source=roll --county=48439 --file=<path> --inspect       # detect layout
yarn ingest --source=roll --county=48439 --file=<path> --auto-layout   # load it

# Scoring and promotion
yarn score                              # + distribution and rules-firing report
yarn promote --dry-run                  # prints what would enter Twenty, and why
yarn promote                            # writes to Twenty (needs API key)

# Operations
yarn health                             # freshness, record counts, match rate
yarn health --probe                     # also asserts live source schemas
yarn webhook                            # opt-out receiver, Twenty -> engine
yarn fips:load --file=national_county.txt   # authoritative county FIPS
```

## Verified end-to-end (2026-07-30)

| Step | Result |
|---|---|
| `yarn ingest --source=lgbs` | 4,173 real TX records, 9 pages, 24s |
| Re-run | 0 inserted, 4,173 updated, still 4,173 rows — **zero duplicates** |
| `yarn ingest --source=pbfcm --limit=12` | 23 events from 5 usable PDFs; 13 dead links and 4 scans reported, not parsed |
| Roll load (fixture, 400 rows) | 400 parcels, 400 owners, 320 events rematched retroactively |
| `yarn score` | 400 scored, spread 17–55, 5 rules firing |
| `yarn promote --dry-run --min-score=45` | 151 promoted, 249 withheld with reasons |
| Opt-out webhook (signed) | applied; forged signature → HTTP 401; both audited |
| Re-run after opt-out | 151 → 150, `suppressed: 1` |
| `yarn health --probe` | FAIL on both record-count tripwires, as designed |

## Known signal gaps

Read this before tuning the threshold.

**1. `PROMOTION_MIN_SCORE=60` is unreachable in Phase 0.** Max attainable is ~55.

The two heaviest rules have no Phase 0 data source:

| Rule | Weight | Phase 0 source |
|---|---|---|
| `activeNoticeOfTrusteeSale` | 32 | **none** — deed-of-trust NOTS filings live with the county clerk. LGBS and PBFCM both post *tax* foreclosures only. |
| `multiYearTaxDelinquency` | 26 | **effectively none** — needs dated events across ≥2 distinct years. ~93% of LGBS rows are `FUTURE SALE` with a null date. |

The weights are deliberately left as they are: they encode the real priority ordering
for when a NOTS source arrives. Set `PROMOTION_MIN_SCORE=45` for Phase 0. `yarn score`
warns when no parcel can clear the configured threshold.

**2. Owner name is not extracted from PBFCM PDFs.** The style-of-case column sits
beside the legal-description column, and `pdftotext -layout` interleaves them, which
produced values like `MICHELLE OF THE COUNTY CLERK OF AUSTIN`. A wrong owner name is
worse than none — it would address a letter to a fiction. Column-accurate extraction
(`pdftotext -bbox-layout` + x-range assignment) is Phase 1.

**3. Only 10 counties resolve until `yarn fips:load` runs.** The seed values in
`src/config/counties.ts` are hand-entered. Events from unseeded counties are stored
with `match_status = 'unmatched_county'` rather than dropped.

**4. Cross-source APN reconciliation is unverified per county.** `src/normalize/apn.ts`
holds per-county rules, and only the shape is asserted — not that a known parcel
matches across its roll and its tax-sale posting. Verify per county before trusting the
match rate.

## Promotion threshold

A parcel is promoted only when **all** hold:

1. ≥1 distress event within `PROMOTION_DISTRESS_LOOKBACK_DAYS` (default 180)
2. motivation score ≥ `PROMOTION_MIN_SCORE`
3. a resolvable mailing address exists
4. the owner is not suppressed for the intended channel
5. the channel is enabled

Everything else is written to `promotion_withholds` **with its reason** — including on
a dry run. That log is the tuning instrument: if most withholds are
`no_mailing_address`, the problem is the data layer, not the threshold.

An undated but currently-listed event counts as active via `updated_at`, because most
LGBS rows have no date and "still posted" is the real signal. Cancelled sales are
excluded.

## Idempotency

Re-running promotion produces zero duplicates, by three mechanisms:

- **Deterministic external IDs** — `tx-48439-3260976` for parcels,
  `own-<hash>` for owners. Readable, so a Twenty record explains itself.
- **`uuidv5(external_id, UUID_NAMESPACE)`** for the Twenty record id, plus
  `POST /rest/<plural>?upsert=true`. Matching is on the id we supply, never on a
  heuristic address comparison. `UUID_NAMESPACE` **must** match the namespace the
  fork's other integrations use (see `.cursor/skills/re-acquisition-rest-writes`), or
  capture and promotion will create two records for one parcel.
- **Payload hashing** in `twenty_sync_state` — an unchanged record is not rewritten.
  Twenty timelines every update, so a no-op write is noise in the record's history.

## Compliance

Built in Phase 0 deliberately. Retrofitting per-channel suppression across a live
multi-channel system is a quarter of engineering time.

- **Per-person, per-channel suppression**, keyed on the *identifier* as well as the
  owner row — so an opt-out follows a phone number even after a re-skip-trace
  resolves it to a different owner.
- An **unscoped opt-out lands on `all`**. One request kills every channel unless the
  person themselves narrowed it.
- **Identifiers are hashed** in `suppression`; only the last four characters are kept
  in clear, so the suppression table is not a second copy of everyone's phone number.
- **Every webhook receipt is stored before it is acted on**, signed or not. An opt-out
  that cannot be replayed cannot be defended during a TDPSA 30-day cure period.
- **Suppression is checked before spending money** on a skip trace.
- **DNC / litigator flags become suppression rows immediately**, before any channel
  could read the number as callable.
- **Channel kill switches** are read from the environment on every call, so turning a
  channel off takes effect without a restart.

**Phone and SMS ship disabled** (`CHANNEL_PHONE_ENABLED=false`,
`CHANNEL_SMS_ENABLED=false`) and must stay that way until Texas SB 140 telemarketer
registration (SOS Form 3401 + $10k bond) is confirmed complete. Mail needs no skip
trace — the appraisal roll already supplies a deliverable address — which is why
mail-only Phase 0 is also the cleanest legal posture.

`contactConsent` in Twenty carries the per-channel state that stock
`person.doNotContact` cannot: it is one boolean, with no channel scope, no provenance,
and no expiry.

## Politeness

Public, unauthenticated pages only. No accounts, no ToS click-through.

- One request queue per host, `SCRAPER_MAX_CONCURRENCY_PER_HOST=1`
- `SCRAPER_MIN_DELAY_MS=2500` floor, and a published `Crawl-delay` wins if stricter
- Exponential backoff with **full jitter**; `Retry-After` honoured when sent
- `robots.txt` parsed and respected (LGBS publishes `User-agent: *` with no
  `Disallow`; PBFCM publishes none)
- **Set `SCRAPER_CONTACT_EMAIL`.** It goes in the User-Agent so a county IT admin can
  reach a human instead of silently blocking the crawler. Currently unset.
- Raw responses are stored, so a parser fix replays from `raw_scrapes` instead of
  re-crawling someone else's server.

## Adding county adapter #3 in under an hour

**A distress source** — implement `DistressAdapter` (`src/adapters/types.ts`):
`discover()` → `fetch()` → `parse()` → `normalize()`, then add one line to
`src/adapters/registry.ts`. The four-step split exists so each step retries
independently: a parse bug is fixed and replayed against stored raw text.

Set `confidence` honestly — the score multiplies by it, so a shaky parse cannot alone
carry a parcel over the gate. LGBS (structured JSON) is 0.95; PBFCM (PDF table) is 0.7.

**An appraisal roll** — no code at all:

```bash
# 1. Download the county's certified roll into data/rolls/<fips>/
# 2. See what's actually in it
yarn ingest --source=roll --county=48201 --file=data/rolls/48201/roll.csv --inspect
```

`--inspect` reads two lines and prints the detected delimiter, a guessed field
mapping, the unmapped headers, and the first data row.

```bash
# 3a. Headers were recognised — just load it
yarn ingest --source=roll --county=48201 --file=... --auto-layout

# 3b. Otherwise paste the guess into src/adapters/appraisal-roll/layouts.ts,
#     correct it, and load without --auto-layout
```

`ROLL_LAYOUTS` ships **empty on purpose**. Inventing offsets or column names would
produce an adapter that runs, reports success, and loads garbage. Fixed-width layouts
are supported for CADs that publish record layouts rather than CSV headers.

Rolls stream line by line, so Harris does not need to fit in memory.

## Health checks report; they never repair

An adapter that silently "fixes" a source returning 3 rows instead of 3,000 hides the
fact that the source changed, and the funnel quietly shrinks for a month before anyone
notices.

`yarn health` exits non-zero on any FAIL. It checks dependencies, per-source freshness
against each SLA, record counts against `expected_min_records`, and the
matched/unmatched ratio. `--probe` additionally asserts that the live sources still
expose the fields the adapters read — which is what catches an API change *before* it
shows up as an empty ingest.

Tune `expected_min_records` in `data_sources` from the first full successful run; the
seeded values are floors, not measurements.

## Orchestration

CLI-first. Monthly cadence plus a cron line does the job:

```cron
0 3 2 * *  cd /path/re-lead-engine && yarn ingest --source=lgbs && yarn score
0 4 2 * *  cd /path/re-lead-engine && yarn ingest --source=pbfcm && yarn score
0 5 2 * *  cd /path/re-lead-engine && yarn promote
*/30 * * * * cd /path/re-lead-engine && yarn health
```

BullMQ + Redis wraps the same exported functions when there is retry or concurrency
pressure to justify it. Adding a queue now would be infrastructure without a problem.

## Configuration

See `.env.example`. The values that matter most:

| Variable | Why |
|---|---|
| `UUID_NAMESPACE` | Must match the fork's other integrations or you get duplicate records. |
| `PROMOTION_MIN_SCORE` | Default 60 is unreachable in Phase 0 — see "known signal gaps". |
| `SCRAPER_CONTACT_EMAIL` | Set it. Anonymous crawlers get blocked, and deserve to be. |
| `CHANNEL_PHONE_ENABLED` / `CHANNEL_SMS_ENABLED` | Keep false until SB 140 registration clears. |
| `WEBHOOK_SHARED_SECRET` | Unset means unsigned requests are accepted (logged every time). |

## Schema notes

- `distress_events.parcel_id` is **nullable**. An unmatched event is evidence that a
  county's roll is missing or stale; discarding it would hide the gap. Loading that
  roll later rematches them (`eventsRematched` in the roll ingest summary).
- `parcel_owners` is versioned by roll year, so a recent transfer shows as two rows
  rather than a silent overwrite.
- Absentee status is a **view**, not a stored boolean — it is a comparison between two
  addresses, and storing only the answer loses the ability to re-evaluate when one of
  them is corrected.
- `lead_scores` records `weights_version`, so which weights produced a mailed lead is
  provable.
- **`TRUNCATE parcels CASCADE` also truncates `distress_events`** (FK on `parcel_id`).
  Use `DELETE` if you mean to keep the signal layer.

## Testing without a real appraisal roll

```bash
node src/scripts/make-fixture-roll.ts --county=48439
```

Real APNs from already-ingested distress events + **synthetic** owners, addresses and
values. Every owner name is literally `FIXTURE...`. It exercises the identity join for
real while making it impossible to mistake the output for production data.

## Not in Phase 0

No ML scoring (no outcome data to train on). No ad-audience sync (rural match rates
will not clear Meta's delivery floor until the lead pool accumulates). No county
scrapers beyond LGBS/PBFCM. No LLM extraction — deterministic parsers only; scanned
PDFs are reported as `needs_ocr` and left for Phase 1. No skip tracing at volume — the
interface is wired and the stub returns `no_hit` for everything, deliberately, because
a stub that invented plausible phone numbers would be indistinguishable from a working
vendor and someone would eventually dial one.
