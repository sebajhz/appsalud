import type { AccountId, BacktestRunId, BacktestTradeId, ParameterSetId, StrategyId } from "./ids";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";

/** Runtime: ISO 8601 strings; no live clock dependency in pure functions. */
export type IsoDateTimeString = string;

export type BacktestDatasetSplit = "train" | "validation" | "forward" | "full" | "unknown";

export type BacktestSourceType =
  | "mt5_strategy_tester_csv"
  | "mapazapp_testea_csv"
  | "manual_mock"
  | "unknown";

export type BacktestTradeDirection = "BUY" | "SELL";

export interface BacktestPeriod {
  dateFrom: IsoDateTimeString;
  dateTo: IsoDateTimeString;
}

/** Aggregate metrics derived from imported trades (advisory only). */
export interface BacktestSummary {
  tradeCount: number;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  totalR: number;
  maxDrawdownR: number;
  maxLosingStreak: number;
  averageWinR: number;
  averageLossR: number;
  grossWinR: number;
  grossLossR: number;
}

export interface BacktestTrade {
  tradeId: BacktestTradeId;
  runId: BacktestRunId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: string;
  brokerSymbol?: string | undefined;
  accountId?: AccountId | undefined;
  direction: BacktestTradeDirection;
  entryTime: IsoDateTimeString;
  exitTime: IsoDateTimeString;
  entryPrice: number;
  exitPrice: number;
  sl?: number | undefined;
  tp?: number | undefined;
  resultMoney: number;
  resultR: number;
  commission?: number | undefined;
  swap?: number | undefined;
  spreadAtEntry?: number | undefined;
  scoreTotal?: number | undefined;
  zoneId?: string | undefined;
  reasonCodes?: string[] | undefined;
  exitReason?: string | undefined;
  /** TestEA E5.3+ virtual outcome when present in CSV (`outcome` column). */
  outcome?: string | undefined;
  /** TestEA E5.10+ liquidity sweep observation columns (optional for legacy CSV). */
  liquidityEventDetected?: boolean | undefined;
  liquidityEventType?: string | undefined;
  liquidityEventDirection?: string | undefined;
  liquidityEventAgeBars?: number | undefined;
  liquidityEventLevel?: number | undefined;
  liquidityEventSweepPrice?: number | undefined;
  liquidityEventDistancePoints?: number | undefined;
  liquidityEventReasons?: string | undefined;
  /** Raw `liquidity_event_score` column when present (E5.8+). */
  liquidityEventScore?: number | undefined;
  /** E5.10.2 Liquidity Sweep Quality V1 (optional; mirrors CSV columns). */
  liquiditySweepQualityScore?: number | undefined;
  liquiditySweepQualityGrade?: string | undefined;
  liquiditySweepRecencyScore?: number | undefined;
  liquiditySweepDirectionalScore?: number | undefined;
  liquiditySweepReactionScore?: number | undefined;
  liquiditySweepDisplacementScore?: number | undefined;
  liquiditySweepDistanceScore?: number | undefined;
  liquiditySweepQualityReasons?: string | undefined;
  /** E5.10.4 Causal Liquidity Chain V1 (optional; mirrors CSV columns). */
  liquidityChainDetected?: boolean | undefined;
  liquidityChainGrade?: string | undefined;
  liquidityChainScore?: number | undefined;
  liquidityChainSweepToSetupBars?: number | undefined;
  liquidityChainSweepToFvgBars?: number | undefined;
  liquidityChainReactionConfirmed?: boolean | undefined;
  liquidityChainDisplacementConfirmed?: boolean | undefined;
  liquidityChainFvgCreatedAfterSweep?: boolean | undefined;
  liquidityChainDistanceToFvgPoints?: number | undefined;
  liquidityChainReasons?: string | undefined;
  /** E5.10.6 reaction audit diagnostics (optional; older CSV). */
  liquidityChainReactionFailureReason?: string | undefined;
  liquidityChainReactionClosePrice?: number | undefined;
  liquidityChainReactionLevel?: number | undefined;
  liquidityChainReactionBarsChecked?: number | undefined;
}

