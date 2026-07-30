# Buyer List Outreach Script

Use when a deal enters `dealStage = DISPOSITION` in the Wholesale Lane — see
[../05-wholesale-disposition-playbook.md](../05-wholesale-disposition-playbook.md). Goal:
convert to an assignment as fast as possible.

## Top-buyer call (fastest-closing buyers first)

> "Hey [Buyer Name], I've got a new one for you — [acreage]-acre parcel in [county],
> under contract at [price], I'm looking to assign for [assignment fee]. [1–2 sentence
> highlight: road frontage, power proximity, growth area, whatever's the strongest
> selling point]. Want me to send the packet over?"

## Buyers list blast (email/text, after top-buyer calls)

> Subject: New wholesale deal — [county], [acreage] acres, assignable now
>
> [Buyer first name],
>
> New deal just went under contract:
>
> - Location: [county/area, general description — not full address until NDA/proof of
>   funds]
> - Acreage: [acreage]
> - Contract price: [price] ([price per acre])
> - Assignment fee: [fee]
> - Highlights: [growth signals, road frontage, power/utility proximity, zoning]
>
> First one to commit with proof of funds gets it. Reply and I'll send the full packet.
>
> [Rep Name]

## Handling multiple interested buyers

> "Appreciate the quick response — I've got another buyer looking at this too, so
> whoever gets me proof of funds and a signed assignment agreement first gets the deal.
> Want me to send that over now?"

## Confirming the assignment

> "Great, I'll get the assignment agreement over to you today. Once that's signed and
> earnest money is in, we'll set a closing date with the title company."

## Logging

- Update `dispositionStatus`: `MARKETING` → `UNDER_CONTRACT` (buyer's assignment
  agreement signed) → `ASSIGNED` (closed).
- Log the final `assignmentFee` on the Opportunity.
- On close: `dealStage = EXIT_CLOSED`. Check
  [../07-capital-reinvestment-loop.md](../07-capital-reinvestment-loop.md) — does this
  fee push the reinvestment pool over the threshold for a Hold Lane acquisition?
