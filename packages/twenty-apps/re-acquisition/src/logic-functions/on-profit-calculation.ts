import { ON_PROFIT_CALCULATION_FN_ID } from 'src/constants/universal-identifiers';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

const microsToDollars = (micros: number | null | undefined): number =>
  (micros ?? 0) / 1_000_000;

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: {
      id: string;
      arv?: { amountMicros?: number } | null;
      contractPrice?: { amountMicros?: number } | null;
      rehabEstimate?: { amountMicros?: number } | null;
      holdingCostEstimate?: { amountMicros?: number } | null;
      assignmentFee?: { amountMicros?: number } | null;
    };
    updatedFields?: string[];
  };

  const financialFields = [
    'arv',
    'contractPrice',
    'rehabEstimate',
    'holdingCostEstimate',
    'assignmentFee',
  ];
  if (!props.updatedFields?.some((f) => financialFields.includes(f))) {
    return {};
  }

  const after = props.after;
  if (!after?.id) return {};

  const arv = microsToDollars(after.arv?.amountMicros);
  const contract = microsToDollars(after.contractPrice?.amountMicros);
  const rehab = microsToDollars(after.rehabEstimate?.amountMicros);
  const holding = microsToDollars(after.holdingCostEstimate?.amountMicros);
  const assignment = microsToDollars(after.assignmentFee?.amountMicros);

  const projectedProfit = arv - contract - rehab - holding - assignment;
  const amountMicros = Math.round(projectedProfit * 1_000_000);

  const client = new CoreApiClient();
  await client.mutation({
    updateOpportunity: {
      __args: {
        id: after.id,
        data: {
          projectedProfit: { amountMicros, currencyCode: 'USD' },
        },
      },
      id: true,
    },
  } as any);

  return { projectedProfit };
};

export default defineLogicFunction({
  universalIdentifier: ON_PROFIT_CALCULATION_FN_ID,
  name: 'on-profit-calculation',
  timeoutSeconds: 10,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
