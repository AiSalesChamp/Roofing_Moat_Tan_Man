import { ON_PROPERTY_UPDATED_OFFER_RECOMPUTE_FN_ID } from 'src/constants/universal-identifiers';
import { recomputeSuggestedOfferForProperty } from 'src/logic-functions/_shared/offer-recompute';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

// A CAD refresh rewrites cadLandMarketValue across a whole county's parcels, so
// every deal on a touched parcel needs its offer re-anchored. County matters
// too: it selects the multiplier.
const WATCHED_FIELDS = ['cadLandMarketValue', 'county'];

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

  // Bounded concurrency lives in the shared recompute, same as the MAO path.
  return recomputeSuggestedOfferForProperty(client, props.after.id);
};

export default defineLogicFunction({
  universalIdentifier: ON_PROPERTY_UPDATED_OFFER_RECOMPUTE_FN_ID,
  name: 'on-property-updated-offer-recompute',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'property.updated',
  },
});
