import type { ScannerSimulationResult } from "@workspace/mapazapp-core";

/** Short trader-facing line for the mock scanner page (Spanish product copy lives in page strings if needed). */
export function scannerSimulationSimpleHeadline(result: ScannerSimulationResult): string {
  if (!result.ok || result.status === "failed") {
    return "Simulation failed (mock data only).";
  }
  if (result.status === "no_candidates") {
    return "Simulation found no candidates.";
  }
  if (!result.accountGuardResult.allowTradeReview) {
    return "Simulation blocked by account guard (mock).";
  }
  if (!result.registryCompatibility.allowTradeReview) {
    return "Simulation blocked by strategy registry / parameter set (mock).";
  }
  if (result.candidates.some((c) => c.tradeReviewEvaluation.plan.status === "TRADE_READY")) {
    return "Simulation found a possible review zone.";
  }
  return "Simulation completed — manual review only.";
}

export function scannerSimulationTopDiagnostics(result: ScannerSimulationResult, limit = 6): string[] {
  const lines = result.diagnostics.map((d) => `[${d.level}] ${d.code}: ${d.message}`);
  return lines.slice(0, limit);
}
