import type { AccountId, ParameterSetId, StrategyId } from "./ids";
import type {
  BacktestDatasetSplit,
  BacktestImportError,
  BacktestImportWarning,
  BacktestRun,
  BacktestSourceType,
  BacktestSummary,
} from "./backtest-types";
import type { ParameterSetApprovalLevel, ParameterSetCompatibilityResult, ParameterSetStatus } from "./strategy-registry-types";

/** Advisory lifecycle for multi-run evidence — not a registry write. */
export type BacktestEvidenceStatus =
  | "no_evidence"
  | "insufficient_evidence"
  | "inconsistent_evidence"
  | "rejected"
  | "needs_more_forward"
  | "needs_manual_review"
  | "candidate_for_demo"
  | "candidate_for_alerts"
  | "candidate_for_trade_review";

export type BacktestEvidenceSeverity = "info" | "warning" | "blocking";

/** Origin of ingested evidence (in-memory / manual paste — no disk watcher). */
export type BacktestEvidenceSource = "fixture" | "csv_text_import" | "manual_run_array" | "unknown";

export type BacktestEvidenceReasonCode =
  | "EVIDENCE_NO_RUNS"
  | "EVIDENCE_INCONSISTENT_STRATEGY_ID"
  | "EVIDENCE_INCONSISTENT_PARAMETER_SET_ID"
  | "EVIDENCE_INCONSISTENT_CANONICAL_SYMBOL"
  | "EVIDENCE_TRAIN_SPLIT_MISSING"
  | "EVIDENCE_VALIDATION_SPLIT_MISSING"
  | "EVIDENCE_FORWARD_SPLIT_MISSING"
  | "EVIDENCE_INSUFFICIENT_RUNS_IN_SPLIT"
  | "EVIDENCE_INSUFFICIENT_TRADES_IN_SPLIT"
  | "EVIDENCE_INSUFFICIENT_TOTAL_TRADES"
  | "EVIDENCE_VALIDATION_METRICS_FAILED"
  | "EVIDENCE_FORWARD_METRICS_FAILED"
  | "EVIDENCE_TRAIN_METRICS_FAILED"
  | "EVIDENCE_HIGH_METRIC_VARIANCE"
  | "EVIDENCE_UNKNOWN_SPLIT_PRESENT"
  | "EVIDENCE_REGISTRY_PARAMETER_SET_MISMATCH"
  | "EVIDENCE_REGISTRY_SYMBOL_MISMATCH"
  | "EVIDENCE_MANUAL_REVIEW_TRIGGER";

/** Which dataset splits are present / relied on (excludes unknown-only paths). */
export interface BacktestEvidenceCoverage {
  hasTrain: boolean;
  hasValidation: boolean;
  hasForward: boolean;
  hasFull: boolean;
  hasUnknown: boolean;
}

export type BacktestEvidenceBestRunCriteria = "profitFactor" | "expectancyR" | "totalR";

/** Dev/test defaults only — not production governance. */
export interface BacktestEvidenceThresholds {
  requireTrain: boolean;
  requireValidation: boolean;
  /** When true, allowing `candidate_for_trade_review` recommendation requires forward (or full) evidence. */
  requireForwardForTradeReview: boolean;
  minRunsPerSplit: number;
  minTradesPerSplit: number;
  minTotalTrades: number;
  minProfitFactor: number;
  minExpectancyR: number;
  maxDrawdownR: number;
  maxLosingStreak: number;
  minWinRate?: number | undefined;
  /** Max absolute PF delta between train vs validation best runs (when both exist). */
  maxMetricVariance?: number | undefined;
  requireSameSymbol: boolean;
  requireSameParameterSet: boolean;
  requireSameStrategyId: boolean;
  bestRunCriteria: BacktestEvidenceBestRunCriteria;
}

export interface BacktestEvidenceRegistryContext {
  registryCompatibility?: ParameterSetCompatibilityResult | undefined;
  /** Registry row status before any human update — advisory display only. */
  currentParameterSetStatus?: ParameterSetStatus | undefined;
}

