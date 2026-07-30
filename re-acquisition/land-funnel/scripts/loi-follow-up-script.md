# LOI Follow-Up Script

Use for deals sitting at `dealStage = OFFER_OUT` with no response. Follow the cadence in
[../04-offer-at-scale-playbook.md](../04-offer-at-scale-playbook.md): day 3, day 10, day
21.

## Day 3 follow-up (call or text)

> "Hi [Owner Name], this is [Rep Name] — I sent an offer over on your property at
> [address] a couple days ago. Just wanted to make sure it came through okay. Did you
> have a chance to look at it?"

If no answer, text:

> "Hi [Owner Name], this is [Rep Name] following up on the offer I sent for [address].
> No rush — just wanted to check it landed okay. Happy to answer any questions."

## Day 10 follow-up (small concession if it's a strong-fit parcel)

> "Hey [Owner Name], following up again on [address]. I know the number I sent might not
> have been what you were hoping for — is there a price that would make this work for
> you? I have a little room to move if it gets us to a deal."

Only offer more if the parcel clears growth-signal filters in
[../03-lead-sourcing-criteria.md](../03-lead-sourcing-criteria.md) — for a clearly
low-upside parcel, hold the line.

## Day 21 — mark dead, keep the door open

> "Hi [Owner Name], I don't want to keep bothering you — I'll go ahead and close this out
> on my end for now. If your plans ever change, feel free to reach out, and I'll check
> back in down the road."

## Logging

- Log every attempt (call/text/email, date, outcome) as an Activity/Note on the
  Opportunity.
- If no response by day 21: `dealStage = DEAD`. Do not delete the record — county lists
  get re-pulled periodically, and motivation changes.
