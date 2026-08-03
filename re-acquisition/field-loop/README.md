# Field Loop — Draft-and-Confirm Sidecar

The Jarvis loop between voice extraction and Twenty: extractions land here as
**pending drafts**, a human confirms/edits/discards in ~2 seconds, confirms
write to Twenty through the existing shared writer. Every resolution is logged
— extraction vs correction — and that log is the eval corpus that **earns**
per-field autonomy.

Twenty stays the only system of record. This store owns only the pending queue
and the append-only eval log — a sidecar, never a shadow CRM.

```
field-loop/
├── server/
│   ├── server.js    # HTTP API + static host (zero deps: node:http + node:sqlite)
│   ├── store.js     # drafts + eval_events + autonomy_overrides (SQLite, WAL)
│   ├── fields.js    # extraction flattening + per-field grading
│   ├── policy.js    # autonomy ratchet (risk classes, thresholds)
│   └── commit.js    # confirmed draft → Twenty (seller-call + site-memo)
├── public/dashboard.html   # accuracy dashboard
├── evals/seed/             # golden extractions from real sample calls
├── scripts/backtest.js     # run real Ollama extraction vs goldens
└── tests/                  # node:test — unit + API integration (stub Twenty)
```

## Run

```bash
cd re-acquisition/field-loop
npm start          # http://127.0.0.1:4680
npm test           # 33 tests, no services needed
npm run backtest   # real Ollama extraction graded against evals/seed goldens
```

Surfaces served: `/dashboard/` (accuracy), `/app/` (capture PWA with Review +
Pipeline tabs), `/glasses/` (Ray-Ban Display web app).

Env: `FIELD_LOOP_PORT` (4680) · `FIELD_LOOP_DB` (data/field-loop.db) ·
`FIELD_LOOP_SECRET` (optional shared secret) · `TWENTY_API_URL` /
`TWENTY_API_KEY` (without a key, confirms resolve locally and record the skip).

## API

| Route | Purpose |
|---|---|
| `POST /api/drafts` | `{kind, sourceId, transcript, extraction}` → pending draft (or auto-commit) |
| `GET /api/drafts?status=pending` | review queue |
| `POST /api/drafts/:id/confirm` | optional `{extraction}` with edits → grade → Twenty write |
| `POST /api/drafts/:id/discard` | log judgment, write nothing |
| `GET /api/evals/accuracy` | per-field accuracy + autonomy eligibility |
| `GET /api/evals/events` | raw eval log |
| `GET /api/autonomy` · `POST /api/autonomy/overrides` · `POST /api/autonomy/enabled` | ratchet controls |
| `GET /api/pipeline` | dealStage glance (reads Twenty) |

Idempotency: re-submitting the same `(kind, sourceId)` updates the pending
draft instead of duplicating it; replays of resolved drafts are no-ops.

## The autonomy ratchet

| Risk class | Fields (examples) | Auto-commit requires |
|---|---|---|
| low | timeline, condition notes, objections, summaries | ≥95% accuracy over ≥20 graded samples |
| high | asking price, APN, address, names/contacts, deal type, offer intent | ≥98% over ≥50 samples **and** a manual override |

- A draft auto-commits only when **every** populated field is eligible; one
  ineligible field holds the whole draft for review.
- Accuracy counts only human-graded confirms (`confirm`, `confirm_edited`).
  Auto-commits and discards are logged but never feed accuracy — the model
  does not grade itself.
- Kill switch: `POST /api/autonomy/enabled {"enabled": false}`.

## Backtest

`npm run backtest` runs the real extraction pipeline (Ollama, model from
`OLLAMA_MODEL`) over `evals/seed/*.json` and grades each field against the
golden: `exact` / `fuzzy` (free-text token overlap) / `miss`, plus
hallucination counts. `--runs N` repeats for stability; `--seed <name>`
filters; `--submit` also pushes the drafts into the loop.

Grow the seed set from production: every reviewed draft is already logged in
`eval_events`; export the interesting ones as new goldens.
