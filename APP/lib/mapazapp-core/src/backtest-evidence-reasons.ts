import type { BacktestEvidenceReasonCode, BacktestEvidenceSeverity } from "./backtest-evidence-types";

const MESSAGES: Record<BacktestEvidenceReasonCode, string> = {
  EVIDENCE_NO_RUNS: "No backtest runs were supplied — there is no evidence to evaluate.",
  EVIDENCE_INCONSISTENT_STRATEGY_ID: "Runs contain mixed strategy_id values — evidence cannot be grouped safely.",
  EVIDENCE_INCONSISTENT_PARAMETER_SET_ID: "Runs contain mixed parameter_set_id values — evidence cannot be grouped safely.",
  EVIDENCE_INCONSISTENT_CANONICAL_SYMBOL: "Runs contain mixed canonical symbols — evidence cannot be grouped safely.",
  EVIDENCE_TRAIN_SPLIT_MISSING: "Required train dataset split is missing.",
  EVIDENCE_VALIDATION_SPLIT_MISSING: "Required validation dataset split is missing.",
  EVIDENCE_FORWARD_SPLIT_MISSING: "Forward (or full) evidence is missing for the configured trade-review recommendation path.",
  EVIDENCE_INSUFFICIENT_RUNS_IN_SPLIT: "Not enough runs recorded for a required dataset split.",
  EVIDENCE_INSUFFICIENT_TRADES_IN_SPLIT: "Not enough trades in the representative run for a split.",
  EVIDENCE_INSUFFICIENT_TOTAL_TRADES: "Total trades across all runs are below the configured minimum.",
  EVIDENCE_VALIDATION_METRICS_FAILED: "Validation-era metrics failed numeric gates.",
  EVIDENCE_FORWARD_METRICS_FAILED: "Forward-era metrics failed numeric gates.",
  EVIDENCE_TRAIN_METRICS_FAILED: "Train-era metrics failed numeric gates.",
  EVIDENCE_HIGH_METRIC_VARIANCE: "Profit factor variance between splits exceeds the configured ceiling.",
  EVIDENCE_UNKNOWN_SPLIT_PRESENT: "Unknown dataset split rows are present — treated as warning-only context.",
  EVIDENCE_REGISTRY_PARAMETER_SET_MISMATCH: "Imported evidence does not match the registry parameter set context.",
  EVIDENCE_REGISTRY_SYMBOL_MISMATCH: "Imported evidence does not match the registry symbol context.",
  EVIDENCE_MANUAL_REVIEW_TRIGGER: "Automatic checks require explicit human review before any registry update.",
};

const DEFAULT_SEVERITY: Record<BacktestEvidenceReasonCode, BacktestEvidenceSeverity> = {
  EVIDENCE_NO_RUNS: "blocking",
  EVIDENCE_INCONSISTENT_STRATEGY_ID: "blocking",
  EVIDENCE_INCONSISTENT_PARAMETER_SET_ID: "blocking",
  EVIDENCE_INCONSISTENT_CANONICAL_SYMBOL: "blocking",
  EVIDENCE_TRAIN_SPLIT_MISSING: "blocking",
  EVIDENCE_VALIDATION_SPLIT_MISSING: "blocking",
  EVIDENCE_FORWARD_SPLIT_MISSING: "warning",
  EVIDENCE_INSUFFICIENT_RUNS_IN_SPLIT: "blocking",
  EVIDENCE_INSUFFICIENT_TRADES_IN_SPLIT: "blocking",
  EVIDENCE_INSUFFICIENT_TOTAL_TRADES: "blocking",
  EVIDENCE_VALIDATION_METRICS_FAILED: "blocking",
  EVIDENCE_FORWARD_METRICS_FAILED: "blocking",
  EVIDENCE_TRAIN_METRICS_FAILED: "blocking",
  EVIDENCE_HIGH_METRIC_VARIANCE: "blocking",
  EVIDENCE_UNKNOWN_SPLIT_PRESENT: "warning",
  EVIDENCE_REGISTRY_PARAMETER_SET_MISMATCH: "blocking",
  EVIDENCE_REGISTRY_SYMBOL_MISMATCH: "blocking",
  EVIDENCE_MANUAL_REVIEW_TRIGGER: "warning",
};

export function backtestEvidenceReasonSeverity(code: BacktestEvidenceReasonCode): BacktestEvidenceSeverity {
  return DEFAULT_SEVERITY[code] ?? "warning";
}

export function backtestEvidenceReasonMessage(code: BacktestEvidenceReasonCode): string {
  return MESSAGES[code] ?? code;
}
