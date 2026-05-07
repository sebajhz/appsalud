import type { Candle } from "./candle";
import type { DecisionModelSettings } from "./decision-model-settings";
import type { EntrySlTpSettings } from "./entry-sl-tp-types";
import type { IfvgReplayBacktestReasonCode, IfvgReplayBacktestResult } from "./ifvg-replay-backtest-types";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanAccountGuardInput } from "./trade-plan-types";
import type { TradePlanEvaluationSettings } from "./trade-plan-settings";

export type BacktestCampaignStatus =
  | "completed"
  | "completed_with_warnings"
  | "insufficient_data"
  | "no_valid_runs"
  | "failed";

export type BacktestCampaignRecommendation =
  | "candidate_for_more_testing"
  | "needs_more_data"
  | "rejected"
  | "unstable"
  | "promising_but_unproven"
  | "not_rankable";

export type BacktestCampaignQuality = "strong" | "moderate" | "weak" | "poor" | "insufficient";

export type BacktestCampaignReasonCode =
  | "OK"
  | "CAMPAIGN_EMPTY_DATASETS"
  | "CAMPAIGN_EMPTY_PARAMETER_SETS"
  | "DATASET_EMPTY_CANDLES"
  | "DATASET_MISSING_SYMBOL_PROFILE"
  | "RUN_FAILED"
  | "RUN_INSUFFICIENT_DATA"
  | "RUN_NO_CANDIDATES"
  | "RUN_NO_TRADES"
  | "SEVERE_DIAGNOSTICS"
  | "LOW_SAMPLE_SIZE"
  | "MISSING_VALIDATION_SPLIT"
  | "MISSING_FORWARD_SPLIT"
  | "UNKNOWN_SPLIT_ONLY"
  | "HIGH_VARIANCE"
  | "NEGATIVE_EXPECTANCY"
  | "HIGH_DRAWDOWN"
  | "NOT_RANKABLE";

export interface BacktestCampaignReason {
  code: BacktestCampaignReasonCode;
  message: string;
}

export interface BacktestCampaignDataset {
  datasetId?: string;
  symbol: string;
  brokerSymbol?: string;
  timeframe: string;
  candles: Candle[];
  symbolProfile: SymbolMarketSpec | null;
  datasetSplit: "train" | "validation" | "forward" | "full" | "unknown";
  sourceName?: string;
  /** Tests/fixtures hook to bypass replay execution with deterministic synthetic result. */
  testOnlyReplayOverride?: IfvgReplayBacktestResult;
}

export interface BacktestCampaignParameterSetInput {
  parameterSetId: string;
  strategyId: string;
  strategySettings: IfvgStrategySettings;
  tradePlanSettings: TradePlanEvaluationSettings;
  entrySlTpSettings: EntrySlTpSettings;
  replaySettings?: import("./replay-trade-types").ReplayTradeSettings;
  decisionModelSettings?: DecisionModelSettings;
  accountGuardInput?: TradePlanAccountGuardInput;
  registryCompatibility?: ParameterSetCompatibilityResult | null;
}

export interface BacktestCampaignSettings {
  minTradesForRanking: number;
  minTradesForTrust: number;
  requireValidationSplit: boolean;
  requireForwardSplit: boolean;
  minValidationRunsForCandidate: number;
  minForwardRunsForCandidate: number;
  highVarianceScoreStdDev: number;
  severeDiagnosticPenaltyPerHit: number;
  warningPenaltyPerHit: number;
  unknownSplitPenaltyMultiplier: number;
  minSplitCoverageMultiplier: number;
}

export interface BacktestCampaignInput {
  datasets: BacktestCampaignDataset[];
  parameterSets: BacktestCampaignParameterSetInput[];
  campaignSettings: BacktestCampaignSettings;
  defaultAccountGuardInput?: TradePlanAccountGuardInput;
  defaultRegistryCompatibility?: ParameterSetCompatibilityResult | null;
}

export interface BacktestCampaignRunResult {
  runId: string;
  symbol: string;
  parameterSetId: string;
  datasetSplit: BacktestCampaignDataset["datasetSplit"];
  status: BacktestCampaignStatus;
  rankScore: number;
  tradeCount: number;
  totalR: number;
  averageR: number | null;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  ambiguousRate: number;
  missedRate: number;
  expiredRate: number;
  diagnosticsCount: number;
  severeDiagnosticsCount: number;
  reasons: BacktestCampaignReason[];
  replay: IfvgReplayBacktestResult | null;
}

export interface BacktestCampaignSymbolResult {
  symbol: string;
  status: BacktestCampaignStatus;
  recommendation: BacktestCampaignRecommendation;
  quality: BacktestCampaignQuality;
  rankScore: number;
  runCount: number;
  tradeCount: number;
  totalR: number;
  averageR: number | null;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  splitsCovered: BacktestCampaignDataset["datasetSplit"][];
  stabilityStdDev: number;
  reasons: BacktestCampaignReason[];
}

export interface BacktestCampaignParameterSetResult {
  parameterSetId: string;
  status: BacktestCampaignStatus;
  recommendation: BacktestCampaignRecommendation;
  quality: BacktestCampaignQuality;
  rankScore: number;
  runCount: number;
  tradeCount: number;
  totalR: number;
  averageR: number | null;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  splitsCovered: BacktestCampaignDataset["datasetSplit"][];
  stabilityStdDev: number;
  reasons: BacktestCampaignReason[];
}

export interface BacktestCampaignRankingRow {
  rank: number;
  symbol: string;
  recommendation: BacktestCampaignRecommendation;
  quality: BacktestCampaignQuality;
  score: number;
  tradeCount: number;
  splitsCovered: BacktestCampaignDataset["datasetSplit"][];
}

export interface BacktestCampaignResult {
  status: BacktestCampaignStatus;
  summary: {
    datasetCount: number;
    parameterSetCount: number;
    runCount: number;
    validRunCount: number;
    rankableSymbolCount: number;
    warnings: BacktestCampaignReason[];
  };
  symbolResults: BacktestCampaignSymbolResult[];
  parameterSetResults: BacktestCampaignParameterSetResult[];
  runResults: BacktestCampaignRunResult[];
  ranking: BacktestCampaignRankingRow[];
  executionEnabled: false;
  registryMutationAllowed: false;
  reviewOnly: true;
}

export const CAMPAIGN_SEVERE_REPLAY_DIAGNOSTICS: readonly IfvgReplayBacktestReasonCode[] = [
  "PIPELINE_INTERNAL",
  "CANDIDATE_INDEX_UNAVAILABLE",
];
