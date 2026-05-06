import type { BacktestTrade } from "./backtest-types";
import type { Candle } from "./candle";
import type { EntrySlTpModelResult, EntrySlTpSettings } from "./entry-sl-tp-types";
import type { AccountId, CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import type { ReplayTradeResult, ReplayTradeSettings } from "./replay-trade-types";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanAccountGuardInput, TradePlanEvaluationResult } from "./trade-plan-types";
import type { TradePlanEvaluationSettings } from "./trade-plan-settings";
import type { DetectIfvgZoneCandidatesResult } from "./strategy-detection";
import type { ZoneCandidate } from "./zone-candidate";

export type IfvgReplayBacktestStatus =
  | "completed"
  | "completed_with_warnings"
  | "no_candidates"
  | "insufficient_data"
  | "failed";

export type IfvgReplayBacktestEvaluationMode = "synthetic_fixture" | "historical_import" | "unknown";

export type IfvgReplayBacktestReasonCode =
  | "OK"
  | "INSUFFICIENT_CANDLES"
  | "MISSING_SYMBOL_PROFILE"
  | "MISSING_STRATEGY_SETTINGS"
  | "DETECTION_FAILED"
  | "CANDIDATE_INDEX_UNAVAILABLE"
  | "CANDIDATE_INDEX_INFERRED_FROM_ID"
  | "NO_RETEST_CONFIRM_PATH"
  | "PIPELINE_INTERNAL"
  | "DETECTION_ASSUMPTION";

export interface IfvgReplayBacktestReason {
  code: IfvgReplayBacktestReasonCode;
  message: string;
}

export interface IfvgReplayBacktestDiagnostic {
  code: IfvgReplayBacktestReasonCode;
  message: string;
  candidateZoneId?: string;
}

export interface IfvgReplayBacktestSummary {
  candidateCount: number;
  replayAttemptedCount: number;
  replayedTradeCount: number;
  wins: number;
  losses: number;
  expiredCount: number;
  missedCount: number;
  invalidatedCount: number;
  ambiguousCount: number;
  notTriggeredCount: number;
  totalR: number;
  averageR: number | null;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  averageMaeR: number;
  averageMfeR: number;
  bestTradeR: number;
  worstTradeR: number;
}

export interface IfvgReplayBacktestSettings {
  replayOnlyTradeReady: boolean;
  /** When false, OBSERVE plans are not replayed even if numerically eligible. */
  includeObserveCandidates: boolean;
  maxCandidates?: number;
  minScore?: number;
  /** Score passed to trade plan when not computed (synthetic / fixture). */
  defaultScore: number;
  sweepLow?: number;
  sweepHigh?: number;
  /** When true, allow replay for plans with SL/TP that are not TRADE_READY but not NO_TRADE (e.g. some gates failed). */
  allowNonReadyPlansWithPrices: boolean;
}

export interface IfvgReplayBacktestInput {
  candles: Candle[];
  symbolProfile: SymbolMarketSpec | null;
  strategySettings: IfvgStrategySettings | null;
  tradePlanSettings: TradePlanEvaluationSettings;
  entrySlTpSettings: EntrySlTpSettings;
  replaySettings?: ReplayTradeSettings;
  accountGuardInput?: TradePlanAccountGuardInput;
  registryCompatibility: ParameterSetCompatibilityResult | null;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  accountId: AccountId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  timeframe: string;
  evaluationMode: IfvgReplayBacktestEvaluationMode;
  sourceName?: string;
  backtestSettings: IfvgReplayBacktestSettings;
  /** Optional run id prefix for synthetic BacktestTrade rows. */
  syntheticRunId?: string;
  /**
   * **Tests only:** zones appended after `detectIfvgZoneCandidates` (e.g. invalid `sourceIfvgId` for diagnostic coverage).
   * Not for production backtests.
   */
  testOnlyAppendZones?: ZoneCandidate[];
}

export interface IfvgReplayBacktestCandidateTrace {
  zoneId: string;
  sourceIfvgId: string;
  inferredCenterBarIndex: number | null;
  /** First bar index used for retest+confirmation search (full series coordinates). */
  retestSearchStartIndex: number | null;
  /** First bar index passed to `simulateReplayTrade` (full series coordinates). */
  replaySliceStartBarIndex: number | null;
  planReadyBarIndex: number | null;
  detectionDiagnostics: DetectIfvgZoneCandidatesResult["diagnostics"] | null;
  tradeEvaluation: TradePlanEvaluationResult | null;
  entrySlTp: EntrySlTpModelResult | null;
  replay: ReplayTradeResult | null;
  skippedReason?: IfvgReplayBacktestReasonCode;
  skipMessage?: string;
  backtestTrade: BacktestTrade | null;
}

export interface IfvgReplayBacktestResult {
  status: IfvgReplayBacktestStatus;
  summary: IfvgReplayBacktestSummary;
  trades: BacktestTrade[];
  traces: IfvgReplayBacktestCandidateTrace[];
  diagnostics: IfvgReplayBacktestDiagnostic[];
  warnings: IfvgReplayBacktestReason[];
  detection: DetectIfvgZoneCandidatesResult | null;
  /** Explicit safety — always false in V2-04. */
  executionEnabled: false;
  /** Explicit safety — always false in V2-04. */
  registryMutationAllowed: false;
  reviewOnly: true;
}
