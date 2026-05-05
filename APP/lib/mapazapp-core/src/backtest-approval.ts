import { calculateBacktestSummary } from "./backtest-metrics";
import { backtestApprovalReasonMessage } from "./backtest-reasons";
import type {
  BacktestApprovalReasonCode,
  BacktestApprovalResult,
  BacktestApprovalStatus,
  BacktestApprovedFor,
  BacktestDatasetSplit,
  BacktestMetricThresholds,
  EvaluateBacktestApprovalInput,
} from "./backtest-types";
import type { ParameterSetStatus } from "./strategy-registry-types";

function splitAllowsValidationTier(split: BacktestDatasetSplit): boolean {
  return split === "validation" || split === "forward" || split === "full";
}

function splitAllowsForwardTier(split: BacktestDatasetSplit): boolean {
  return split === "forward" || split === "full";
}

function pushUnique(arr: BacktestApprovalReasonCode[], code: BacktestApprovalReasonCode): void {
  if (!arr.includes(code)) arr.push(code);
}

function buildSummaryText(blocking: BacktestApprovalReasonCode[], warnings: BacktestApprovalReasonCode[]): string {
  const parts: string[] = [];
  for (const b of blocking) parts.push(backtestApprovalReasonMessage(b));
  for (const w of warnings) {
    if (w.startsWith("BACKTEST_APPROVED_")) parts.push(backtestApprovalReasonMessage(w));
  }
  return parts.length > 0 ? parts.join(" ") : "Advisory backtest evaluation complete (dev thresholds only).";
}

/**
 * Pure advisory evaluation — does **not** mutate the strategy registry.
 * Metrics are recomputed from `run.trades` for consistency with imported rows.
 */
export function evaluateBacktestApproval(input: EvaluateBacktestApprovalInput): BacktestApprovalResult {
  const { run, thresholds: t, registryCompatibility: reg } = input;
  const metricSnapshot = calculateBacktestSummary(run.trades);
  const blocking: BacktestApprovalReasonCode[] = [];
  const warnings: BacktestApprovalReasonCode[] = [];

  if (reg?.parameterSet) {
    if (reg.parameterSet.parameterSetId !== run.parameterSetId) {
      pushUnique(blocking, "BACKTEST_PARAMETER_SET_MISMATCH");
    }
    if (reg.parameterSet.canonicalSymbol !== run.canonicalSymbol) {
      pushUnique(blocking, "BACKTEST_SYMBOL_MISMATCH");
    }
  }

  if (metricSnapshot.tradeCount === 0) {
    pushUnique(blocking, "BACKTEST_TOO_FEW_TRADES");
    return {
      status: "insufficient_data",
      approvedFor: "none",
      blockingReasons: blocking,
      warningReasons: warnings,
      summary: buildSummaryText(blocking, warnings),
      metricSnapshot,
    };
  }

  if (metricSnapshot.tradeCount < t.minTrades) {
    pushUnique(blocking, "BACKTEST_TOO_FEW_TRADES");
    return {
      status: "insufficient_data",
      approvedFor: "none",
      blockingReasons: blocking,
      warningReasons: warnings,
      summary: buildSummaryText(blocking, warnings),
      metricSnapshot,
    };
  }

  const numericBlocking: BacktestApprovalReasonCode[] = [];
  const pfOk = metricSnapshot.profitFactor === Number.POSITIVE_INFINITY || metricSnapshot.profitFactor >= t.minProfitFactor;
  if (!pfOk) pushUnique(numericBlocking, "BACKTEST_PROFIT_FACTOR_LOW");
  if (metricSnapshot.expectancyR < t.minExpectancyR) pushUnique(numericBlocking, "BACKTEST_EXPECTANCY_LOW");
  if (metricSnapshot.maxDrawdownR > t.maxDrawdownR) pushUnique(numericBlocking, "BACKTEST_DRAWDOWN_TOO_HIGH");
  if (metricSnapshot.maxLosingStreak > t.maxLosingStreak) pushUnique(numericBlocking, "BACKTEST_LOSING_STREAK_TOO_HIGH");
  if (t.minWinRate !== undefined && metricSnapshot.winRate < t.minWinRate) {
    pushUnique(numericBlocking, "BACKTEST_WIN_RATE_LOW");
  }

  const allStructural = [...blocking, ...numericBlocking];
  if (allStructural.length > 0) {
    return {
      status: "rejected",
      approvedFor: "none",
      blockingReasons: allStructural,
      warningReasons: warnings,
      summary: buildSummaryText(allStructural, warnings),
      metricSnapshot,
    };
  }

  pushUnique(warnings, "BACKTEST_APPROVED_FOR_DEMO");
  let approvedFor: BacktestApprovedFor = "demo";
  let status: BacktestApprovalStatus = "approved_for_demo";

  const validationOk = !t.requireValidationSplit || splitAllowsValidationTier(run.datasetSplit);
  if (!validationOk) {
    pushUnique(blocking, "BACKTEST_VALIDATION_REQUIRED");
    return {
      status: "approved_for_demo",
      approvedFor: "demo",
      blockingReasons: blocking,
      warningReasons: warnings,
      summary: buildSummaryText(blocking, warnings),
      metricSnapshot,
    };
  }

  pushUnique(warnings, "BACKTEST_APPROVED_FOR_ALERTS");
  approvedFor = "alerts";
  status = "approved_for_alerts";

  const forwardRequired = t.requireForwardSplit === true;
  const forwardOk = !forwardRequired || splitAllowsForwardTier(run.datasetSplit);
  if (!forwardOk) {
    pushUnique(blocking, "BACKTEST_FORWARD_REQUIRED");
    return {
      status: "needs_review",
      approvedFor: "alerts",
      blockingReasons: blocking,
      warningReasons: warnings,
      summary: buildSummaryText(blocking, warnings),
      metricSnapshot,
    };
  }

  pushUnique(warnings, "BACKTEST_APPROVED_FOR_TRADE_REVIEW");
  approvedFor = "trade_review";
  status = "approved_for_trade_review";

  return {
    status,
    approvedFor,
    blockingReasons: [],
    warningReasons: warnings,
    summary: buildSummaryText([], warnings),
    metricSnapshot,
  };
}

/**
 * Maps an advisory approval outcome to a **recommended** registry status.
 * Callers must apply this explicitly — never auto-write the registry from a single import.
 */
export function deriveRecommendedParameterSetStatusFromBacktest(
  approval: BacktestApprovalResult,
): ParameterSetStatus | "unchanged" {
  switch (approval.approvedFor) {
    case "trade_review":
      return "approved_for_trade_review";
    case "alerts":
      return "approved_for_alerts";
    case "demo":
      return "approved_for_demo";
    default:
      if (approval.status === "rejected") return "rejected";
      if (approval.status === "insufficient_data") return "tested_train";
      return "unchanged";
  }
}
