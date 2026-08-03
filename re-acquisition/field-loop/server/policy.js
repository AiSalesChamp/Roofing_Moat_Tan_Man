// Autonomy ratchet policy.
//
// Every field path carries a risk class. Autonomy (auto-commit without human
// confirm) is EARNED per field from the eval log — never assumed:
//
//   low risk:  notes, summaries, outcomes    → eligible at ≥95% over ≥20 graded samples
//   high risk: financials, identity, stage   → eligible at ≥98% over ≥50 samples
//                                              AND an explicit manual override
//
// A draft auto-commits only when EVERY populated field is currently eligible.
// One ineligible field holds the whole draft for human review — partial
// automatic writes would make the CRM state impossible to reason about.

import { flattenExtraction, isEmptyValue } from './fields.js';

// Prefix rules, first match wins. Everything not matched is low risk.
const HIGH_RISK_PREFIXES = [
  'identity.apn',
  'identity.propertyAddress',
  'identity.sellerFullName',
  'identity.leadPhoneE164',
  'identity.sellerEmail',
  'disposition.askingPrice',
  'disposition.dealTypeHint',
  'siteFindings.estimatedValue',
  'siteFindings.offerIntent', // flips dealStage → OFFER_OUT
  'siteFindings.compsMentioned',
];

export const THRESHOLDS = {
  low: { minSamples: 20, minAccuracy: 0.95, requiresManualEnable: false },
  high: { minSamples: 50, minAccuracy: 0.98, requiresManualEnable: true },
};

export const riskClassForPath = (path) =>
  HIGH_RISK_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`)) ? 'high' : 'low';

// Aggregate graded eval events into per-path stats.
// events: [{fields: [{path, status}]}] — confirmed counts as correct; corrected,
// added, removed count as misses (added = model failed to extract).
export function computeFieldStats(events) {
  const stats = new Map();
  for (const event of events) {
    for (const field of event.fields || []) {
      if (!stats.has(field.path)) stats.set(field.path, { samples: 0, correct: 0 });
      const s = stats.get(field.path);
      s.samples += 1;
      if (field.status === 'confirmed') s.correct += 1;
    }
  }
  const result = {};
  for (const [path, s] of stats) {
    result[path] = {
      samples: s.samples,
      correct: s.correct,
      accuracy: s.samples ? s.correct / s.samples : 0,
    };
  }
  return result;
}

// Is a single field path eligible for auto-commit given current stats?
export function fieldEligibility(path, stats, overrides = {}) {
  const riskClass = riskClassForPath(path);
  const threshold = THRESHOLDS[riskClass];
  const fieldStats = stats[path] || { samples: 0, correct: 0, accuracy: 0 };
  const meetsData =
    fieldStats.samples >= threshold.minSamples && fieldStats.accuracy >= threshold.minAccuracy;
  const manualOk = !threshold.requiresManualEnable || overrides[path] === true;
  return {
    path,
    riskClass,
    samples: fieldStats.samples,
    accuracy: fieldStats.accuracy,
    threshold: { minSamples: threshold.minSamples, minAccuracy: threshold.minAccuracy },
    requiresManualEnable: threshold.requiresManualEnable,
    manuallyEnabled: overrides[path] === true,
    eligible: meetsData && manualOk,
  };
}

// Decide what happens to a fresh draft.
// Returns { decision: 'auto_commit'|'pending', fields: [eligibility...] }.
export function decideDraft(extraction, stats, overrides = {}, { autonomyEnabled = true } = {}) {
  const populated = flattenExtraction(extraction).filter((leaf) => !isEmptyValue(leaf.value));
  const fields = populated.map((leaf) => fieldEligibility(leaf.path, stats, overrides));
  const allEligible = fields.length > 0 && fields.every((f) => f.eligible);
  return {
    decision: autonomyEnabled && allEligible ? 'auto_commit' : 'pending',
    autonomyEnabled,
    fields,
  };
}
