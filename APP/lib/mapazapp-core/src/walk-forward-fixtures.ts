import type { BacktestCampaignResult, BacktestCampaignRunResult } from "./backtest-campaign-types";

/** Synthetic campaign shell for walk-forward tests — only `runResults` are consumed by `evaluateWalkForward`. */
export function walkForwardMinimalCampaign(runResults: BacktestCampaignRunResult[]): BacktestCampaignResult {
  const parameterSetIds = [...new Set(runResults.map((r) => r.parameterSetId))];
  const symbols = [...new Set(runResults.map((r) => r.symbol))];
  return {
    status: "completed",
    summary: {
      datasetCount: 0,
      parameterSetCount: parameterSetIds.length,
      runCount: runResults.length,
      validRunCount: runResults.length,
      rankableSymbolCount: symbols.length,
      warnings: [],
    },
    symbolResults: [],
    parameterSetResults: [],
    runResults,
    ranking: [],
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
  };
}

export function wfSyntheticRun(
  partial: Partial<BacktestCampaignRunResult> &
    Pick<BacktestCampaignRunResult, "symbol" | "parameterSetId" | "datasetSplit">,
): BacktestCampaignRunResult {
  return {
    runId: partial.runId ?? `wf-${partial.parameterSetId}-${partial.symbol}-${partial.datasetSplit}`,
    symbol: partial.symbol,
    parameterSetId: partial.parameterSetId,
    datasetSplit: partial.datasetSplit,
    status: partial.status ?? "completed",
    rankScore: partial.rankScore ?? 50,
    tradeCount: partial.tradeCount ?? 10,
    totalR: partial.totalR ?? 5,
    averageR: partial.averageR ?? 0.5,
    winRate: partial.winRate ?? 0.55,
    profitFactor: partial.profitFactor ?? 1.2,
    maxDrawdownR: partial.maxDrawdownR ?? 2,
    ambiguousRate: partial.ambiguousRate ?? 0,
    missedRate: partial.missedRate ?? 0,
    expiredRate: partial.expiredRate ?? 0,
    diagnosticsCount: partial.diagnosticsCount ?? 0,
    severeDiagnosticsCount: partial.severeDiagnosticsCount ?? 0,
    reasons: partial.reasons ?? [],
    replay: partial.replay ?? null,
  };
}

/** Train strong / validation weak — expect high overfit risk. */
export function walkForwardFixtureOverfitTrainDominates(): BacktestCampaignResult {
  const ps = "PS_OVERFIT";
  const sym = "EURUSD";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 92,
      tradeCount: 10,
      averageR: 0.85,
      profitFactor: 1.4,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 8,
      tradeCount: 10,
      averageR: 0.08,
      profitFactor: 1.05,
      maxDrawdownR: 2.5,
    }),
  ]);
}

/** Train + validation good, forward missing — exploration / unproven out-of-sample. */
export function walkForwardFixtureGoodTrainValNoForward(): BacktestCampaignResult {
  const ps = "PS_NO_FWD";
  const sym = "XAUUSD";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 62,
      tradeCount: 10,
      averageR: 0.35,
      profitFactor: 1.15,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 58,
      tradeCount: 10,
      averageR: 0.32,
      profitFactor: 1.1,
      maxDrawdownR: 2.2,
    }),
  ]);
}

/** Train + validation + forward stable — candidate for more testing only. */
export function walkForwardFixtureStableThreeSplits(): BacktestCampaignResult {
  const ps = "PS_STABLE";
  const sym = "NAS100";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 60,
      tradeCount: 10,
      averageR: 0.3,
      profitFactor: 1.12,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 58,
      tradeCount: 10,
      averageR: 0.28,
      profitFactor: 1.1,
      maxDrawdownR: 2.1,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "forward",
      rankScore: 56,
      tradeCount: 10,
      averageR: 0.26,
      profitFactor: 1.08,
      maxDrawdownR: 2.2,
    }),
  ]);
}

/** Validation fails expectancy — rejected. */
export function walkForwardFixtureValidationRejected(): BacktestCampaignResult {
  const ps = "PS_BAD_VAL";
  const sym = "USDJPY";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 70,
      tradeCount: 10,
      averageR: 0.4,
      profitFactor: 1.2,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 20,
      tradeCount: 10,
      averageR: -0.6,
      profitFactor: 0.5,
      maxDrawdownR: 4,
    }),
  ]);
}

/** High rank-score variance across splits — unstable (same PS, one symbol). */
export function walkForwardFixtureHighVarianceUnstable(): BacktestCampaignResult {
  const ps = "PS_VAR";
  const sym = "BTCUSD";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 72,
      tradeCount: 10,
      averageR: 0.3,
      profitFactor: 1.15,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 66,
      tradeCount: 10,
      averageR: 0.28,
      profitFactor: 1.12,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "forward",
      rankScore: 14,
      tradeCount: 10,
      averageR: 0.25,
      profitFactor: 1.05,
      maxDrawdownR: 2.5,
    }),
  ]);
}

/** Mixed symbols: one stable slice, one high-variance slice — rolled up unstable. */
export function walkForwardFixtureMixedSymbolsUnstable(): BacktestCampaignResult {
  const ps = "PS_MIXED";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: "EURUSD",
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 58,
      tradeCount: 10,
      averageR: 0.25,
      profitFactor: 1.1,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: "EURUSD",
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 56,
      tradeCount: 10,
      averageR: 0.24,
      profitFactor: 1.08,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: "EURUSD",
      parameterSetId: ps,
      datasetSplit: "forward",
      rankScore: 54,
      tradeCount: 10,
      averageR: 0.23,
      profitFactor: 1.06,
      maxDrawdownR: 2.1,
    }),
    wfSyntheticRun({
      symbol: "GBPUSD",
      parameterSetId: ps,
      datasetSplit: "train",
      rankScore: 74,
      tradeCount: 10,
      averageR: 0.3,
      profitFactor: 1.12,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: "GBPUSD",
      parameterSetId: ps,
      datasetSplit: "validation",
      rankScore: 68,
      tradeCount: 10,
      averageR: 0.28,
      profitFactor: 1.1,
      maxDrawdownR: 2,
    }),
    wfSyntheticRun({
      symbol: "GBPUSD",
      parameterSetId: ps,
      datasetSplit: "forward",
      rankScore: 12,
      tradeCount: 10,
      averageR: 0.26,
      profitFactor: 1.04,
      maxDrawdownR: 2.4,
    }),
  ]);
}

/** Only unknown split rows — not rankable when exploration flag is off. */
export function walkForwardFixtureUnknownOnly(): BacktestCampaignResult {
  const ps = "PS_UNK";
  const sym = "EURUSD";
  return walkForwardMinimalCampaign([
    wfSyntheticRun({
      symbol: sym,
      parameterSetId: ps,
      datasetSplit: "unknown",
      rankScore: 55,
      tradeCount: 10,
      averageR: 0.2,
      profitFactor: 1.05,
      maxDrawdownR: 2,
    }),
  ]);
}