export interface EvaluateBacktestEvidenceInput extends BacktestEvidenceRegistryContext {
  runs: BacktestRun[];
  thresholds: BacktestEvidenceThresholds;
  /** Explicit splits that must be present (union with threshold flags). Default derived when omitted. */
  requiredSplits?: BacktestDatasetSplit[] | undefined;
  evidenceSource?: BacktestEvidenceSource | undefined;
}

export interface BacktestEvidenceReasonRef {
  code: BacktestEvidenceReasonCode;
  severity: BacktestEvidenceSeverity;
  message: string;
  split?: BacktestDatasetSplit | undefined;
  runId?: string | undefined;
}

export interface BacktestEvidenceRunResult {
  runId: string;
  datasetSplit: BacktestDatasetSplit;
  importedAt: string;
  tradeCount: number;
  passedNumericGates: boolean;
  blockingReasonCodes: BacktestEvidenceReasonCode[];
  warningReasonCodes: BacktestEvidenceReasonCode[];
}

export interface BacktestEvidenceSplitResult {
  split: BacktestDatasetSplit;
  runIds: string[];
  latestRunId: string | null;
  bestRunId: string | null;
  aggregateTradeCount: number;
  passedNumericGates: boolean;
  blockingReasonCodes: BacktestEvidenceReasonCode[];
  warningReasonCodes: BacktestEvidenceReasonCode[];
}

export interface BacktestEvidenceResult {
  status: BacktestEvidenceStatus;
  approvedForRecommendation: boolean;
  recommendedParameterSetStatus: ParameterSetStatus | "unchanged";
  recommendedApprovalLevel: ParameterSetApprovalLevel;
  blockingReasons: BacktestEvidenceReasonRef[];
  warningReasons: BacktestEvidenceReasonRef[];
  runResults: BacktestEvidenceRunResult[];
  splitResults: BacktestEvidenceSplitResult[];
  summary: string;
  metricSnapshot: BacktestSummary;
  coverage: BacktestEvidenceCoverage;
  manualReviewRequired: true;
  registryMutationAllowed: false;
  evidenceSource: BacktestEvidenceSource;
}

export type ParameterSetAllowedUsage = "observe" | "alert" | "trade_review" | "backtest" | "validation";

export interface BacktestEvidenceApprovalProposal {
  parameterSetId: string;
  strategyId: string;
  canonicalSymbol: string;
  brokerSymbol?: string | undefined;
  proposalStatus: BacktestEvidenceStatus;
  recommendedParameterSetStatus: ParameterSetStatus | "unchanged";
  recommendedApprovalLevel: ParameterSetApprovalLevel;
  allowedUsages: ParameterSetAllowedUsage[];
  requiredHumanActions: string[];
  blockingReasons: BacktestEvidenceReasonRef[];
  warningReasons: BacktestEvidenceReasonRef[];
  evidenceSummary: string;
  registryPatchPreview?: {
    parameterSetId: string;
    previousStatus: ParameterSetStatus | "unknown";
    suggestedStatus: ParameterSetStatus | "unchanged";
    notes: string;
  } | undefined;
  manualReviewRequired: true;
  canAutoApply: false;
}

export interface BacktestEvidenceBundle {
  runs: BacktestRun[];
  importErrors: BacktestImportError[];
  importWarnings: BacktestImportWarning[];
  evaluation: BacktestEvidenceResult;
  proposal: BacktestEvidenceApprovalProposal;
}

export interface CreateBacktestEvidenceBundleCsvFileInput {
  fileName: string;
  csvText: string;
  datasetSplit: BacktestDatasetSplit;
  sourceType: BacktestSourceType;
  rawFileName?: string | undefined;
}

export interface CreateBacktestEvidenceBundleCommonOptions {
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: string;
  brokerSymbol?: string | undefined;
  accountId?: AccountId | undefined;
}

export interface CreateBacktestEvidenceBundleFromCsvTextsParams {
  csvFiles: CreateBacktestEvidenceBundleCsvFileInput[];
  commonOptions: CreateBacktestEvidenceBundleCommonOptions;
  thresholds?: BacktestEvidenceThresholds | undefined;
  registryContext?: BacktestEvidenceRegistryContext | undefined;
}
