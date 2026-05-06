import type { BacktestEvidenceStatus } from "@workspace/mapazapp-core";

/** Plain-language lines for the dashboard (mock/advisory only). */
export function backtestEvidenceSimpleLines(status: BacktestEvidenceStatus): string[] {
  const lines: string[] = [];
  switch (status) {
    case "no_evidence":
    case "insufficient_evidence":
      lines.push("Evidence is incomplete.");
      break;
    case "needs_more_forward":
      lines.push("Validation passed but a forward test is missing for the configured trade-review gate.");
      break;
    case "candidate_for_alerts":
    case "candidate_for_demo":
    case "candidate_for_trade_review":
      lines.push("This parameter set is only a candidate recommendation — not registry-approved.");
      break;
    default:
      lines.push("Manual review is required before any registry update.");
  }
  lines.push("Manual review required — canAutoApply is false by design.");
  return lines;
}

export function backtestEvidenceStatusHeadline(status: BacktestEvidenceStatus): string {
  return `Evidence: ${status}`;
}
