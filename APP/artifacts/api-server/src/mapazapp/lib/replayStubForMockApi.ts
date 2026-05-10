import type { IfvgReplayBacktestResult } from "@workspace/mapazapp-core";

/** Deterministic replay completion stub for mock API paths — not broker truth. */
export function replayStubForMockApi(partial?: Partial<IfvgReplayBacktestResult>): IfvgReplayBacktestResult {
  return {
    status: "completed",
    summary: {
      candidateCount: 10,
      replayAttemptedCount: 8,
      replayedTradeCount: 8,
      wins: 5,
      losses: 3,
      expiredCount: 0,
      missedCount: 0,
      invalidatedCount: 0,
      ambiguousCount: 0,
      notTriggeredCount: 0,
      totalR: 4.2,
      averageR: 0.52,
      winRate: 0.625531914893617,
      profitFactor: 1.8,
      maxDrawdownR: 2.1,
      averageMaeR: 0.4,
      averageMfeR: 0.9,
      bestTradeR: 2.2,
      worstTradeR: -1,
    },
    trades: [],
    traces: [],
    diagnostics: [],
    warnings: [],
    detection: null,
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
    ...partial,
  };
}
