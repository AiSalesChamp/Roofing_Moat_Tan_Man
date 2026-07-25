import { recomputeMaoForProperty } from 'src/logic-functions/_shared/mao-recompute';
import { ON_PROPERTY_UPDATED_MAO_RECOMPUTE_FN_ID } from 'src/constants/universal-identifiers';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

const WATCHED_FIELDS = ['zoningTrajectory', 'acreage'];

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: { id: string };
    updatedFields?: string[];
  };

  if (!props.updatedFields?.some((field) => WATCHED_FIELDS.includes(field))) {
    return {};
  }
  if (!props.after?.id) return {};

  const client = new CoreApiClient();
  return recomputeMaoForProperty(client, props.after.id);
};

export default defineLogicFunction({
  universalIdentifier: ON_PROPERTY_UPDATED_MAO_RECOMPUTE_FN_ID,
  name: 'on-property-updated-mao-recompute',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'property.updated',
  },
});
