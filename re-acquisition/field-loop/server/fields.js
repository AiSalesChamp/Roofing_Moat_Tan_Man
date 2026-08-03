// Field flattening + grading for extraction drafts.
//
// A draft is graded per-field when a human resolves it: the original
// extraction is compared to the final (possibly edited) extraction, and each
// field gets a status. These statuses are the eval log that drives the
// autonomy ratchet (policy.js).
//
// Path grammar: dot-joined JSON path, e.g. `disposition.askingPrice.value`.
// Evidence wrappers `{value, quote}` grade on `.value`; the quote rides along
// for display only.

const SKIP_TOP_LEVEL = new Set(['documentMeta', 'extractionMeta']);

const isEvidenceWrapper = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.prototype.hasOwnProperty.call(value, 'value') &&
  Object.keys(value).every((k) => k === 'value' || k === 'quote');

export const isEmptyValue = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

// Flatten an extraction into [{path, value, quote?}] leaves. Objects recurse,
// arrays are leaves (graded as order-insensitive sets), evidence wrappers
// become `<path>.value` leaves.
export function flattenExtraction(extraction) {
  const leaves = [];
  const walk = (node, path) => {
    if (node === null || node === undefined) {
      if (path.length) leaves.push({ path: path.join('.'), value: null });
      return;
    }
    if (Array.isArray(node) || typeof node !== 'object') {
      leaves.push({ path: path.join('.'), value: node });
      return;
    }
    if (isEvidenceWrapper(node)) {
      leaves.push({
        path: [...path, 'value'].join('.'),
        value: node.value ?? null,
        ...(node.quote ? { quote: node.quote } : {}),
      });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (path.length === 0 && SKIP_TOP_LEVEL.has(key)) continue;
      walk(child, [...path, key]);
    }
  };
  walk(extraction ?? {}, []);
  return leaves;
}

const normalizeForCompare = (value) => {
  if (isEmptyValue(value)) return null;
  if (Array.isArray(value)) {
    return JSON.stringify(
      [...value]
        .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v).trim().toLowerCase()))
        .sort(),
    );
  }
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const valuesEqual = (a, b) => normalizeForCompare(a) === normalizeForCompare(b);

// Grade original vs final extraction. Returns [{path, original, final, status}]
// for every path populated in at least one side.
// Statuses: confirmed (model right), corrected (wrong value),
// added (model missed it), removed (model hallucinated it).
export function gradeExtractions(original, final) {
  const originalLeaves = new Map(flattenExtraction(original).map((l) => [l.path, l.value]));
  const finalLeaves = new Map(flattenExtraction(final).map((l) => [l.path, l.value]));
  const paths = new Set([...originalLeaves.keys(), ...finalLeaves.keys()]);
  const graded = [];
  for (const path of [...paths].sort()) {
    const orig = originalLeaves.get(path) ?? null;
    const fin = finalLeaves.get(path) ?? null;
    const origEmpty = isEmptyValue(orig);
    const finEmpty = isEmptyValue(fin);
    if (origEmpty && finEmpty) continue;
    let status;
    if (origEmpty) status = 'added';
    else if (finEmpty) status = 'removed';
    else status = valuesEqual(orig, fin) ? 'confirmed' : 'corrected';
    graded.push({ path, original: orig, final: fin, status });
  }
  return graded;
}

// Human-readable labels for review surfaces (PWA card, glasses card).
const FIELD_LABELS = {
  'identity.sellerFullName.firstName': 'Seller first name',
  'identity.sellerFullName.lastName': 'Seller last name',
  'identity.sellerEmail': 'Seller email',
  'identity.leadPhoneE164': 'Seller phone',
  'identity.propertyAddress.street1': 'Street',
  'identity.propertyAddress.city': 'City',
  'identity.propertyAddress.state': 'State',
  'identity.propertyAddress.zip': 'ZIP',
  'identity.apn.value': 'APN',
  'identity.leadSource': 'Lead source',
  'identity.propertyClass': 'Property class',
  'disposition.callOutcome': 'Call outcome',
  'disposition.sellerMotivation': 'Motivation',
  'disposition.askingPrice.value': 'Asking price',
  'disposition.timelineToSell': 'Timeline',
  'disposition.propertyConditionNotes': 'Condition notes',
  'disposition.objections': 'Objections',
  'disposition.followUpCommitment': 'Follow-up',
  'disposition.dealTypeHint': 'Deal type',
  'siteFindings.inspectionType': 'Inspection type',
  'siteFindings.conditionRating': 'Condition rating',
  'siteFindings.accessNotes': 'Access notes',
  'siteFindings.occupancyObserved': 'Occupancy',
  'siteFindings.zoningNotes': 'Zoning',
  'siteFindings.environmentalRedFlags': 'Env. red flags',
  'siteFindings.compsMentioned': 'Comps',
  'siteFindings.estimatedValue.value': 'Estimated value',
  'siteFindings.offerIntent': 'Offer intent',
  'siteFindings.findingsSummary': 'Findings summary',
};

export const labelForPath = (path) => {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const tail = path.split('.').filter((p) => p !== 'value').pop() || path;
  return tail
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
};
