/**
 * Conservative copy helpers for V2 engine evidence surfaces — no profitability or approval claims.
 */

export type EvidenceTone = "neutral" | "caution" | "negative" | "soft_positive";

const RECOMMENDATION_LABELS: Record<string, string> = {
  candidate_for_more_testing: "Candidate for more testing",
  promising_but_unproven: "Promising but unproven",
  needs_more_data: "Needs more data",
  unstable: "Unstable across splits or symbols",
  rejected: "Rejected for now",
  not_rankable: "Not rankable from this evidence",
  overfit_risk: "Overfit risk",
};

/** Human-readable label for campaign / grid / walk-forward recommendation keys. */
export function evidenceRecommendationLabel(key: string): string {
  return RECOMMENDATION_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Tone for styling badges — does not imply approval. */
export function evidenceRecommendationTone(key: string): EvidenceTone {
  if (key === "rejected" || key === "not_rankable") return "negative";
  if (key === "overfit_risk" || key === "unstable" || key === "needs_more_data") return "caution";
  if (key === "candidate_for_more_testing") return "soft_positive";
  return "neutral";
}

export function walkForwardRiskLabel(level: string): string {
  const m: Record<string, string> = {
    low: "Overfit risk: low (mock heuristics only)",
    medium: "Overfit risk: medium — review train vs validation vs forward",
    high: "Overfit risk: high — weak evidence until splits improve",
    unknown: "Overfit risk: unknown — split coverage unclear",
  };
  return m[level] ?? `Overfit risk: ${level}`;
}

/** Short paragraph for parameter grid mock summaries. */
export function parameterGridRecommendationCopy(status: string, topRecommendation?: string): string {
  const top = topRecommendation ? evidenceRecommendationLabel(topRecommendation) : "—";
  return `Grid run status: ${status.replace(/_/g, " ")}. Leading candidate (mock ranking): ${top}. Comparative evidence only — not profitability proof.`;
}

/** Fixed disclaimers for evidence panels (English for UI consistency). */
export const EVIDENCE_PANEL_DISCLAIMERS = {
  evidenceOnly: "Evidence only — manual review required.",
  noApproval: "No approval — mock and advisory layers do not promote parameter sets.",
  noExecution: "No execution — read-only mock stack.",
} as const;
