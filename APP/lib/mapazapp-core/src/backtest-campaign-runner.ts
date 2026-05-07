import {
  CAMPAIGN_SEVERE_REPLAY_DIAGNOSTICS,
  type BacktestCampaignDataset,
  type BacktestCampaignInput,
  type BacktestCampaignParameterSetResult,
  type BacktestCampaignQuality,
  type BacktestCampaignReason,
  type BacktestCampaignRecommendation,
  type BacktestCampaignResult,
  type BacktestCampaignRunResult,
  type BacktestCampaignSettings,
  type BacktestCampaignStatus,
  type BacktestCampaignSymbolResult,
} from "./backtest-campaign-types";
import { backtestCampaignReason } from "./backtest-campaign-reasons";
import { runIfvgReplayBacktest } from "./ifvg-replay-backtest";

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  const v = avg(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function splitCoverageMultiplier(
  splits: BacktestCampaignDataset["datasetSplit"][],
  settings: BacktestCampaignSettings,
): number {
  const set = new Set(splits);
  if (set.size === 0) return settings.minSplitCoverageMultiplier;
  if (set.size === 1 && set.has("unknown")) return settings.unknownSplitPenaltyMultiplier;
  let score = 0.55;
  if (set.has("train") || set.has("full")) score += 0.15;
  if (set.has("validation")) score += 0.2;
  if (set.has("forward")) score += 0.1;
  if (set.has("unknown")) score -= 0.05;
  return clamp(score, settings.minSplitCoverageMultiplier, 1);
}

function classifyQuality(score: number): BacktestCampaignQuality {
  if (score >= 74) return "strong";
  if (score >= 58) return "moderate";
  if (score >= 42) return "weak";
  if (score > 0) return "poor";
  return "insufficient";
}

function recommend(params: {
  rankScore: number;
  tradeCount: number;
  averageR: number | null;
  maxDrawdownR: number;
  stabilityStdDev: number;
  mixedPolarity: boolean;
  splitsCovered: BacktestCampaignDataset["datasetSplit"][];
  settings: BacktestCampaignSettings;
}): BacktestCampaignRecommendation {
  const splits = new Set(params.splitsCovered);
  const hasValidation = splits.has("validation") || splits.has("full");
  const hasForward = splits.has("forward") || splits.has("full");
  const onlyUnknown = splits.size > 0 && splits.size === 1 && splits.has("unknown");

  if (params.tradeCount <= 0 || params.rankScore <= 0) return "not_rankable";
  if (params.tradeCount < params.settings.minTradesForRanking) return "needs_more_data";
  if (onlyUnknown) return "promising_but_unproven";
  if (params.mixedPolarity) return "unstable";
  if (params.stabilityStdDev >= params.settings.highVarianceScoreStdDev) return "unstable";
  if ((params.averageR ?? -1) < 0 || params.maxDrawdownR >= 5) return "rejected";
  if (params.settings.requireValidationSplit && !hasValidation) return "needs_more_data";
  if (params.settings.requireForwardSplit && !hasForward) return "needs_more_data";
  if (params.tradeCount < params.settings.minTradesForTrust) return "promising_but_unproven";
  return "candidate_for_more_testing";
}

function aggregateStatus(
  recommendation: BacktestCampaignRecommendation,
  reasons: BacktestCampaignReason[],
): BacktestCampaignStatus {
  if (recommendation === "not_rankable") return "no_valid_runs";
  if (reasons.some((r) => r.code === "RUN_FAILED")) return "completed_with_warnings";
  if (reasons.length > 0) return "completed_with_warnings";
  return "completed";
}

function toRunStatus(status: string): BacktestCampaignStatus {
  if (status === "failed") return "failed";
  if (status === "insufficient_data") return "insufficient_data";
  if (status === "no_candidates") return "no_valid_runs";
  if (status === "completed_with_warnings") return "completed_with_warnings";
  return "completed";
}

function runRankScore(run: BacktestCampaignRunResult, settings: BacktestCampaignSettings): number {
  if (run.tradeCount <= 0) return 0;
  const pf = run.profitFactor == null ? 0 : run.profitFactor === Number.POSITIVE_INFINITY ? 4 : run.profitFactor;
  const pfScore = clamp(pf / 4, 0, 1);
  const avgRScore = clamp(((run.averageR ?? -1) + 1) / 2, 0, 1);
  const totalRScore = clamp((run.totalR + 8) / 24, 0, 1);
  const ddPenalty = clamp(1 - run.maxDrawdownR / 8, 0, 1);
  const winScore = clamp(run.winRate ?? 0, 0, 1);
  const base =
    (pfScore * 0.2 + avgRScore * 0.2 + totalRScore * 0.2 + ddPenalty * 0.2 + winScore * 0.2) * 100;

  const sampleFactor = clamp(run.tradeCount / settings.minTradesForTrust, 0, 1);
  const diagnosticPenalty = clamp(
    1 - run.severeDiagnosticsCount * settings.severeDiagnosticPenaltyPerHit - run.diagnosticsCount * settings.warningPenaltyPerHit,
    0.2,
    1,
  );
  const behaviorPenalty = clamp(1 - run.ambiguousRate * 0.5 - run.missedRate * 0.35 - run.expiredRate * 0.2, 0.2, 1);
  const splitFactor = splitCoverageMultiplier([run.datasetSplit], settings);
  return Number((base * sampleFactor * diagnosticPenalty * behaviorPenalty * splitFactor).toFixed(4));
}

function aggregateEntity(
  key: string,
  runs: BacktestCampaignRunResult[],
  settings: BacktestCampaignSettings,
): Omit<BacktestCampaignSymbolResult, "symbol"> {
  const reasons: BacktestCampaignReason[] = [];
  const tradeCount = runs.reduce((a, r) => a + r.tradeCount, 0);
  const totalR = Number(runs.reduce((a, r) => a + r.totalR, 0).toFixed(4));
  const avgR = tradeCount > 0 ? Number((totalR / tradeCount).toFixed(4)) : null;
  const winWeightedNumerator = runs.reduce((a, r) => a + (r.winRate ?? 0) * r.tradeCount, 0);
  const winRate = tradeCount > 0 ? Number((winWeightedNumerator / tradeCount).toFixed(4)) : null;
  const pfScores = runs.map((r) => (r.profitFactor == null ? 0 : r.profitFactor === Number.POSITIVE_INFINITY ? 4 : r.profitFactor));
  const profitFactor = runs.length > 0 ? Number(avg(pfScores).toFixed(4)) : null;
  const maxDrawdownR = Number((runs.length > 0 ? Math.max(...runs.map((r) => r.maxDrawdownR)) : 0).toFixed(4));
  const runScores = runs.map((r) => r.rankScore);
  const mixedPolarity = runs.some((r) => r.totalR > 0) && runs.some((r) => r.totalR <= 0);
  const stabilityStdDev = Number(stddev(runScores).toFixed(4));
  const splitsCovered = Array.from(new Set(runs.map((r) => r.datasetSplit)));

  if (tradeCount < settings.minTradesForRanking) reasons.push(backtestCampaignReason("LOW_SAMPLE_SIZE"));
  if (settings.requireValidationSplit && !splitsCovered.includes("validation") && !splitsCovered.includes("full")) {
    reasons.push(backtestCampaignReason("MISSING_VALIDATION_SPLIT"));
  }
  if (settings.requireForwardSplit && !splitsCovered.includes("forward") && !splitsCovered.includes("full")) {
    reasons.push(backtestCampaignReason("MISSING_FORWARD_SPLIT"));
  }
  if (splitsCovered.length === 1 && splitsCovered[0] === "unknown") {
    reasons.push(backtestCampaignReason("UNKNOWN_SPLIT_ONLY"));
  }
  if ((avgR ?? -1) < 0) reasons.push(backtestCampaignReason("NEGATIVE_EXPECTANCY"));
  if (maxDrawdownR >= 5) reasons.push(backtestCampaignReason("HIGH_DRAWDOWN"));
  if (stabilityStdDev >= settings.highVarianceScoreStdDev) reasons.push(backtestCampaignReason("HIGH_VARIANCE"));
  if (mixedPolarity) reasons.push(backtestCampaignReason("HIGH_VARIANCE", "Mixed positive/flat-negative runs."));
  if (runs.some((r) => r.severeDiagnosticsCount > 0)) reasons.push(backtestCampaignReason("SEVERE_DIAGNOSTICS"));
  if (runs.some((r) => r.status === "failed")) reasons.push(backtestCampaignReason("RUN_FAILED"));

  const aggregatedScore =
    runs.length === 0
      ? 0
      : Number(
          (
            avg(runScores) *
            splitCoverageMultiplier(splitsCovered, settings) *
            clamp(1 - stabilityStdDev / 50, settings.minSplitCoverageMultiplier, 1)
          ).toFixed(4),
        );
  const recommendation = recommend({
    rankScore: aggregatedScore,
    tradeCount,
    averageR: avgR,
    maxDrawdownR,
    stabilityStdDev,
    mixedPolarity,
    splitsCovered,
    settings,
  });
  if (recommendation === "not_rankable") reasons.push(backtestCampaignReason("NOT_RANKABLE"));
  return {
    status: aggregateStatus(recommendation, reasons),
    recommendation,
    quality: classifyQuality(aggregatedScore),
    rankScore: aggregatedScore,
    runCount: runs.length,
    tradeCount,
    totalR,
    averageR: avgR,
    winRate,
    profitFactor,
    maxDrawdownR,
    splitsCovered,
    stabilityStdDev,
    reasons,
  };
}

export function runBacktestCampaign(input: BacktestCampaignInput): BacktestCampaignResult {
  const warnings: BacktestCampaignReason[] = [];
  if (!input.datasets.length) {
    return {
      status: "insufficient_data",
      summary: {
        datasetCount: 0,
        parameterSetCount: input.parameterSets.length,
        runCount: 0,
        validRunCount: 0,
        rankableSymbolCount: 0,
        warnings: [backtestCampaignReason("CAMPAIGN_EMPTY_DATASETS")],
      },
      symbolResults: [],
      parameterSetResults: [],
      runResults: [],
      ranking: [],
      executionEnabled: false,
      registryMutationAllowed: false,
      reviewOnly: true,
    };
  }
  if (!input.parameterSets.length) {
    return {
      status: "insufficient_data",
      summary: {
        datasetCount: input.datasets.length,
        parameterSetCount: 0,
        runCount: 0,
        validRunCount: 0,
        rankableSymbolCount: 0,
        warnings: [backtestCampaignReason("CAMPAIGN_EMPTY_PARAMETER_SETS")],
      },
      symbolResults: [],
      parameterSetResults: [],
      runResults: [],
      ranking: [],
      executionEnabled: false,
      registryMutationAllowed: false,
      reviewOnly: true,
    };
  }

  const runResults: BacktestCampaignRunResult[] = [];
  let runIdx = 0;
  for (const dataset of input.datasets) {
    for (const ps of input.parameterSets) {
      const runId = `campaign_${dataset.symbol}_${ps.parameterSetId}_${runIdx++}`;
      const reasons: BacktestCampaignReason[] = [];
      if (!dataset.candles.length) reasons.push(backtestCampaignReason("DATASET_EMPTY_CANDLES"));
      if (!dataset.symbolProfile) reasons.push(backtestCampaignReason("DATASET_MISSING_SYMBOL_PROFILE"));
      if (!dataset.candles.length || !dataset.symbolProfile) {
        runResults.push({
          runId,
          symbol: dataset.symbol,
          parameterSetId: ps.parameterSetId,
          datasetSplit: dataset.datasetSplit,
          status: "insufficient_data",
          rankScore: 0,
          tradeCount: 0,
          totalR: 0,
          averageR: null,
          winRate: null,
          profitFactor: null,
          maxDrawdownR: 0,
          ambiguousRate: 0,
          missedRate: 0,
          expiredRate: 0,
          diagnosticsCount: 0,
          severeDiagnosticsCount: 0,
          reasons,
          replay: null,
        });
        continue;
      }

      const replay =
        dataset.testOnlyReplayOverride ??
        runIfvgReplayBacktest({
          candles: dataset.candles,
          symbolProfile: dataset.symbolProfile,
          strategySettings: ps.strategySettings,
          tradePlanSettings: ps.tradePlanSettings,
          entrySlTpSettings: ps.entrySlTpSettings,
          replaySettings: ps.replaySettings,
          registryCompatibility: ps.registryCompatibility ?? input.defaultRegistryCompatibility ?? null,
          strategyId: ps.strategyId,
          parameterSetId: ps.parameterSetId,
          accountId: dataset.symbolProfile.accountId,
          canonicalSymbol: dataset.symbol,
          brokerSymbol: dataset.brokerSymbol ?? dataset.symbolProfile.brokerSymbol,
          timeframe: dataset.timeframe,
          evaluationMode: dataset.datasetSplit === "unknown" ? "unknown" : "historical_import",
          sourceName: dataset.sourceName,
          backtestSettings: {
            replayOnlyTradeReady: true,
            includeObserveCandidates: false,
            defaultScore: 82,
            useDecisionModelScore: true,
            allowNonReadyPlansWithPrices: false,
            decisionModelSettings: ps.decisionModelSettings,
          },
          accountGuardInput: {
            allowTradeReview: true,
            approvedParameterSetForAccount: true,
            spreadAllowed: true,
            operationalStatus: "TRADING_ALLOWED",
            ...input.defaultAccountGuardInput,
            ...ps.accountGuardInput,
          },
        });

      const tradeCount = replay.summary.replayedTradeCount;
      const diagnosticsCount = replay.diagnostics.length;
      const severeDiagnosticsCount = replay.diagnostics.filter((d) =>
        CAMPAIGN_SEVERE_REPLAY_DIAGNOSTICS.includes(d.code),
      ).length;
      const denominator = Math.max(1, tradeCount);
      const candidateDenominator = Math.max(1, replay.summary.candidateCount);
      const ambiguousRate = replay.summary.ambiguousCount / denominator;
      const missedRate = replay.summary.missedCount / candidateDenominator;
      const expiredRate = replay.summary.expiredCount / candidateDenominator;

      const status = toRunStatus(replay.status);
      if (status === "failed") reasons.push(backtestCampaignReason("RUN_FAILED"));
      if (status === "insufficient_data") reasons.push(backtestCampaignReason("RUN_INSUFFICIENT_DATA"));
      if (replay.status === "no_candidates") reasons.push(backtestCampaignReason("RUN_NO_CANDIDATES"));
      if (tradeCount === 0) reasons.push(backtestCampaignReason("RUN_NO_TRADES"));
      if (severeDiagnosticsCount > 0) reasons.push(backtestCampaignReason("SEVERE_DIAGNOSTICS"));
      if (tradeCount < input.campaignSettings.minTradesForRanking) reasons.push(backtestCampaignReason("LOW_SAMPLE_SIZE"));

      const run: BacktestCampaignRunResult = {
        runId,
        symbol: dataset.symbol,
        parameterSetId: ps.parameterSetId,
        datasetSplit: dataset.datasetSplit,
        status,
        rankScore: 0,
        tradeCount,
        totalR: replay.summary.totalR,
        averageR: replay.summary.averageR,
        winRate: replay.summary.winRate,
        profitFactor: replay.summary.profitFactor,
        maxDrawdownR: replay.summary.maxDrawdownR,
        ambiguousRate,
        missedRate,
        expiredRate,
        diagnosticsCount,
        severeDiagnosticsCount,
        reasons,
        replay,
      };
      run.rankScore = runRankScore(run, input.campaignSettings);
      runResults.push(run);
    }
  }

  const validRunCount = runResults.filter((r) => r.tradeCount > 0 && r.status !== "failed").length;
  const symbolMap = new Map<string, BacktestCampaignRunResult[]>();
  const psMap = new Map<string, BacktestCampaignRunResult[]>();
  for (const run of runResults) {
    const sr = symbolMap.get(run.symbol) ?? [];
    sr.push(run);
    symbolMap.set(run.symbol, sr);
    const pr = psMap.get(run.parameterSetId) ?? [];
    pr.push(run);
    psMap.set(run.parameterSetId, pr);
  }

  const symbolResults: BacktestCampaignSymbolResult[] = Array.from(symbolMap.entries()).map(([symbol, runs]) => ({
    symbol,
    ...aggregateEntity(symbol, runs, input.campaignSettings),
  }));
  const parameterSetResults: BacktestCampaignParameterSetResult[] = Array.from(psMap.entries()).map(
    ([parameterSetId, runs]) => ({
      parameterSetId,
      ...aggregateEntity(parameterSetId, runs, input.campaignSettings),
    }),
  );
  const ranking = symbolResults
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .map((x, i) => ({
      rank: i + 1,
      symbol: x.symbol,
      recommendation: x.recommendation,
      quality: x.quality,
      score: x.rankScore,
      tradeCount: x.tradeCount,
      splitsCovered: x.splitsCovered,
    }));

  const rankableSymbolCount = symbolResults.filter((r) => r.recommendation !== "not_rankable").length;
  if (runResults.some((r) => r.reasons.length > 0)) warnings.push(backtestCampaignReason("LOW_SAMPLE_SIZE"));
  const status: BacktestCampaignStatus =
    runResults.length === 0
      ? "no_valid_runs"
      : validRunCount === 0
        ? "no_valid_runs"
        : runResults.some((r) => r.status === "failed")
          ? "completed_with_warnings"
          : runResults.some((r) => r.reasons.length > 0)
            ? "completed_with_warnings"
            : "completed";

  return {
    status,
    summary: {
      datasetCount: input.datasets.length,
      parameterSetCount: input.parameterSets.length,
      runCount: runResults.length,
      validRunCount,
      rankableSymbolCount,
      warnings,
    },
    symbolResults,
    parameterSetResults,
    runResults,
    ranking,
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
  };
}
