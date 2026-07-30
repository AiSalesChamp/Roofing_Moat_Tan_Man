# Seller Cold Call Script

Use at `dealStage = QUALIFYING`, after a lead has been pulled from a list. Goal: confirm
ownership, gauge motivation, and get enough info to send an offer — not to negotiate
price on this call.

## Opening

> "Hi, is this [Owner Name]? My name is [Rep Name], I'm a local land buyer here in
> Texas. I came across your property at [address/parcel description] and wanted to see
> if you'd ever consider selling it — no pressure at all, just reaching out."

If they ask how you got their info:

> "It's public county record — I reach out to landowners in the area directly rather than
> going through an agent."

## Qualify ownership

> "Just to confirm, are you still the owner of that parcel?"

## Qualify motivation (listen more than you talk)

> "What's your plan for the land right now — are you using it, or is it just sitting?"
> "Have you ever thought about selling it, or is this the first time someone's asked?"
> "Is there anything driving a timeline for you — taxes, a move, anything like that?"

## Set expectations

> "Here's how I work: I'll take a quick look at the property, and if the numbers make
> sense I'll send you a straightforward offer — no obligation, and if it's not right for
> you, no hard feelings. I close fast and pay cash, but I'm also upfront that my offer
> will be below what you'd get listing it with an agent and waiting for a retail buyer —
> that's the trade-off for speed and certainty."

## Close the call

> "I'll get an offer over to you in the next couple of days. What's the best way to reach
> you — text, email, or call?"

## Logging

- Update `personMotivationNotes` with anything said about timeline/motivation.
- Move `dealStage` to `OFFER_OUT` once the offer is generated — see
  [../04-offer-at-scale-playbook.md](../04-offer-at-scale-playbook.md).
