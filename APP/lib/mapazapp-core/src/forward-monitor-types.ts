import type { AccountGuardInput, AccountGuardResult } from "./account-guard-types";
import type { AccountId, CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { ScannerSimulationResult } from "./scanner-types";
import type { TradePlanStatus } from "./trade-plan-types";

/** Stable id for one forward-monitor snapshot evaluation (not persisted). */
export type ForwardMonitorRunId = string;

export type ForwardMonitorSourceType =
  | "mock_snapshot"
  | "bridge_fixture_snapshot"
  | "scanner_simulation_result"
  | "unknown";

export type ForwardMonitorStatus =
  | "idle"
  | "monitoring"
  | "completed_snapshot"
  | "completed_with_warnings"
  | "blocked_by_account_guard"
  | "blocked_by_registry"
  | "no_candidates"
  | "failed";

export type ForwardMonitorReasonCode =
  | "FORWARD_MONITOR_OK"
  | "FORWARD_MONITOR_INVALID_INPUT"
  | "FORWARD_MONITOR_MISSING_ACCOUNT_GUARD"
  | "FORWARD_MONITOR_MISSING_REGISTRY"
  | "FORWARD_MONITOR_SCANNER_MISMATCH"
  | "FORWARD_MONITOR_SCANNER_FAILED"
  | "FORWARD_MONITOR_NO_SCANNER_INPUT";

export type ForwardMonitorCandidateAction = "wait" | "review_manually" | "blocked" | "ignore";

export type ForwardMonitorEventKind =
  | "CANDIDATE_CREATED"
  | "WAITING_FOR_RETEST"
  | "WAITING_FOR_CONFIRMATION"
  | "TRADE_READY_REVIEW_ONLY"
  | "BLOCKED_BY_ACCOUNT_GUARD"
  | "BLOCKED_BY_PARAMETER_SET"
  | "NO_CANDIDATES";

export interface ForwardMonitorDiagnostic {
  level: "info" | "warning" | "error";
  code: ForwardMonitorReasonCode | string;
  message: string;
}

export interface ForwardMonitorEvent {
  eventId: string;
  occurredAtUtc: string;
  kind: ForwardMonitorEventKind;
  symbol?: CanonicalSymbol;
  candidateId?: string;
  messageSimple: string;
  reasonCodes: ForwardMonitorReasonCode[];
}

/** Optional candle snapshot metadata (counts only) — no file paths, no disk. */
export interface ForwardMonitorCandleSnapshotSummary {
  symbol: CanonicalSymbol;
  barCount: number;
}

export interface ForwardMonitorInput {
  monitorRunId?: ForwardMonitorRunId;
  accountId: AccountId;
  symbols: CanonicalSymbol[];
  timeframe: string;
  scannerSimulationResults?: ScannerSimulationResult[];
  candleSnapshotSummaries?: ForwardMonitorCandleSnapshotSummary[];
  accountGuardInput?: AccountGuardInput;
  accountGuardResult?: AccountGuardResult;
  /** Session-level registry gate for forward/demo review discipline. */
  registryCompatibility: ParameterSetCompatibilityResult | null;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  evaluationTimeUtc: string;
  sourceType: ForwardMonitorSourceType;
  sourceName?: string;
}

export interface ForwardMonitorAccountState {
  accountId: AccountId;
  allowTradeReview: boolean;
  guardStatus: AccountGuardResult["status"];
  simpleSummary: string;
  technicalSummary: string;
}

export interface ForwardMonitorSymbolState {
  symbol: CanonicalSymbol;
  timeframe: string;
  scannerRunId?: string;
  candidateCount: number;
  lastEvaluatedIso: string;
  sourceType: ForwardMonitorSourceType;
  scannerResultStatus?: string;
}

export interface ForwardMonitorCandidateState {
  candidateId: string;
  zoneId: string;
  symbol: CanonicalSymbol;
  direction: "BUY" | "SELL";
  reviewStatus: TradePlanStatus;
  currentAction: ForwardMonitorCandidateAction;
  simpleSummary: string;
  technicalReasonCodes: string[];
  accountId: AccountId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  lastUpdatedUtc: string;
}

export interface ForwardMonitorPlanStatusSummary {
  TRADE_READY: number;
  WAIT_RETEST: number;
  WAIT_CONFIRMATION: number;
  OBSERVE: number;
  NO_TRADE: number;
  INVALIDATED: number;
  EXPIRED: number;
  USED: number;
}

export interface ForwardMonitorResult {
  ok: boolean;
  monitorRunId: ForwardMonitorRunId;
  status: ForwardMonitorStatus;
  accountId: AccountId;
  symbols: CanonicalSymbol[];
  timeframe: string;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  evaluationTimeUtc: string;
  sourceType: ForwardMonitorSourceType;
  sourceName?: string;
  accountState: ForwardMonitorAccountState;
  registryCompatibility: ParameterSetCompatibilityResult | null;
  symbolStates: ForwardMonitorSymbolState[];
  candidates: ForwardMonitorCandidateState[];
  candidateCountsByReviewStatus: ForwardMonitorPlanStatusSummary;
  events: ForwardMonitorEvent[];
  diagnostics: ForwardMonitorDiagnostic[];
  scannerRunReferences: string[];
  reviewOnly: true;
  executionEnabled: false;
  mockOnly: true;
  simulated: true;
}

export interface ForwardMonitorSession {
  sessionId: string;
  accountId: AccountId;
  symbols: CanonicalSymbol[];
  timeframe: string;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  lastSnapshotIso: string;
  status: ForwardMonitorStatus;
  sourceType: ForwardMonitorSourceType;
}
