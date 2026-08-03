# Twenty Fork Hygiene

Decision (Aug 2026): **Twenty stays** as the CRM backend and system of record.
The build energy goes to the layer above it (field-loop, capture PWA, glasses
app). That deal only stays cheap if the fork remains mergeable with upstream.

## Rules

1. **The SDK app is the single source of truth for schema.**
   All custom objects, fields, views, roles, and logic functions live in
   `packages/twenty-apps/re-acquisition/` and deploy via `yarn twenty dev --once`.
   Never hand-edit workspace metadata in the UI/DB and call it done — codify it
   in the SDK app or it will be lost on the next publish.

2. **Keep core patches minimal and cosmetic.**
   The sky-palette / dark-first tweaks in `twenty-front` are acceptable.
   Deep component forks that fight upstream refactors are not — if a change
   can live in the SDK app, a sidecar (like `re-acquisition/field-loop/`), or
   an n8n workflow, put it there instead of in `packages/twenty-*` core.

3. **All CRM writers share one identity grammar.**
   `re-acquisition/shared/twenty-writes.mjs` is the only authority for
   deterministic record ids and composite field shapes. New writers (the
   field-loop commit module included) import it; n8n Code nodes mirror it and
   must be updated in the same change.

4. **Sidecars, not schema.** The field-loop draft store deliberately lives
   outside Twenty (its own SQLite DB). Do not add "pending draft" objects to
   the CRM — confirmed data is the only data Twenty should hold.

## Upstream merge procedure

```bash
git remote add upstream https://github.com/twentyhq/twenty.git  # once
git fetch upstream
git checkout -b chore/upstream-merge-$(date +%Y%m%d)
git merge upstream/main
```

Expected conflict surface, in order of likelihood:

- `packages/twenty-front/` cosmetic patches (palette/theme) — re-apply ours,
  they are small by rule 2.
- `packages/twenty-apps/re-acquisition/` — ours only; upstream never touches it.
- Root config (`package.json`, `nx.json`) — take upstream, re-add our
  workspace entries.

After merging: `npx nx typecheck twenty-server && npx nx typecheck twenty-front`,
re-publish the SDK app (`yarn twenty dev --once`), run the field-loop suite
(`cd re-acquisition/field-loop && npm test`), and spot-check the REST surface
the sidecars depend on (`/rest/opportunities`, `/rest/properties`,
`?upsert=true` behavior) — those endpoints are the fork's real API contract
with the field layer.
