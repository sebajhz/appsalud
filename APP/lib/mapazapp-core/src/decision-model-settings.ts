/**
 * V2-05 — tunable weights and gate policy for `evaluateDecisionModel`.
 * Weights are normalized to sum 1 inside the evaluator if they drift.
 */

import type { ToleranceDimension } from "./tolerance-calibration-types";

export interface DecisionModelToleranceIntegration {
  /** When true, blends tolerance dimension scores into selected soft-score components. */
  blendToleranceIntoSoftScore: boolean;
  /** When true, critical invalid tolerance dimensions force `invalid_variant` after gates. */
  invalidToleranceInvalidatesVariant: boolean;
  /** When true, any critical invalid tolerance dimension also fails hard gates (audit / strict policy). */
  invalidToleranceAsHardBlock: boolean;
  /** Dimensions whose `invalid` classification triggers the policies above. */
  criticalInvalidDimensions: ToleranceDimension[];
}

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
  /** V2-06 — optional; when omitted, tolerance overlay is disabled even if a calibration result is supplied. */
  toleranceIntegration?: DecisionModelToleranceIntegration | null;
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
    toleranceIntegration: undefined,
  };
}
