import type {
  BacktestCampaignDataset,
  BacktestCampaignParameterSetInput,
  BacktestCampaignResult,
  BacktestCampaignSettings,
} from "./backtest-campaign-types";
import type { DecisionModelSettings } from "./decision-model-settings";
import type { IfvgReplayBacktestResult } from "./ifvg-replay-backtest-types";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { TradePlanAccountGuardInput } from "./trade-plan-types";
import type { ToleranceCalibrationSettings } from "./tolerance-calibration-settings";
import type { ContextBiasSettings } from "./context-bias-settings";
import type { TargetObjectiveSettings } from "./target-objective-types";

export type ParameterGridStatus =
  | "completed"
  | "completed_with_warnings"
  | "insufficient_data"
  | "no_valid_parameter_sets"
  | "no_valid_datasets"
  | "failed";

export type ParameterGridRecommendation =
  | "candidate_for_more_testing"
  | "promising_but_unproven"
  | "needs_more_data"
  | "unstable"
  | "rejected"
  | "not_rankable";

export type ParameterGridQuality = "strong" | "moderate" | "weak" | "poor" | "insufficient";

export type ParameterGridReasonCode =
  | "GRID_OK"
  | "GRID_EMPTY_DATASETS"
  | "GRID_EMPTY_CANDIDATES"
  | "GRID_CANDIDATE_NO_COMPATIBLE_DATASETS"
  | "GRID_REGISTRY_INCOMPATIBLE"
  | "GRID_CAMPAIGN_WARNINGS"
  | "GRID_EXCEPTION";

export interface ParameterGridReason {
  code: ParameterGridReasonCode;
  message: string;
}

export interface ParameterGridSettings {
  /** Extra dampening on mean ambiguous/missed/expired rates (0 = no extra penalty). */
  behaviorRatePenaltyWeight: number;
  /** Multiplier applied to campaign `rankScore` after behavior penalty (conservative). */
  conservativeScoreMultiplier: number;
  /** When true, `toleranceCalibrationSettings` / `contextBiasSettings` / `targetObjectiveSettings` on candidates are ignored at runtime (v1); see docs. */
  documentOnlyEngineSettings: boolean;
}

export interface ParameterGridDatasetGroup {
  symbol: string;
  datasetCount: number;
  splits: BacktestCampaignDataset["datasetSplit"][];
}

export interface ParameterGridCandidate {
  parameterSet: BacktestCampaignParameterSetInput;
  /** When set, only datasets whose `symbol` appears here are used for this candidate's campaign run. */
  compatibleCanonicalSymbols?: string[];
  /** When present and `compatible === false`, the candidate does not run (registry / policy). */
  registryCompatibility?: ParameterSetCompatibilityResult | null;
  /** Shallow-merge over `parameterSet.decisionModelSettings` (defaults filled from campaign base if missing). */
  decisionModelSettingsOverride?: DecisionModelSettings;
  /** Shallow-merge into shared `campaignSettings` for this candidate's isolated run only. */
  campaignSettingsOverrides?: Partial<BacktestCampaignSettings>;
  /**
   * Not wired into replay in v1 when `documentOnlyEngineSettings` is true (default).
   * Future: thread into calibration / HTF / target objective inputs.
   */
  toleranceCalibrationSettings?: ToleranceCalibrationSettings;
  contextBiasSettings?: ContextBiasSettings;
  targetObjectiveSettings?: TargetObjectiveSettings;
}

export interface ParameterGridInput {
  datasets: BacktestCampaignDataset[];
  candidates: ParameterGridCandidate[];
  campaignSettings: BacktestCampaignSettings;
  defaultAccountGuardInput?: TradePlanAccountGuardInput;
  defaultRegistryCompatibility?: ParameterSetCompatibilityResult | null;
  gridSettings: ParameterGridSettings;
  /**
   * Test hook: when set for a `parameterSetId`, that candidate's run clones datasets with this replay override.
   * Production grids should omit; uses same contract as `BacktestCampaignDataset.testOnlyReplayOverride`.
   */
  testOnlyReplayStubByParameterSetId?: Record<string, IfvgReplayBacktestResult>;
}

export interface ParameterGridCandidateResult {
  parameterSetId: string;
  strategyId: string;
  datasetSymbolsUsed: string[];
  registryCompatible: boolean;
  registrySkipped: boolean;
  campaignResult: BacktestCampaignResult | null;
  /** Aggregated row from the isolated campaign's `parameterSetResults[0]` when present. */
  campaignParameterSetSlice: BacktestCampaignResult["parameterSetResults"][number] | null;
  gridRankScore: number;
  recommendation: ParameterGridRecommendation;
  quality: ParameterGridQuality;
  reasons: ParameterGridReason[];
  meanAmbiguousRate: number;
  meanMissedRate: number;
  meanExpiredRate: number;
}

export interface ParameterGridRankingRow {
  rank: number;
  parameterSetId: string;
  strategyId: string;
  gridRankScore: number;
  recommendation: ParameterGridRecommendation;
  quality: ParameterGridQuality;
  tradeCount: number;
  splitsCovered: BacktestCampaignDataset["datasetSplit"][];
}

export interface ParameterGridSummary {
  datasetCount: number;
  datasetGroups: ParameterGridDatasetGroup[];
  candidateCount: number;
  campaignRuns: number;
  successfulCampaignRuns: number;
  compatibleCandidates: number;
  primaryReasonCodes: ParameterGridReasonCode[];
}

export interface ParameterGridResult {
  status: ParameterGridStatus;
  summary: ParameterGridSummary;
  candidates: ParameterGridCandidateResult[];
  ranking: ParameterGridRankingRow[];
  reasons: ParameterGridReason[];
  reviewOnly: true;
  executionEnabled: false;
  registryMutationAllowed: false;
  autoApprovalEnabled: false;
}
