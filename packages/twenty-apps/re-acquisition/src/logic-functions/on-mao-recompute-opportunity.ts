import { recomputeMaoForOpportunity } from 'src/logic-functions/_shared/mao-recompute';
import { ON_MAO_RECOMPUTE_OPPORTUNITY_FN_ID } from 'src/constants/universal-identifiers';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

// Watches the deal-side MAO inputs only. Must never watch the rollup
// fields this function (or the comp/infra/property adapters) writes back
// (maoWholesaleFlip, maoEntitleHold, maoHyperscaleDisposition,
// recommendedExitType, hyperscaleGateStatus, hyperscaleGateReason,
// maoLastComputedAt) — doing so would retrigger this function on its own
// write and loop forever.
const WATCHED_FIELDS = [
  'dealType',
  'postEntitlementValue',
  'entitlementCarryCost',
  'holdingCostEstimate',
  'targetMargin',
  'assignmentFee',
];

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as { after?: { id: string }; updatedFields?: string[] };

  if (!props.updatedFields?.some((field) => WATCHED_FIELDS.includes(field))) {
    return {};
  }
  if (!props.after?.id) return {};

  const client = new CoreApiClient();
  return recomputeMaoForOpportunity(client, props.after.id);
};

export default defineLogicFunction({
  universalIdentifier: ON_MAO_RECOMPUTE_OPPORTUNITY_FN_ID,
  name: 'on-mao-recompute-opportunity',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
