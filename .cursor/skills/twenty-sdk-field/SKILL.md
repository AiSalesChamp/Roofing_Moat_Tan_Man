---
name: twenty-sdk-field
description: Scaffold a Twenty SDK defineField for packages/twenty-apps apps. Use when adding custom fields to Opportunity, Person, Company, or custom objects in the RE acquisition app or other Twenty SDK apps.
---

# Twenty SDK Field Scaffolder

Use when adding a custom field to a Twenty SDK app under `packages/twenty-apps/<app>/`.

## File naming

- kebab-case: `opportunity-signature-status.field.ts`
- Prefix with object name: `opportunity-`, `person-`, `property-`, `company-`

## Steps

### 1. Add universal identifier

In `src/constants/universal-identifiers.ts`, add a constant in the correct id block:

```typescript
export const MY_FIELD_ID = 'a1000011-0000-4000-8000-000000000001';
```

Use the next sequential suffix in the block. Opportunity custom fields use `a1000010` or `a1000011` blocks in re-acquisition.

### 2. Create field file

`src/fields/opportunity-my-field.field.ts`:

```typescript
import { MY_FIELD_ID } from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: MY_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.TEXT,
  name: 'myField',
  label: 'My Field',
  icon: 'IconTag',
  isNullable: true,
});
```

### 3. Field types

| Type | Use |
|------|-----|
| `FieldType.TEXT` | Single-line text, ids |
| `FieldType.SELECT` | Single enum — add `options` array + optional `defaultValue` |
| `FieldType.MULTI_SELECT` | Tags like `dealType` |
| `FieldType.NUMBER` / `CURRENCY` | Financials |
| `FieldType.DATE` / `DATE_TIME` | Dates |
| `FieldType.LINKS` | URL fields |
| `FieldType.BOOLEAN` | Toggles |
| `FieldType.RELATION` | Links between objects |

### 4. SELECT options pattern

```typescript
options: [
  {
    id: 'f1000001-0001-4000-8000-000000000001',
    value: 'OPTION_A',
    label: 'Option A',
    position: 0,
    color: 'gray',
  },
],
defaultValue: "'OPTION_A'",
```

Extract shared option arrays to `universal-identifiers.ts` (see `DEAL_STAGES`, `SIGNATURE_STATUSES`).

### 5. Add to page layout (optional)

In `src/page-layouts/*-record-page.page-layout.ts`, add field id to a `FIELDS` widget `fieldMetadataUniversalIdentifiers` array.

### 6. Publish

```bash
cd packages/twenty-apps/<app>
yarn twenty dev --once
```

No manual index/barrel — Twenty SDK auto-discovers `src/fields/*.field.ts`.

## RE acquisition reference

- Select fields: [opportunity-deal-stage.field.ts](../../../packages/twenty-apps/re-acquisition/src/fields/opportunity-deal-stage.field.ts)
- Contract fields: [opportunity-signature-status.field.ts](../../../packages/twenty-apps/re-acquisition/src/fields/opportunity-signature-status.field.ts)
- Constants: [universal-identifiers.ts](../../../packages/twenty-apps/re-acquisition/src/constants/universal-identifiers.ts)
