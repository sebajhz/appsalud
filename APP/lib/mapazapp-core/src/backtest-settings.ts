import type { BacktestMetricThresholds } from "./backtest-types";

/** Non-production defaults for Vitest and local dashboard copy only. */
export function createDefaultBacktestMetricThresholdsForTests(): BacktestMetricThresholds {
  return {
    minTrades: 30,
    minProfitFactor: 1.15,
    minExpectancyR: 0.04,
    maxDrawdownR: 22,
    maxLosingStreak: 9,
    minWinRate: undefined,
    requireValidationSplit: true,
    requireForwardSplit: true,
  };
}
