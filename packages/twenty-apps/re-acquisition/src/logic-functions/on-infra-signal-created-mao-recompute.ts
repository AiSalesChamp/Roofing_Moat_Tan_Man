import { recomputeMaoForProperty } from 'src/logic-functions/_shared/mao-recompute';
import { ON_INFRA_SIGNAL_CREATED_MAO_RECOMPUTE_FN_ID } from 'src/constants/universal-identifiers';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as { after?: { infraPropertyId?: string } };
  const propertyId = props.after?.infraPropertyId;
  if (!propertyId) return {};

  const client = new CoreApiClient();
  return recomputeMaoForProperty(client, propertyId);
};

export default defineLogicFunction({
  universalIdentifier: ON_INFRA_SIGNAL_CREATED_MAO_RECOMPUTE_FN_ID,
  name: 'on-infra-signal-created-mao-recompute',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'infrastructureSignal.created',
  },
});
