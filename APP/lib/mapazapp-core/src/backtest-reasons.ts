import type { BacktestApprovalReasonCode } from "./backtest-types";

const MESSAGES: Record<BacktestApprovalReasonCode, string> = {
  BACKTEST_TOO_FEW_TRADES: "Too few trades for a stable backtest read.",
  BACKTEST_PROFIT_FACTOR_LOW: "Profit factor is below the configured minimum.",
  BACKTEST_EXPECTANCY_LOW: "Expectancy (R) is below the configured minimum.",
  BACKTEST_DRAWDOWN_TOO_HIGH: "Maximum drawdown (R) exceeds the allowed ceiling.",
  BACKTEST_LOSING_STREAK_TOO_HIGH: "Maximum losing streak exceeds the allowed ceiling.",
  BACKTEST_WIN_RATE_LOW: "Win rate is below the optional minimum.",
  BACKTEST_VALIDATION_REQUIRED: "A validation (or better) dataset split is required for this tier.",
  BACKTEST_FORWARD_REQUIRED: "A forward (or full) dataset split is required for trade-review tier.",
  BACKTEST_SYMBOL_MISMATCH: "Imported symbol does not match registry / expected symbol context.",
  BACKTEST_PARAMETER_SET_MISMATCH: "Imported parameter set id does not match registry context.",
  BACKTEST_APPROVED_FOR_DEMO: "Metrics meet demo-tier advisory thresholds (dev defaults only).",
  BACKTEST_APPROVED_FOR_ALERTS: "Metrics meet alerts-tier advisory thresholds (dev defaults only).",
  BACKTEST_APPROVED_FOR_TRADE_REVIEW: "Metrics meet trade-review-tier advisory thresholds (dev defaults only).",
};

export function backtestApprovalReasonMessage(code: BacktestApprovalReasonCode): string {
  return MESSAGES[code] ?? code;
}
