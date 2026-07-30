# Contract templates

HTML templates for [Gotenberg](https://gotenberg.dev) PDF rendering. n8n replaces `{{placeholder}}` tokens with Opportunity + Property + Person data before POSTing to Gotenberg.

## Files

| Template | `contractType` | Use case |
|----------|----------------|----------|
| `loi.html` | `LOI` | Non-binding offer before PSA |
| `purchase-sale-agreement.html` | `PSA` | Flip, land, commercial, industrial acquisitions |
| `assignment-contract.html` | `ASSIGNMENT` | Wholesale disposition / assignment to end buyer |

## Placeholder reference

| Placeholder | Twenty source |
|-------------|---------------|
| `{{propertyAddress}}` | `opportunity.propertyAddress` or `property.propertyAddress` |
| `{{apn}}` | `property.apn` |
| `{{county}}` | `property.county` |
| `{{legalDescription}}` | `property.legalDescription` |
| `{{sellerName}}` | `person.name` (point of contact) |
| `{{buyerEntityName}}` | Workspace company name or configured acquirer entity |
| `{{assigneeName}}` | `person.name` on `buyerAssigned` relation (assignment only) |
| `{{offerPrice}}` | `opportunity.offerPrice` |
| `{{contractPrice}}` | `opportunity.contractPrice` |
| `{{earnestMoney}}` | `opportunity.earnestMoney` |
| `{{assignmentFee}}` | `opportunity.assignmentFee` |
| `{{offerDate}}` | `opportunity.offerDate` |
| `{{contractDate}}` | `opportunity.contractDate` or today |
| `{{ddDeadline}}` | `opportunity.dueDiligenceDeadline` |
| `{{closingDate}}` | `opportunity.closingDate` |

## Gotenberg render

```bash
curl --request POST http://localhost:3002/forms/chromium/convert/html \
  --form files=@rendered.html \
  -o contract.pdf
```

## Carbone alternative

For staff-editable DOCX templates, duplicate these layouts in LibreOffice with `{d.propertyAddress}` Carbone markers and point n8n at a self-hosted Carbone instance instead of Gotenberg. See `contract-generation-flow.md`.
