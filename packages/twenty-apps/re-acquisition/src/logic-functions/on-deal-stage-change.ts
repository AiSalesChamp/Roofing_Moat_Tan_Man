import {
  ON_DEAL_STAGE_CHANGE_FN_ID,
} from 'src/constants/universal-identifiers';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

const STAGE_TASKS: Record<string, string[]> = {
  UNDER_CONTRACT: [
    'Order title search',
    'Track earnest money deposit',
    'Set due diligence deadline',
  ],
  DUE_DILIGENCE: [
    'Schedule property inspection',
    'Order survey (if land)',
    'Review environmental report (commercial/industrial)',
    'Verify zoning and entitlements',
  ],
  ACQUIRED: [
    'Notify buyers list (wholesale)',
    'Create rehab scope (flip)',
    'Update insurance and utilities',
  ],
  DISPOSITION: [
    'Market to buyers list',
    'Track assignment or listing status',
  ],
};

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: { id: string; dealStage?: string; name?: string };
    before?: { dealStage?: string };
    updatedFields?: string[];
  };

  if (!props.updatedFields?.includes('dealStage')) return {};
  if (!props.after?.dealStage || props.before?.dealStage === props.after.dealStage) {
    return {};
  }

  const dealName = props.after.name ?? 'Deal';

  const webhookUrl = process.env.N8N_DEAL_STAGE_WEBHOOK_URL;
  if (webhookUrl) {
    // Best-effort — a notification failure should never block task creation.
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: props.after.id,
        name: dealName,
        dealStage: props.after.dealStage,
        previousDealStage: props.before?.dealStage ?? null,
      }),
    }).catch(() => {});
  }

  const tasks = STAGE_TASKS[props.after.dealStage];
  if (!tasks?.length) return {};

  const client = new CoreApiClient();

  for (const title of tasks) {
    const created = await client.mutation({
      createTask: {
        __args: {
          data: {
            title: `[${props.after.dealStage}] ${title} — ${dealName}`,
            status: 'TODO',
          },
        },
        id: true,
      },
    } as any);

    const taskId = (created as any).createTask?.id;
    if (taskId) {
      await client.mutation({
        createTaskTarget: {
          __args: {
            data: {
              taskId,
              targetOpportunityId: props.after.id,
            },
          },
          id: true,
        },
      } as any);
    }
  }

  return { stage: props.after.dealStage, tasksCreated: tasks.length };
};

export default defineLogicFunction({
  universalIdentifier: ON_DEAL_STAGE_CHANGE_FN_ID,
  name: 'on-deal-stage-change',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
