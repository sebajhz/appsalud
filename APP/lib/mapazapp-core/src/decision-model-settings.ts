/**
 * V2-05 — tunable weights and gate policy for `evaluateDecisionModel`.
 * Weights are normalized to sum 1 inside the evaluator if they drift.
 */

export interface DecisionModelSettings {
  /** When true, missing `candidateTiming.sourceKind === "missing"` blocks hard gates. */
  strictCandidateTiming: boolean;
  /** When true, `POSSIBLE_BREAK_RISK` forces `invalid_variant` after soft score (v1 policy). */
  breakRiskInvalidatesVariant: boolean;
  /** Neutral 0–100 score used when `contextQualityScore` is omitted (explicit skeleton). */
  contextPlaceholderScore: number;
  weights: {
    sweepQuality: number;
    displacementQuality: number;
    ifvgQuality: number;
    zoneQuality: number;
    retestQuality: number;
    confirmationQuality: number;
    entrySlTpQuality: number;
    timingQuality: number;
    contextQuality: number;
    spreadVolatilityQuality: number;
  };
}

export function createDefaultDecisionModelSettingsForTests(): DecisionModelSettings {
  return {
    strictCandidateTiming: false,
    breakRiskInvalidatesVariant: false,
    contextPlaceholderScore: 72,
    weights: {
      sweepQuality: 0.14,
      displacementQuality: 0.14,
      ifvgQuality: 0.12,
      zoneQuality: 0.08,
      retestQuality: 0.1,
      confirmationQuality: 0.14,
      entrySlTpQuality: 0.14,
      timingQuality: 0.08,
      contextQuality: 0.04,
      spreadVolatilityQuality: 0.06,
    },
  };
}
