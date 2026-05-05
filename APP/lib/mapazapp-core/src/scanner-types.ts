import type { AccountGuardInput, AccountGuardResult, AccountGuardSettings } from "./account-guard-types";
import type { Candle } from "./candle";
import type { AccountId, CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import type { ParameterSetCompatibilityResult, ParameterSetRegistry } from "./strategy-registry-types";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanEvaluationResult } from "./trade-plan-types";
import type { TradePlanEvaluationSettings } from "./trade-plan-settings";
import type { StrategyScoreResult } from "./strategy-score";
import type { ZoneCandidate } from "./zone-candidate";
import type { DetectIfvgZoneCandidatesResult } from "./strategy-detection";
import type { StrategyRegistryEvaluationSettings } from "./strategy-registry-settings";
/** Stable id for one in-memory scanner simulation run (not persisted). */
export type ScannerRunId = string;

export type ScannerTimeframe = string;

export type ScannerSourceType = "bridge_candles_csv_fixture" | "manual_candles_fixture" | "unknown";

export type ScannerRunStatus = "completed" | "completed_with_warnings" | "failed" | "no_candidates";

export type ScannerWarningCode =
  | "SCANNER_PIPELINE_WARNING"
  | "SCANNER_ASSUMPTION_WARNING"
  | "SCANNER_ACCOUNT_GUARD_WARNING"
  | "SCANNER_REGISTRY_WARNING";

export type ScannerErrorCode =
  | "SCANNER_INVALID_INPUT"
  | "SCANNER_MISSING_ACCOUNT_GUARD_INPUT"
  | "SCANNER_MISSING_STRATEGY_REGISTRY"
  | "SCANNER_MISSING_SYMBOL_PROFILE"
  | "SCANNER_EMPTY_CANDLES"
  | "SCANNER_INTERNAL";

export interface ScannerDiagnostic {
  level: "info" | "warning" | "error";
  code: ScannerWarningCode | ScannerErrorCode | string;
  message: string;
}

export interface ScannerSimulationRun {
  runId: ScannerRunId;
  accountId: AccountId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol: string;
  timeframe: ScannerTimeframe;
  sourceType: ScannerSourceType;
  sourceName?: string;
  evaluatedAtIso: string;
}

export interface ScannerSimulationInput {
  runId?: ScannerRunId;
  accountId: AccountId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  timeframe: ScannerTimeframe;
  candles: Candle[];
  symbolProfile: SymbolMarketSpec;
  strategySettings: IfvgStrategySettings;
  /** Required for account guard → trade-plan mapping (even when `accountGuardResult` is precomputed). */
  accountGuardInput: AccountGuardInput;
  /** When set, skips `evaluateAccountGuard` and uses this snapshot. */
  accountGuardResult?: AccountGuardResult;
  strategyRegistry: ParameterSetRegistry;
  tradePlanSettings: TradePlanEvaluationSettings;
  accountGuardSettings?: AccountGuardSettings;
  strategyRegistryEvaluationSettings?: StrategyRegistryEvaluationSettings;
  /** Evaluation clock; avoids hidden `Date.now()` in tests. */
  currentEvaluationTime?: string;
  sourceType: ScannerSourceType;
  sourceName?: string;
}

export interface ScannerCandidateResult {
  zoneCandidate: ZoneCandidate;
  strategyScore?: StrategyScoreResult;
  accountGuardResult: AccountGuardResult;
  registryCompatibility: ParameterSetCompatibilityResult;
  tradeReviewEvaluation: TradePlanEvaluationResult;
  diagnostics: ScannerDiagnostic[];
}

export interface ScannerSimulationResult {
  ok: boolean;
  run: ScannerSimulationRun;
  status: ScannerRunStatus;
  diagnostics: ScannerDiagnostic[];
  detection: DetectIfvgZoneCandidatesResult | null;
  accountGuardResult: AccountGuardResult;
  registryCompatibility: ParameterSetCompatibilityResult;
  candidates: ScannerCandidateResult[];
  /** Product flags — always review-only / no execution for this checkpoint. */
  reviewOnly: true;
  executionEnabled: false;
  mockOnly: true;
  simulatedScanner: true;
}
