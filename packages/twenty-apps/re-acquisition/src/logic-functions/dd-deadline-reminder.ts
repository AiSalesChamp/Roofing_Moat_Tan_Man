import { DD_DEADLINE_REMINDER_FN_ID } from 'src/constants/universal-identifiers';
import { defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

const handler = async () => {
  const client = new CoreApiClient();
  const now = new Date();
  const threeDaysOut = new Date(now);
  threeDaysOut.setDate(threeDaysOut.getDate() + 3);
  const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

  const result = await client.query({
    opportunities: {
      __args: {
        filter: {
          dueDiligenceDeadline: { eq: threeDaysStr },
          dealStage: { eq: 'DUE_DILIGENCE' },
        },
        first: 50,
      },
      edges: {
        node: { id: true, name: true, dueDiligenceDeadline: true },
      },
    },
  } as any);

  const deals = (result.opportunities as any).edges ?? [];
  let remindersCreated = 0;

  for (const { node } of deals) {
    await client.mutation({
      createTask: {
        __args: {
          data: {
            title: `DD deadline in 3 days — ${node.name}`,
            status: 'TODO',
          },
        },
        id: true,
      },
    } as any);

    const taskResult = await client.query({
      tasks: {
        __args: {
          filter: { title: { eq: `DD deadline in 3 days — ${node.name}` } },
          first: 1,
          orderBy: [{ createdAt: 'Desc' }],
        },
        edges: { node: { id: true } },
      },
    } as any);

    const taskId = (taskResult.tasks as any).edges[0]?.node?.id;
    if (taskId) {
      await client.mutation({
        createTaskTarget: {
          __args: {
            data: { taskId, targetOpportunityId: node.id },
          },
          id: true,
        },
      } as any);
      remindersCreated++;
    }
  }

  return { remindersCreated, checkedDate: threeDaysStr };
};

export default defineLogicFunction({
  universalIdentifier: DD_DEADLINE_REMINDER_FN_ID,
  name: 'dd-deadline-reminder',
  timeoutSeconds: 60,
  handler,
  cronTriggerSettings: {
    pattern: '0 8 * * *',
  },
});
