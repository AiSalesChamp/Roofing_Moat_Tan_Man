# Twenty Field Mapping — RE Acquisition Extraction → CRM

Maps extraction JSON to Twenty `FieldMetadataType` and REST payloads. SELECT option values must exist before record writes (provisioned by RE Acquisition SDK app).

## Composite shapes

| Type | Payload |
|---|---|
| FULL_NAME | `{ firstName, lastName }` |
| EMAILS | `{ primaryEmail, additionalEmails: [] }` |
| PHONES | `{ primaryPhoneNumber, primaryPhoneCountryCode, primaryPhoneCallingCode, additionalPhones: null }` |
| ADDRESS | `{ addressStreet1, addressStreet2, addressCity, addressState, addressPostcode, addressCountry }` |
| CURRENCY | `{ amountMicros, currencyCode }` — dollars × 1e6 |
| RICH_TEXT | `{ markdown, blocknote }` |
| RAW_JSON | arbitrary JSON for evidence |

## Seller Call → Twenty

| Extraction | Target | Type |
|---|---|---|
| identity.sellerFullName | Person.name | FULL_NAME |
| identity.sellerEmail | Person.emails | EMAILS |
| identity.leadPhoneE164 | Person.phones | PHONES |
| identity.propertyAddress | Property.propertyAddress + Opportunity.propertyAddress | ADDRESS |
| identity.apn.value | Property.apn | TEXT |
| identity.leadSource | Opportunity.leadSource | SELECT |
| disposition.sellerMotivation | Opportunity.motivation | MULTI_SELECT |
| disposition.askingPrice.value | Opportunity.askingPrice | CURRENCY |
| disposition.timelineToSell | Note (append) | RICH_TEXT markdown |
| disposition.propertyConditionNotes | PropertyInspection.findingsSummary | RICH_TEXT |
| disposition.callOutcome | CallTranscript.callOutcome | SELECT |
| disposition.dealTypeHint | Opportunity.dealType | MULTI_SELECT |
| disposition.followUpCommitment | Task title + Note | TEXT |
| transcript body | CallTranscript.transcriptBody | RICH_TEXT |
| full extraction | CallTranscript.extractedData | RAW_JSON |

## Site Memo → Twenty

| Extraction | Target | Type |
|---|---|---|
| identity.propertyAddress | Property.propertyAddress | ADDRESS |
| identity.apn.value | Property.apn | TEXT |
| identity.propertyClass | Property.propertyClass | SELECT |
| siteFindings.inspectionType | PropertyInspection.inspectionType | SELECT |
| siteFindings.conditionRating | PropertyInspection.conditionRating | SELECT |
| siteFindings.findingsSummary | PropertyInspection.findingsSummary | RICH_TEXT |
| siteFindings.estimatedValue.value | Opportunity.askingPrice or offerPrice | CURRENCY |
| siteFindings.offerIntent=true | Opportunity.dealStage | SELECT → `OFFER_OUT` |
| siteFindings.compsMentioned[] | ComparableSale records | CURRENCY + DATE |

## Write order

1. Upsert Property (address/APN key)
2. Upsert Opportunity (link propertyId)
3. Upsert Person (if seller identified)
4. Create/update CallTranscript or PropertyInspection
5. PATCH Opportunity fields (dealStage, financials)
6. Create Tasks for followUpCommitment

All writes use `?upsert=true` where ids are deterministic from `externalCallId` / `externalMemoId` (= captureId).
