import type { BacktestCampaignReason, BacktestCampaignReasonCode } from "./backtest-campaign-types";

const MESSAGES: Record<BacktestCampaignReasonCode, string> = {
  OK: "Campaign evaluation completed.",
  CAMPAIGN_EMPTY_DATASETS: "Campaign input has no datasets.",
  CAMPAIGN_EMPTY_PARAMETER_SETS: "Campaign input has no parameter sets.",
  DATASET_EMPTY_CANDLES: "Dataset has no candles and cannot be evaluated.",
  DATASET_MISSING_SYMBOL_PROFILE: "Dataset is missing symbol profile and cannot be replayed.",
  RUN_FAILED: "A replay run failed and was excluded from ranking confidence.",
  RUN_INSUFFICIENT_DATA: "A replay run had insufficient data for robust evidence.",
  RUN_NO_CANDIDATES: "A replay run produced no IFVG candidates.",
  RUN_NO_TRADES: "A replay run produced no replayed trades.",
  SEVERE_DIAGNOSTICS: "Replay diagnostics include severe reliability warnings.",
  LOW_SAMPLE_SIZE: "Trade sample is too small for robust ranking.",
  MISSING_VALIDATION_SPLIT: "Validation split evidence is missing for this candidate.",
  MISSING_FORWARD_SPLIT: "Forward split evidence is missing for this candidate.",
  UNKNOWN_SPLIT_ONLY: "Only unknown/synthetic split evidence is available.",
  HIGH_VARIANCE: "Results are unstable across datasets/splits.",
  NEGATIVE_EXPECTANCY: "Average R is negative under current campaign scope.",
  HIGH_DRAWDOWN: "Drawdown is high relative to conservative campaign thresholds.",
  NOT_RANKABLE: "Result is not rankable with current evidence quality.",
};

export function backtestCampaignReason(
  code: BacktestCampaignReasonCode,
  detail?: string,
): BacktestCampaignReason {
  const base = MESSAGES[code];
  return { code, message: detail ? `${base} ${detail}`.trim() : base };
}