export interface BacktestImportWarning {
  code: string;
  message: string;
  row?: number | undefined;
}

export interface BacktestImportError {
  code: string;
  message: string;
  row?: number | undefined;
}

export interface BacktestImportResult {
  ok: boolean;
  trades: BacktestTrade[];
  errors: BacktestImportError[];
  warnings: BacktestImportWarning[];
}

export interface BacktestRun {
  runId: BacktestRunId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: string;
  brokerSymbol?: string | undefined;
  accountId?: AccountId | undefined;
  sourceType: BacktestSourceType;
  datasetSplit: BacktestDatasetSplit;
  dateFrom: IsoDateTimeString;
  dateTo: IsoDateTimeString;
  importedAt: IsoDateTimeString;
  testerName?: string | undefined;
  buildVersion?: string | undefined;
  rawFileName?: string | undefined;
  summary: BacktestSummary;
  trades: BacktestTrade[];
  warnings: BacktestImportWarning[];
  notes?: string | undefined;
}

/** Dev/test defaults only — not production governance thresholds. */
export interface BacktestMetricThresholds {
  minTrades: number;
  minProfitFactor: number;
  minExpectancyR: number;
  maxDrawdownR: number;
  maxLosingStreak: number;
  minWinRate?: number | undefined;
  /** When true, `approved_for_trade_review` requires dataset split `validation` or `forward`. */
  requireValidationSplit: boolean;
  /** When true, trade-review tier additionally requires `forward` (or `full` treated as including forward — caller policy). */
  requireForwardSplit?: boolean | undefined;
}

export type BacktestApprovalStatus =
  | "insufficient_data"
  | "rejected"
  | "needs_review"
  | "approved_for_demo"
  | "approved_for_alerts"
  | "approved_for_trade_review";

export type BacktestApprovalReasonCode =
  | "BACKTEST_TOO_FEW_TRADES"
  | "BACKTEST_PROFIT_FACTOR_LOW"
  | "BACKTEST_EXPECTANCY_LOW"
  | "BACKTEST_DRAWDOWN_TOO_HIGH"
  | "BACKTEST_LOSING_STREAK_TOO_HIGH"
  | "BACKTEST_WIN_RATE_LOW"
  | "BACKTEST_VALIDATION_REQUIRED"
  | "BACKTEST_FORWARD_REQUIRED"
  | "BACKTEST_SYMBOL_MISMATCH"
  | "BACKTEST_PARAMETER_SET_MISMATCH"
  | "BACKTEST_APPROVED_FOR_DEMO"
  | "BACKTEST_APPROVED_FOR_ALERTS"
  | "BACKTEST_APPROVED_FOR_TRADE_REVIEW";

/** Highest advisory tier granted by this evaluation (not registry mutation). */
export type BacktestApprovedFor = "none" | "demo" | "alerts" | "trade_review";

export interface BacktestApprovalResult {
  status: BacktestApprovalStatus;
  approvedFor: BacktestApprovedFor;
  blockingReasons: BacktestApprovalReasonCode[];
  warningReasons: BacktestApprovalReasonCode[];
  summary: string;
  metricSnapshot: BacktestSummary;
}

export interface EvaluateBacktestApprovalInput {
  run: BacktestRun;
  thresholds: BacktestMetricThresholds;
  /** Optional registry row evaluation — advisory mismatch signals only. */
  registryCompatibility?: ParameterSetCompatibilityResult | undefined;
}

export interface ImportBacktestCsvOptions {
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: string;
  brokerSymbol?: string | undefined;
  accountId?: AccountId | undefined;
  datasetSplit: BacktestDatasetSplit;
  sourceType: BacktestSourceType;
  dateFrom?: IsoDateTimeString | undefined;
  dateTo?: IsoDateTimeString | undefined;
  rawFileName?: string | undefined;
  /** When omitted, importer synthesizes a stable-ish id from options + row count (see warnings). */
  runId?: BacktestRunId | undefined;
  importedAt?: IsoDateTimeString | undefined;
}
