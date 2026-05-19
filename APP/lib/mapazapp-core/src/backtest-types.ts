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
  /** TestEA virtual trade bars waiting for entry (`bars_to_fill` column). */
  barsToFill?: number | undefined;
  /** TestEA virtual trade bars in trade after fill (`bars_held` column). */
  barsHeld?: number | undefined;
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
  /** E5.11 HTF Structure V1 observation columns (optional; older CSV). */
  htfStructureEnabled?: boolean | undefined;
  h4StructureState?: string | undefined;
  h1StructureState?: string | undefined;
  h4StructureDirection?: string | undefined;
  h1StructureDirection?: string | undefined;
  htfStructureAligned?: boolean | undefined;
  htfStructureConflict?: boolean | undefined;
  /** Observation-only HTF structure score (0–20); distinct from `htf_narrative_score` column semantics when V1 feeds EQ. */
  htfStructureScore?: number | undefined;
  h4ProtectedHigh?: number | undefined;
  h4ProtectedLow?: number | undefined;
  h1ProtectedHigh?: number | undefined;
  h1ProtectedLow?: number | undefined;
  h4ExternalLiquidityHigh?: number | undefined;
  h4ExternalLiquidityLow?: number | undefined;
  h1ExternalLiquidityHigh?: number | undefined;
  h1ExternalLiquidityLow?: number | undefined;
  htfStructureReasons?: string | undefined;
  /** E5.12 MSS / CHoCH V1 execution-TF observation columns (optional; older CSV). */
  mssChochEnabled?: boolean | undefined;
  mssDetected?: boolean | undefined;
  mssDirection?: string | undefined;
  mssBreakLevel?: number | undefined;
  mssClosePrice?: number | undefined;
  mssBarsAfterSweep?: number | undefined;
  mssBarsBeforeEntry?: number | undefined;
  mssValidClose?: boolean | undefined;
  chochDetected?: boolean | undefined;
  chochDirection?: string | undefined;
  chochBreakLevel?: number | undefined;
  chochClosePrice?: number | undefined;
  chochValidClose?: boolean | undefined;
  wickBreakOnly?: boolean | undefined;
  internalSwingHigh?: number | undefined;
  internalSwingLow?: number | undefined;
  internalSwingHighAgeBars?: number | undefined;
  internalSwingLowAgeBars?: number | undefined;
  mssChochScore?: number | undefined;
  mssChochReasons?: string | undefined;
  /** E5.12.2 temporal relevance observation scores (optional; older CSV). */
  mssTemporalRelevanceScore?: number | undefined;
  chochTemporalRelevanceScore?: number | undefined;
  /** E5.13 Premium/Discount V1 observation columns (optional; older CSV). */
  premiumDiscountEnabled?: boolean | undefined;
  pdRangeSource?: string | undefined;
  pdRangeHigh?: number | undefined;
  pdRangeLow?: number | undefined;
  pdMidpoint50?: number | undefined;
  pdPositionPct?: number | undefined;
  pdEntryZone?: string | undefined;
  pdEntryInPremium?: boolean | undefined;
  pdEntryInDiscount?: boolean | undefined;
  pdEntryInEquilibrium?: boolean | undefined;
  pdEntryOutsideRange?: boolean | undefined;
  pdEntryZoneValidForDirection?: boolean | undefined;
  pdEntryZoneConflict?: boolean | undefined;
  pdEntryTooDeep?: boolean | undefined;
  pdEntryTooShallow?: boolean | undefined;
  pdRangeSizePoints?: number | undefined;
  pdEntryDistanceToMidpointPoints?: number | undefined;
  premiumDiscountScore?: number | undefined;
  premiumDiscountGrade?: string | undefined;
  premiumDiscountReasons?: string | undefined;
  /** E5.14 IFVG / BISI / SIBI classification observation columns (optional; older CSV). */
  ifvgBisiSibiEnabled?: boolean | undefined;
  fvgClass?: string | undefined;
  fvgDirection?: string | undefined;
  fvgUpperPrice?: number | undefined;
  fvgLowerPrice?: number | undefined;
  fvgSizePoints?: number | undefined;
  fvgAgeBarsAtEntry?: number | undefined;
  fvgMitigationState?: string | undefined;
  fvgMitigationDepthPct?: number | undefined;
  fvgCeTouched?: boolean | undefined;
  fvgFullyFilled?: boolean | undefined;
  fvgWickOnlyFill?: boolean | undefined;
  ifvgInversionDetected?: boolean | undefined;
  ifvgInversionConfirmedClose?: boolean | undefined;
  ifvgInversionWickOnly?: boolean | undefined;
  ifvgInversionBarsAfterFvg?: number | undefined;
  ifvgInversionClosePrice?: number | undefined;
  ifvgRetestDetected?: boolean | undefined;
  ifvgRetestBarsAfterInversion?: number | undefined;
  ifvgRetestDepthPct?: number | undefined;
  ifvgValidForTradeDirection?: boolean | undefined;
  ifvgConflictWithTradeDirection?: boolean | undefined;
  ifvgBisiSibiScore?: number | undefined;
  ifvgBisiSibiGrade?: string | undefined;
  ifvgBisiSibiReasons?: string | undefined;
  /** E5.13.2 Entry fill feasibility post-candidate diagnostic columns (optional; older CSV). */
  entryFillFeasibilityEnabled?: boolean | undefined;
  entryFillStatus?: string | undefined;
  entryFillFeasibilityScore?: number | undefined;
  entryFillFeasibilityGrade?: string | undefined;
  entryFillFeasibilityReasons?: string | undefined;
  entryPriceForFillAudit?: number | undefined;
  fvgNearEdgePrice?: number | undefined;
  fvgFarEdgePrice?: number | undefined;
  fvgCePrice?: number | undefined;
  entryDepthInFvgPct?: number | undefined;
  entryDistanceFromNearEdgePoints?: number | undefined;
  entryDistanceFromFarEdgePoints?: number | undefined;
  entryDistanceFromCePoints?: number | undefined;
  fvgTouchReached?: boolean | undefined;
  fvgCeTouchReached?: boolean | undefined;
  entryPriceReached?: boolean | undefined;
  maxRetraceIntoFvgPct?: number | undefined;
  maxRetracePrice?: number | undefined;
  maxRetraceToEntryDistancePoints?: number | undefined;
  missedEntryByPoints?: number | undefined;
  barsToFvgTouch?: number | undefined;
  barsToCeTouch?: number | undefined;
  barsToEntryFill?: number | undefined;
  barsToMaxRetrace?: number | undefined;
  barsUntilExpirationOrResolution?: number | undefined;
  entryExpiredUnfilled?: boolean | undefined;
  entryMissedShallowRetrace?: boolean | undefined;
  entryTooDeepForRetest?: boolean | undefined;
  entryNearMiss?: boolean | undefined;
  entryFilledFast?: boolean | undefined;
  entryFilledLate?: boolean | undefined;
  entryInvalidatedBeforeFill?: boolean | undefined;
  entryOutsideFvg?: boolean | undefined;
  entryGeometryUnknown?: boolean | undefined;
  /** E5.13.4 Entry variant feasibility hypothetical diagnostic columns (optional; older CSV). */
  entryVariantFeasibilityEnabled?: boolean | undefined;
  entryVariantEdgePrice?: number | undefined;
  entryVariant25Price?: number | undefined;
  entryVariant50Price?: number | undefined;
  entryVariant75Price?: number | undefined;
  entryVariantAdaptivePrice?: number | undefined;
  entryVariantAdaptiveType?: string | undefined;
  entryVariantEdgeReached?: boolean | undefined;
  entryVariant25Reached?: boolean | undefined;
  entryVariant50Reached?: boolean | undefined;
  entryVariant75Reached?: boolean | undefined;
  entryVariantAdaptiveReached?: boolean | undefined;
  entryVariantFeasibilityScore?: number | undefined;
  entryVariantFeasibilityGrade?: string | undefined;
  entryVariantFeasibilityReasons?: string | undefined;
  entryVariantBestReached?: string | undefined;
  entryVariantBestReachedDepthPct?: number | undefined;
  entryVariantOfficialDepthPct?: number | undefined;
  entryVariantFillGapPct?: number | undefined;
  entryVariantShallowWouldFill?: boolean | undefined;
  entryVariantDeeperWouldNotFill?: boolean | undefined;
  /**
   * E5.13.6 — hypothetical entry variant outcome/risk simulation per trade (not official P/L).
   * Present only when CSV includes `entry_variant_*_sim_*` columns.
   */
  entryVariantOutcomeSim?: EntryVariantOutcomeSimTradeFields | undefined;
}

/** E5.13.6 — one hypothetical variant slot (diagnostic; not official strategy R). */
export interface EntryVariantOutcomeSimSlot {
  status?: string | undefined;
  resultR?: number | undefined;
  entryPrice?: number | undefined;
  slPrice?: number | undefined;
  tpPrice?: number | undefined;
  riskPoints?: number | undefined;
  effectiveRr?: number | undefined;
  barsToFill?: number | undefined;
  barsToClose?: number | undefined;
  ambiguous?: boolean | undefined;
  invalidRisk?: boolean | undefined;
}

/** E5.13.6 — per-trade hypothetical variant outcome simulation export. */
export interface EntryVariantOutcomeSimTradeFields {
  enabled?: boolean | undefined;
  reasons?: string | undefined;
  edge?: EntryVariantOutcomeSimSlot | undefined;
  p25?: EntryVariantOutcomeSimSlot | undefined;
  p50?: EntryVariantOutcomeSimSlot | undefined;
  p75?: EntryVariantOutcomeSimSlot | undefined;
  adaptive?: EntryVariantOutcomeSimSlot | undefined;
  bestVariant?: string | undefined;
  bestResultR?: number | undefined;
  bestStatus?: string | undefined;
  bestReasons?: string | undefined;
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
