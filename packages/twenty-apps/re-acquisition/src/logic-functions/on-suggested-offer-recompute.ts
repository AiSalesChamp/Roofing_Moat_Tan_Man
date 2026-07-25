import { ON_SUGGESTED_OFFER_RECOMPUTE_FN_ID } from 'src/constants/universal-identifiers';
import { recomputeSuggestedOfferForOpportunity } from 'src/logic-functions/_shared/offer-recompute';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

// Watches the deal-side offer inputs only. Must never watch the fields this
// function writes (suggestedOfferPrice, realizedValueRatio, county) — doing so
// would retrigger it on its own write and loop forever. Same rule as the
// comment block at the top of on-mao-recompute-opportunity.ts.
//
// contractPrice is safe to watch and has to be: it is the input to
// realizedValueRatio, and the ratio is only meaningful once a deal closes.
const WATCHED_FIELDS = [
  'countyMultiplierOverride',
  'offerAggressiveness',
  'contractPrice',
  'property',
  'propertyId',
];

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

  return recomputeSuggestedOfferForOpportunity(client, props.after.id);
};

export default defineLogicFunction({
  universalIdentifier: ON_SUGGESTED_OFFER_RECOMPUTE_FN_ID,
  name: 'on-suggested-offer-recompute',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
