import {
  deterministicId,
  resolvePropertyIdByApn,
  seeds,
  toAddress,
  toCurrency,
  toFullName,
  toPhones,
  toRichText,
  unwrapRestRecord,
} from '../../shared/twenty-writes.mjs';

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
    return unwrapRestRecord(result, objectPlural);
  }

  async writeSellerCallExtraction(extraction, transcriptBody) {
    const callId = extraction.extractionMeta?.externalCallId || 'unknown-call';
    const identity = extraction.identity || {};
    const disposition = extraction.disposition || {};

    const address = toAddress(identity.propertyAddress);

    // When the seller states an APN, an engine-promoted (parcel-seeded) record
    // may already exist — reuse it instead of minting an address-seeded twin.
    const existingByApn = await resolvePropertyIdByApn(
      (path) => this.request('GET', path),
      identity.apn?.value,
    ).catch(() => null);
    const propertyId =
      existingByApn ??
      deterministicId(
        address ? seeds.propertyFromAddress(address) : seeds.labeled('property', callId),
      );
    const opportunityId = deterministicId(seeds.opportunity(callId));
    const personId = identity.leadPhoneE164
      ? deterministicId(seeds.personFromPhone(identity.leadPhoneE164))
      : identity.sellerFullName
        ? deterministicId(seeds.personFromName(identity.sellerFullName))
        : null;
    const transcriptId = deterministicId(seeds.labeled('callTranscript', callId));
    const inspectionId = deterministicId(seeds.labeled('inspection', callId));

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
      const name = toFullName(identity.sellerFullName);
      const personPayload = {
        id: personId,
        ...(name ? { name } : {}),
        ...(identity.sellerEmail
          ? { emails: { primaryEmail: identity.sellerEmail, additionalEmails: [] } }
          : {}),
        ...(toPhones(identity.leadPhoneE164)
          ? { phones: toPhones(identity.leadPhoneE164) }
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
      const noteId = deterministicId(seeds.labeled('note', callId));
      note = await this.upsert('notes', {
        id: noteId,
        title: `Seller call notes — ${callId.slice(0, 8)}`,
        bodyV2: toRichText(noteParts.join('\n\n')),
      });
      await this.upsert('noteTargets', {
        id: deterministicId(seeds.labeled('noteTarget', callId)),
        noteId,
        targetOpportunityId: opportunity.id || opportunityId,
        ...(person ? { targetPersonId: person.id || personId } : {}),
      });
    }

    let task = null;
    if (disposition.followUpCommitment) {
      const taskId = deterministicId(seeds.labeled('task', callId));
      task = await this.upsert('tasks', {
        id: taskId,
        title: disposition.followUpCommitment.slice(0, 255),
        status: 'TODO',
        bodyV2: toRichText(`From seller call ${callId}`),
      });
      await this.upsert('taskTargets', {
        id: deterministicId(seeds.labeled('taskTarget', callId)),
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
