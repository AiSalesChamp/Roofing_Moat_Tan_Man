// Thin client: submit an extraction to the field-loop draft store instead of
// writing straight to Twenty. The human confirms (or the autonomy policy
// auto-commits) from the review surfaces.

export async function submitDraft(
  { kind, sourceId, transcript, extraction, meta },
  {
    fieldLoopUrl = process.env.FIELD_LOOP_URL || 'http://127.0.0.1:4680',
    secret = process.env.FIELD_LOOP_SECRET,
  } = {},
) {
  const res = await fetch(`${fieldLoopUrl.replace(/\/$/, '')}/api/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Field-Loop-Secret': secret } : {}),
    },
    body: JSON.stringify({ kind, sourceId, transcript, extraction, meta }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`field-loop returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(json.error || `field-loop ${res.status}`);
  return json;
}
