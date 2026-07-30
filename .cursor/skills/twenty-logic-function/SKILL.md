---
name: twenty-logic-function
description: Scaffold a Twenty SDK defineLogicFunction with database event or cron triggers. Use when adding automation to Twenty SDK apps — stage-change handlers, scheduled jobs, webhook triggers.
---

# Twenty SDK Logic Function Scaffolder

Use when adding server-side automation to `packages/twenty-apps/<app>/src/logic-functions/`.

## File naming

- kebab-case: `on-deal-stage-change.ts`, `dd-deadline-reminder.ts`
- Verb prefix: `on-` for event handlers, noun for cron jobs

## Steps

### 1. Add universal identifier

In `src/constants/universal-identifiers.ts`:

```typescript
export const MY_LOGIC_FN_ID = 'a1000070-0000-4000-8000-000000000006';
```

Logic function ids use the `a1000070` block in re-acquisition.

### 2. Create logic function file

`src/logic-functions/my-handler.ts`:

```typescript
import { MY_LOGIC_FN_ID } from 'src/constants/universal-identifiers';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: { id: string; myField?: string };
    before?: { myField?: string };
    updatedFields?: string[];
  };

  if (!props.updatedFields?.includes('myField')) return {};
  if (props.before?.myField === props.after?.myField) return {};

  const client = new CoreApiClient();
  // mutations via client.mutation({ ... } as any)

  return { processed: true };
};

export default defineLogicFunction({
  universalIdentifier: MY_LOGIC_FN_ID,
  name: 'my-handler',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
```

### 3. Trigger types

**Database event** (record created/updated/deleted):

```typescript
databaseEventTriggerSettings: {
  eventName: 'opportunity.updated', // or .created, person.updated, etc.
},
```

**Cron** (scheduled):

```typescript
cronTriggerSettings: {
  pattern: '0 8 * * *', // daily 8am UTC
},
```

### 4. Guard patterns

Always early-return `{}` when:
- `updatedFields` does not include the watched field
- `before` equals `after` (no real change)
- Idempotency condition already met (e.g. `signatureStatus !== 'NOT_SENT'`)

### 5. External HTTP (webhooks)

Keep heavy work in n8n, not logic functions (30s timeout):

```typescript
const webhookUrl = process.env.N8N_MY_WEBHOOK_URL;
if (!webhookUrl) return { skipped: true, reason: 'webhook not configured' };

await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': process.env.N8N_MY_WEBHOOK_SECRET ?? '',
  },
  body: JSON.stringify({ recordId: props.after.id }),
});
```

Add env vars to `.env.example`.

### 6. CoreApiClient mutations

```typescript
await client.mutation({
  createTask: {
    __args: {
      data: { title: 'My task', status: 'TODO' },
    },
    id: true,
  },
} as any);
```

Use `client.query` for reads with `__args: { filter, first, orderBy }`.

### 7. Publish

```bash
cd packages/twenty-apps/<app>
yarn twenty dev --once
```

## RE acquisition reference

- Stage-change tasks: [on-deal-stage-change.ts](../../../packages/twenty-apps/re-acquisition/src/logic-functions/on-deal-stage-change.ts)
- Cron reminder: [dd-deadline-reminder.ts](../../../packages/twenty-apps/re-acquisition/src/logic-functions/dd-deadline-reminder.ts)
- Webhook trigger: [on-offer-generate-contract.ts](../../../packages/twenty-apps/re-acquisition/src/logic-functions/on-offer-generate-contract.ts)
