import { ON_OFFER_GENERATE_CONTRACT_FN_ID } from 'src/constants/universal-identifiers';
import { DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

const WEBHOOK_TIMEOUT_MS = 20_000;

const resolveContractType = (
  dealType: string[] | string | null | undefined,
): string => {
  const types = Array.isArray(dealType) ? dealType : dealType ? [dealType] : [];

  if (types.includes('WHOLESALE')) {
    return 'ASSIGNMENT';
  }

  return 'PSA';
};

const handler = async (payload: DatabaseEventPayload) => {
  const props = payload.properties as {
    after?: {
      id: string;
      dealStage?: string;
      signatureStatus?: string;
      contractType?: string;
      dealType?: string[] | string;
    };
    before?: { dealStage?: string };
    updatedFields?: string[];
  };

  if (!props.updatedFields?.includes('dealStage')) return {};
  if (props.before?.dealStage === props.after?.dealStage) return {};
  if (props.after?.dealStage !== 'OFFER_OUT') return {};
  if (props.after?.signatureStatus && props.after.signatureStatus !== 'NOT_SENT') {
    return {};
  }

  const webhookUrl = process.env.N8N_CONTRACT_WEBHOOK_URL;
  if (!webhookUrl) {
    return { skipped: true, reason: 'N8N_CONTRACT_WEBHOOK_URL not configured' };
  }

  const opportunityId = props.after.id;
  const contractType =
    props.after.contractType ?? resolveContractType(props.after.dealType);

  // Bounded below the function's own 30s timeout so an unresponsive n8n
  // surfaces as a webhook error rather than an opaque function timeout.
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.N8N_CONTRACT_WEBHOOK_SECRET
        ? { 'X-Webhook-Secret': process.env.N8N_CONTRACT_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({ opportunityId, contractType }),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Contract webhook failed: ${response.status} ${await response.text()}`,
    );
  }

  return {
    opportunityId,
    contractType,
    triggered: true,
  };
};

export default defineLogicFunction({
  universalIdentifier: ON_OFFER_GENERATE_CONTRACT_FN_ID,
  name: 'on-offer-generate-contract',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
  },
});
