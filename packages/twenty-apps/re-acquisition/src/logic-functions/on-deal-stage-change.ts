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

// Every stage leaves exactly one open next action. A deal with none is the real
// bug in a wholesaling pipeline — it drops out of the Today queue and nothing
// else surfaces it. Due-day offsets track how fast each stage actually decays:
// a fresh lead goes cold in a day, a closed deal is a weekly follow-up.
const STAGE_NEXT_ACTIONS: Record<
  string,
  { action: string; dueInDays: number }
> = {
  SOURCED: { action: 'Call the owner and qualify motivation', dueInDays: 1 },
  QUALIFYING: { action: 'Confirm price expectation and send offer', dueInDays: 3 },
  OFFER_OUT: { action: 'Follow up on the offer', dueInDays: 3 },
  UNDER_CONTRACT: { action: 'Open title and wire earnest money', dueInDays: 2 },
  DUE_DILIGENCE: { action: 'Walk the parcel and clear inspection items', dueInDays: 5 },
  ACQUIRED: { action: 'Blast the buyers list', dueInDays: 1 },
  DISPOSITION: { action: 'Work the buyer callbacks and paper the assignment', dueInDays: 2 },
  EXIT_CLOSED: { action: 'Log the realized numbers and ask for referrals', dueInDays: 7 },
};

const addDays = (from: Date, days: number): Date => {
  const result = new Date(from);
  result.setDate(result.getDate() + days);

  return result;
};

// nextActionDate is a DATE field, so only the calendar day is meaningful —
// sending a full timestamp would make "due today" depend on the server's hour.
const toPlainDate = (date: Date): string => date.toISOString().slice(0, 10);

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

  const client = new CoreApiClient();
  const dealName = props.after.name ?? 'Deal';
  const opportunityId = props.after.id;
  const stage = props.after.dealStage;

  // Runs for every stage, including the ones with no task checklist. DEAD
  // clears the action rather than setting one — a dead deal with a live next
  // action reappears in any queue that is not filtering on stage.
  const nextAction = STAGE_NEXT_ACTIONS[stage];

  await client.mutation({
    updateOpportunity: {
      __args: {
        id: opportunityId,
        data: {
          nextAction: nextAction?.action ?? null,
          nextActionDate: nextAction
            ? toPlainDate(addDays(new Date(), nextAction.dueInDays))
            : null,
        },
      },
      id: true,
    },
  } as any);

  const tasks = STAGE_TASKS[stage];
  if (!tasks?.length) return { stage, tasksCreated: 0 };

  // createTask returns the new id directly. Re-querying by title instead would
  // attach the target to another deal's task whenever two deals share a name.
  const createTaskWithTarget = async (title: string) => {
    const created = await client.mutation({
      createTask: {
        __args: {
          data: { title: `[${stage}] ${title} — ${dealName}`, status: 'TODO' },
        },
        id: true,
      },
    } as any);

    const taskId = (created.createTask as any)?.id;
    if (!taskId) return false;

    await client.mutation({
      createTaskTarget: {
        __args: { data: { taskId, targetOpportunityId: opportunityId } },
        id: true,
      },
    } as any);

    return true;
  };

  const created = await Promise.all(tasks.map(createTaskWithTarget));

  return { stage, tasksCreated: created.filter(Boolean).length };
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
