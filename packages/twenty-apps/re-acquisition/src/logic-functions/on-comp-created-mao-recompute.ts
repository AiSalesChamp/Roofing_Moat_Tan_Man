import { recomputeMaoForProperty } from 'src/logic-functions/_shared/mao-recompute';
import { ON_COMP_CREATED_MAO_RECOMPUTE_FN_ID } from 'src/constants/universal-identifiers';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as { after?: { compPropertyId?: string } };
  const propertyId = props.after?.compPropertyId;
  if (!propertyId) return {};

  const client = new CoreApiClient();
  return recomputeMaoForProperty(client, propertyId);
};

export default defineLogicFunction({
  universalIdentifier: ON_COMP_CREATED_MAO_RECOMPUTE_FN_ID,
  name: 'on-comp-created-mao-recompute',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'comparableSale.created',
  },
});
