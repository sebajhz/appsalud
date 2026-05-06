import type { BacktestEvidenceThresholds } from "./backtest-evidence-types";

/** Non-production defaults for Vitest and dashboard mock copy only. */
export function createDefaultBacktestEvidenceThresholdsForTests(): BacktestEvidenceThresholds {
  return {
    requireTrain: false,
    requireValidation: true,
    requireForwardForTradeReview: false,
    minRunsPerSplit: 1,
    minTradesPerSplit: 30,
    minTotalTrades: 30,
    minProfitFactor: 1.15,
    minExpectancyR: 0.04,
    maxDrawdownR: 22,
    maxLosingStreak: 9,
    minWinRate: undefined,
    /** Omit in dashboard mocks unless a scenario explicitly tests variance gates. */
    maxMetricVariance: undefined,
    requireSameSymbol: true,
    requireSameParameterSet: true,
    requireSameStrategyId: true,
    bestRunCriteria: "profitFactor",
  };
}
