# Shared Extraction Guidelines (RE Acquisition)

- Every field is nullable unless explicitly required by schema.
- High-stakes fields (price, APN, dates) MUST use `{value, quote}` — drop value if quote is missing.
- Never invent data not spoken or clearly implied in the transcript.
- Property address state is TEXT inside ADDRESS composite (2-letter preferred).
- Currency values are USD unless explicitly stated otherwise.
- Match existing Property by normalized address; create Opportunity if none linked.
