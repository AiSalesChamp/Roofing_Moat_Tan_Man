import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function deterministicId(seed, label) {
  return uuidv5(`${seed}:${label}`, NAMESPACE);
}

function parseName(fullName) {
  if (!fullName || typeof fullName !== 'object') return null;
  if (fullName.firstName || fullName.lastName) return fullName;
  if (typeof fullName === 'string') {
    const parts = fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }
  return null;
}

function toAddress(addr) {
  if (!addr) return null;
  if (addr.addressStreet1) return addr;
  return {
    addressStreet1: addr.street1 || addr.addressStreet1 || '',
    addressStreet2: addr.street2 || addr.addressStreet2 || null,
    addressCity: addr.city || addr.addressCity || '',
    addressState: addr.state || addr.addressState || '',
    addressPostcode: addr.zip || addr.addressPostcode || '',
    addressCountry: addr.country || addr.addressCountry || 'United States',
  };
}

function toCurrency(value) {
  if (value == null) return null;
  const num = typeof value === 'object' ? value.value : value;
  if (num == null || Number.isNaN(Number(num))) return null;
  return {
    amountMicros: Math.round(Number(num) * 1_000_000),
    currencyCode: 'USD',
  };
}

function toRichText(markdown) {
  if (!markdown) return null;
  return { markdown: String(markdown), blocknote: null };
}

function parsePhone(e164) {
  if (!e164) return null;
  const digits = e164.replace(/\D/g, '');
  const national = digits.startsWith('1') ? digits.slice(1) : digits;
  return {
    primaryPhoneNumber: national,
    primaryPhoneCountryCode: 'US',
    primaryPhoneCallingCode: '+1',
    additionalPhones: null,
  };
}

export class TwentyWriter {
  constructor({ apiUrl, apiKey }) {
    this.apiUrl = (apiUrl || process.env.TWENTY_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.apiKey = apiKey || process.env.TWENTY_API_KEY;
    if (!this.apiKey) throw new Error('TWENTY_API_KEY is required');
  }

  async request(method, path, body) {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`Twenty ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    }
    return json;
  }

  async upsert(objectPlural, record) {
    const result = await this.request('POST', `/rest/${objectPlural}?upsert=true`, record);
    return result.data?.[objectPlural.slice(0, -1)] ?? result.data ?? result;
  }

  async writeSellerCallExtraction(extraction, transcriptBody) {
    const callId = extraction.extractionMeta?.externalCallId || 'unknown-call';
    const identity = extraction.identity || {};
    const disposition = extraction.disposition || {};

    const address = toAddress(identity.propertyAddress);
    const addressKey = address
      ? `${address.addressStreet1}|${address.addressCity}|${address.addressState}|${address.addressPostcode}`
      : callId;

    const propertyId = deterministicId(addressKey, 'property');
    const opportunityId = deterministicId(callId, 'opportunity');
    const personId = identity.leadPhoneE164
      ? deterministicId(identity.leadPhoneE164, 'person')
      : identity.sellerFullName
        ? deterministicId(JSON.stringify(parseName(identity.sellerFullName)), 'person')
        : null;
    const transcriptId = deterministicId(callId, 'callTranscript');
    const inspectionId = deterministicId(callId, 'inspection');

    const propertyPayload = {
      id: propertyId,
      ...(address ? { propertyAddress: address } : {}),
      ...(identity.apn?.value ? { apn: identity.apn.value } : {}),
    };
    const property = await this.upsert('properties', propertyPayload);

    const oppName = address?.addressStreet1
      ? `${address.addressStreet1} — Seller call`
      : `Seller call ${callId.slice(0, 8)}`;

    const opportunityPayload = {
      id: opportunityId,
      name: oppName,
      propertyId: property.id || propertyId,
      ...(address ? { propertyAddress: address } : {}),
      dealStage: 'QUALIFYING',
      ...(identity.leadSource ? { leadSource: identity.leadSource } : {}),
      ...(disposition.sellerMotivation ? { motivation: disposition.sellerMotivation } : {}),
      ...(disposition.dealTypeHint ? { dealType: disposition.dealTypeHint } : {}),
      ...(toCurrency(disposition.askingPrice) ? { askingPrice: toCurrency(disposition.askingPrice) } : {}),
    };
    const opportunity = await this.upsert('opportunities', opportunityPayload);

    let person = null;
    if (personId) {
      const name = parseName(identity.sellerFullName);
      const personPayload = {
        id: personId,
        ...(name ? { name } : {}),
        ...(identity.sellerEmail
          ? { emails: { primaryEmail: identity.sellerEmail, additionalEmails: [] } }
          : {}),
        ...(parsePhone(identity.leadPhoneE164)
          ? { phones: parsePhone(identity.leadPhoneE164) }
          : {}),
      };
      person = await this.upsert('people', personPayload);
    }

    const transcriptPayload = {
      id: transcriptId,
      transcriptBody: toRichText(transcriptBody),
      ...(disposition.callOutcome ? { callOutcome: disposition.callOutcome } : { callOutcome: 'CONNECTED' }),
      extractedData: extraction,
      ...(person ? { transcriptPersonId: person.id || personId } : {}),
      transcriptOpportunityId: opportunity.id || opportunityId,
    };
    const callTranscript = await this.upsert('callTranscripts', transcriptPayload);

    if (disposition.propertyConditionNotes) {
      await this.upsert('propertyInspections', {
        id: inspectionId,
        inspectionType: 'DRIVE_BY',
        findingsSummary: toRichText(disposition.propertyConditionNotes),
        propertyId: property.id || propertyId,
        inspectionOpportunityId: opportunity.id || opportunityId,
      });
    }

    const noteParts = [];
    if (disposition.timelineToSell) noteParts.push(`**Timeline:** ${disposition.timelineToSell}`);
    if (disposition.followUpCommitment) noteParts.push(`**Follow-up:** ${disposition.followUpCommitment}`);
    if (disposition.objections?.length) {
      noteParts.push(`**Objections:** ${disposition.objections.join(', ')}`);
    }

    let note = null;
    if (noteParts.length) {
      const noteId = deterministicId(callId, 'note');
      note = await this.upsert('notes', {
        id: noteId,
        title: `Seller call notes — ${callId.slice(0, 8)}`,
        bodyV2: toRichText(noteParts.join('\n\n')),
      });
      await this.upsert('noteTargets', {
        id: deterministicId(callId, 'noteTarget'),
        noteId,
        targetOpportunityId: opportunity.id || opportunityId,
        ...(person ? { targetPersonId: person.id || personId } : {}),
      });
    }

    let task = null;
    if (disposition.followUpCommitment) {
      const taskId = deterministicId(callId, 'task');
      task = await this.upsert('tasks', {
        id: taskId,
        title: disposition.followUpCommitment.slice(0, 255),
        status: 'TODO',
        bodyV2: toRichText(`From seller call ${callId}`),
      });
      await this.upsert('taskTargets', {
        id: deterministicId(callId, 'taskTarget'),
        taskId,
        targetOpportunityId: opportunity.id || opportunityId,
      });
    }

    return {
      propertyId: property.id || propertyId,
      opportunityId: opportunity.id || opportunityId,
      personId: person?.id || personId,
      callTranscriptId: callTranscript.id || transcriptId,
      noteId: note?.id,
      taskId: task?.id,
    };
  }
}
