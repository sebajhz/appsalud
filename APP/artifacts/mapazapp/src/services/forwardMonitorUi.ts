import type { ForwardMonitorCandidateState, ForwardMonitorStatus } from "@workspace/mapazapp-core";

export function forwardMonitorStatusSimpleLabel(status: ForwardMonitorStatus): string {
  switch (status) {
    case "idle":
      return "Idle — no snapshot evaluated yet.";
    case "monitoring":
      return "Monitoring — candidates need attention (review only).";
    case "completed_snapshot":
      return "Snapshot complete — review states summarized.";
    case "completed_with_warnings":
      return "Snapshot complete with warnings — check diagnostics.";
    case "blocked_by_account_guard":
      return "Blocked — account guard does not allow trade review.";
    case "blocked_by_registry":
      return "Blocked — parameter set / registry gate for trade review.";
    case "no_candidates":
      return "No review candidates in this snapshot.";
    case "failed":
      return "Evaluation failed — see diagnostics.";
    default:
      return String(status);
  }
}

/** Short “what to do now” line for the simple view. */
export function forwardMonitorCandidateNextStep(c: ForwardMonitorCandidateState): string {
  switch (c.currentAction) {
    case "review_manually":
      return "Manual review only — not live trading advice; no execution in this version.";
    case "blocked":
      return "Blocked for trade-ready review — read summary and reason codes.";
    case "ignore":
      return "No action — zone expired, invalidated, or consumed in this snapshot.";
    case "wait":
    default:
      return "Wait or observe — no trade-ready review gate passed yet.";
  }
}
