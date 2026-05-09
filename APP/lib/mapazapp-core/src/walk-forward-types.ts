import type { BacktestCampaignDataset, BacktestCampaignParameterSetInput, BacktestCampaignResult } from "./backtest-campaign-types";
import type { BacktestCampaignSettings } from "./backtest-campaign-types";
import type { ParameterGridResult, ParameterGridSettings } from "./parameter-grid-types";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { TradePlanAccountGuardInput } from "./trade-plan-types";

export type WalkForwardDatasetSplit = BacktestCampaignDataset["datasetSplit"];

export type WalkForwardStatus =
  | "completed"
  | "completed_with_warnings"
  | "insufficient_data"
  | "missing_required_splits"
  | "no_valid_parameter_sets"
  | "failed";

export type WalkForwardRecommendation =
  | "candidate_for_more_testing"
  | "promising_but_unproven"
  | "needs_more_data"
  | "unstable"
  | "rejected"
  | "overfit_risk"
  | "not_rankable";

export type WalkForwardQuality = "strong" | "moderate" | "weak" | "poor" | "insufficient";

export type WalkForwardOverfitRiskLevel = "low" | "medium" | "high" | "unknown";

export type WalkForwardReasonCode =
  | "WF_OK"
  | "WF_NO_INPUT"
  | "WF_EMPTY_RUNS"
  | "WF_MISSING_TRAIN"
  | "WF_MISSING_VALIDATION"
  | "WF_MISSING_FORWARD"
  | "WF_UNKNOWN_SPLIT_ONLY"
  | "WF_FULL_SPLIT_SUBSTITUTE_NOTE"
  | "WF_LOW_TRADES_TRAIN"
  | "WF_LOW_TRADES_VALIDATION"
  | "WF_LOW_TRADES_FORWARD"
  | "WF_LOW_TOTAL_TRADES"
  | "WF_VALIDATION_METRICS_FAIL"
  | "WF_VALIDATION_NEGATIVE_EXPECTANCY"
  | "WF_FORWARD_METRICS_FAIL"
  | "WF_TRAIN_DOMINATES_VALIDATION"
  | "WF_VALIDATION_DOMINATES_FORWARD"
  | "WF_HIGH_VARIANCE_SPLITS"
  | "WF_INTERNAL_GRID_FAILED";

export interface WalkForwardReason {
  code: WalkForwardReasonCode;
  message: string;
  parameterSetId?: string;
  symbol?: string;
}

export interface WalkForwardSplitRequirements {
  requireTrain: boolean;
  requireValidation: boolean;
  requireForward: boolean;
}

export interface WalkForwardSettings {
  minTradesTrain: number;
  minTradesValidation: number;
  minTradesForward: number;
  minTotalTrades: number;
  /** If train avgR exceeds validation avgR by more than this, flag overfit (when both have trades). */
  maxAllowedTrainValidationAvgRDrop: number;
  /** If validation avgR exceeds forward avgR by more than this, flag degradation. */
  maxAllowedValidationForwardAvgRDrop: number;
  /** Train rankScore must not exceed validation by more than this ratio (train/val) to avoid overfit signal. */
  maxTrainToValidationRankScoreRatio: number;
  maxDrawdownR: number;
  minAverageRValidation: number;
  minProfitFactorValidation: number;
  allowUnknownSplitForExplorationOnly: boolean;
  /** Rank score stddev across present splits above this suggests instability. */
  highVarianceRankScoreStdDev: number;
}

export interface WalkForwardSplitResult {
  parameterSetId: string;
  symbol: string;
  datasetSplit: WalkForwardDatasetSplit;
  rankScore: number;
  tradeCount: number;
  averageR: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  winRate: number | null;
  totalR: number;
}

export interface WalkForwardOverfitRisk {
  level: WalkForwardOverfitRiskLevel;
  reasonCodes: WalkForwardReasonCode[];
  explanation: string;
}

export interface WalkForwardStabilitySummary {
  rankScoreVarianceAcrossSplits: number;
  averageRDropTrainToValidation: number | null;
  averageRDropValidationToForward: number | null;
  maxDrawdownAcrossSplits: number;
  winRateSpread: number | null;
  sampleSizeAdequate: boolean;
}

export interface WalkForwardSymbolResult {
  symbol: string;
  parameterSetId: string;
  splitsPresent: WalkForwardDatasetSplit[];
  splitAggregates: {
    train: WalkForwardSplitResult | null;
    validation: WalkForwardSplitResult | null;
    forward: WalkForwardSplitResult | null;
  };
  recommendation: WalkForwardRecommendation;
  quality: WalkForwardQuality;
  overfitRisk: WalkForwardOverfitRisk;
  stability: WalkForwardStabilitySummary;
  reasons: WalkForwardReason[];
}

export interface WalkForwardParameterSetResult {
  parameterSetId: string;
  strategyId: string;
  symbolResults: WalkForwardSymbolResult[];
  recommendation: WalkForwardRecommendation;
  quality: WalkForwardQuality;
  overfitRisk: WalkForwardOverfitRisk;
  stability: WalkForwardStabilitySummary;
  reasons: WalkForwardReason[];
}

export interface WalkForwardInput {
  parameterGridResult?: ParameterGridResult;
  campaignResult?: BacktestCampaignResult;
  datasets?: BacktestCampaignDataset[];
  parameterSets?: BacktestCampaignParameterSetInput[];
  campaignSettings?: BacktestCampaignSettings;
  gridSettings?: ParameterGridSettings;
  defaultAccountGuardInput?: TradePlanAccountGuardInput;
  defaultRegistryCompatibility?: ParameterSetCompatibilityResult | null;
  splitRequirements: WalkForwardSplitRequirements;
  settings: WalkForwardSettings;
}

export interface WalkForwardResult {
  status: WalkForwardStatus;
  parameterSetResults: WalkForwardParameterSetResult[];
  /** Denormalized split rows used for evaluation. */
  splitResults: WalkForwardSplitResult[];
  /** Roll-up worst-case overfit across evaluated symbol×PS slices. */
  overfitRisk: WalkForwardOverfitRisk;
  stability: WalkForwardStabilitySummary;
  reasons: WalkForwardReason[];
  reviewOnly: true;
  executionEnabled: false;
  registryMutationAllowed: false;
  autoApprovalEnabled: false;
}
