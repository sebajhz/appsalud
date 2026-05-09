import type { BacktestCampaignRunResult } from "./backtest-campaign-types";
import { createDefaultParameterGridSettingsForTests } from "./parameter-grid-settings";
import { runParameterGrid } from "./parameter-grid-runner";
import type { ParameterGridCandidate } from "./parameter-grid-types";
import { walkForwardReason } from "./walk-forward-reasons";
import type {
  WalkForwardInput,
  WalkForwardOverfitRisk,
  WalkForwardOverfitRiskLevel,
  WalkForwardParameterSetResult,
  WalkForwardQuality,
  WalkForwardReason,
  WalkForwardReasonCode,
  WalkForwardRecommendation,
  WalkForwardResult,
  WalkForwardSettings,
  WalkForwardSplitRequirements,
  WalkForwardSplitResult,
  WalkForwardStabilitySummary,
  WalkForwardStatus,
  WalkForwardSymbolResult,
} from "./walk-forward-types";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

function finitePf(pf: number | null): number {
  if (pf == null || !Number.isFinite(pf)) return 0;
  return pf === Number.POSITIVE_INFINITY ? 1000 : pf;
}

function mapRun(r: BacktestCampaignRunResult): WalkForwardSplitResult {
  return {
    parameterSetId: r.parameterSetId,
    symbol: r.symbol,
    datasetSplit: r.datasetSplit,
    rankScore: r.rankScore,
    tradeCount: r.tradeCount,
    averageR: r.averageR,
    profitFactor: r.profitFactor,
    maxDrawdownR: r.maxDrawdownR,
    winRate: r.winRate,
    totalR: r.totalR,
  };
}

function collectSplitResults(input: WalkForwardInput): WalkForwardSplitResult[] {
  const out: WalkForwardSplitResult[] = [];
  if (input.parameterGridResult) {
    for (const c of input.parameterGridResult.candidates) {
      if (!c.campaignResult) continue;
      for (const r of c.campaignResult.runResults) {
        out.push(mapRun(r));
      }
    }
    return out;
  }
  if (input.campaignResult) {
    for (const r of input.campaignResult.runResults) {
      out.push(mapRun(r));
    }
    return out;
  }
  return out;
}

function rowsForTrain(rows: WalkForwardSplitResult[]): WalkForwardSplitResult[] {
  return rows.filter((r) => r.datasetSplit === "train" || r.datasetSplit === "full");
}

function rowsForValidation(rows: WalkForwardSplitResult[]): WalkForwardSplitResult[] {
  return rows.filter((r) => r.datasetSplit === "validation" || r.datasetSplit === "full");
}

function rowsForForward(rows: WalkForwardSplitResult[]): WalkForwardSplitResult[] {
  return rows.filter((r) => r.datasetSplit === "forward" || r.datasetSplit === "full");
}

function aggregateBucket(
  rows: WalkForwardSplitResult[],
  pseudoSplit: WalkForwardSplitResult["datasetSplit"],
  parameterSetId: string,
  symbol: string,
): WalkForwardSplitResult | null {
  if (rows.length === 0) return null;
  const wTrades = rows.reduce((a, r) => a + Math.max(0, r.tradeCount), 0);
  const weight = Math.max(1, wTrades);
  const avg = (fn: (r: WalkForwardSplitResult) => number) =>
    wTrades > 0
      ? rows.reduce((a, r) => a + fn(r) * Math.max(0, r.tradeCount), 0) / wTrades
      : rows.reduce((a, r) => a + fn(r), 0) / rows.length;

  const rankScore =
    wTrades > 0
      ? rows.reduce((a, r) => a + r.rankScore * Math.max(0, r.tradeCount), 0) / wTrades
      : rows.reduce((a, r) => a + r.rankScore, 0) / rows.length;

  return {
    parameterSetId,
    symbol,
    datasetSplit: pseudoSplit,
    rankScore: Number(rankScore.toFixed(4)),
    tradeCount: rows.reduce((a, r) => a + r.tradeCount, 0),
    averageR: Number(avg((r) => r.averageR ?? 0).toFixed(4)),
    profitFactor: (() => {
      const sumW = rows.reduce((a, r) => a + Math.max(0, r.tradeCount), 0);
      if (sumW <= 0) {
        const pfs = rows.map((r) => finitePf(r.profitFactor));
        return pfs.length ? Number((pfs.reduce((a, b) => a + b, 0) / pfs.length).toFixed(4)) : null;
      }
      let n = 0;
      for (const r of rows) {
        n += finitePf(r.profitFactor) * Math.max(0, r.tradeCount);
      }
      return Number((n / sumW).toFixed(4));
    })(),
    maxDrawdownR: Number(Math.max(...rows.map((r) => r.maxDrawdownR)).toFixed(4)),
    winRate:
      wTrades > 0
        ? Number(
            (
              rows.reduce((a, r) => a + (r.winRate ?? 0) * Math.max(0, r.tradeCount), 0) / wTrades
            ).toFixed(4),
          )
        : null,
    totalR: Number(rows.reduce((a, r) => a + r.totalR, 0).toFixed(4)),
  };
}

function classifyQuality(rec: WalkForwardRecommendation): WalkForwardQuality {
  switch (rec) {
    case "candidate_for_more_testing":
      return "moderate";
    case "promising_but_unproven":
      return "weak";
    case "needs_more_data":
    case "not_rankable":
      return "insufficient";
    case "unstable":
    case "overfit_risk":
      return "poor";
    case "rejected":
      return "poor";
    default:
      return "insufficient";
  }
}

function recSeverity(r: WalkForwardRecommendation): number {
  switch (r) {
    case "rejected":
    case "not_rankable":
      return 100;
    case "overfit_risk":
    case "unstable":
      return 80;
    case "needs_more_data":
      return 50;
    case "promising_but_unproven":
      return 30;
    case "candidate_for_more_testing":
      return 10;
    default:
      return 0;
  }
}

function worseRec(a: WalkForwardRecommendation, b: WalkForwardRecommendation): WalkForwardRecommendation {
  return recSeverity(a) >= recSeverity(b) ? a : b;
}

function buildStability(
  train: WalkForwardSplitResult | null,
  val: WalkForwardSplitResult | null,
  fwd: WalkForwardSplitResult | null,
  settings: WalkForwardSettings,
): WalkForwardStabilitySummary {
  const scores = [train, val, fwd].filter(Boolean).map((x) => x!.rankScore);
  const varac = Number(stddev(scores).toFixed(4));
  const atr = train?.averageR ?? null;
  const av = val?.averageR ?? null;
  const af = fwd?.averageR ?? null;
  const dropTv =
    atr != null && av != null ? Number((atr - av).toFixed(4)) : null;
  const dropVf =
    av != null && af != null ? Number((av - af).toFixed(4)) : null;
  const dds = [train, val, fwd].filter(Boolean).map((x) => x!.maxDrawdownR);
  const wrs = [train, val, fwd].filter(Boolean).map((x) => x!.winRate).filter((x) => x != null) as number[];
  const winSpread = wrs.length >= 2 ? Number((Math.max(...wrs) - Math.min(...wrs)).toFixed(4)) : null;
  const trades = (train?.tradeCount ?? 0) + (val?.tradeCount ?? 0) + (fwd?.tradeCount ?? 0);
  return {
    rankScoreVarianceAcrossSplits: varac,
    averageRDropTrainToValidation: dropTv,
    averageRDropValidationToForward: dropVf,
    maxDrawdownAcrossSplits: dds.length ? Math.max(...dds) : 0,
    winRateSpread: winSpread,
    sampleSizeAdequate: trades >= settings.minTotalTrades,
  };
}

function buildOverfitRisk(
  level: WalkForwardOverfitRiskLevel,
  codes: WalkForwardReasonCode[],
  explanation: string,
): WalkForwardOverfitRisk {
  return { level, reasonCodes: [...new Set(codes)], explanation };
}

function evaluateSymbolSlice(
  parameterSetId: string,
  strategyId: string,
  symbol: string,
  rows: WalkForwardSplitResult[],
  req: WalkForwardSplitRequirements,
  st: WalkForwardSettings,
): WalkForwardSymbolResult {
  const reasons: WalkForwardReason[] = [];
  const onlyUnknown = rows.length > 0 && rows.every((r) => r.datasetSplit === "unknown");

  if (onlyUnknown && !st.allowUnknownSplitForExplorationOnly) {
    const stability = buildStability(null, null, null, st);
    return {
      symbol,
      parameterSetId,
      splitsPresent: ["unknown"],
      splitAggregates: { train: null, validation: null, forward: null },
      recommendation: "not_rankable",
      quality: "insufficient",
      overfitRisk: buildOverfitRisk("unknown", ["WF_UNKNOWN_SPLIT_ONLY"], "Only unknown split rows; cannot walk-forward gate."),
      stability,
      reasons: [walkForwardReason("WF_UNKNOWN_SPLIT_ONLY", "Unknown split only", { parameterSetId, symbol })],
    };
  }

  if (onlyUnknown && st.allowUnknownSplitForExplorationOnly) {
    const agg = aggregateBucket(rows, "unknown", parameterSetId, symbol);
    const stability = buildStability(agg, null, null, st);
    return {
      symbol,
      parameterSetId,
      splitsPresent: ["unknown"],
      splitAggregates: { train: null, validation: null, forward: null },
      recommendation: "promising_but_unproven",
      quality: "weak",
      overfitRisk: buildOverfitRisk("medium", ["WF_UNKNOWN_SPLIT_ONLY"], "Exploration-only unknown split; no train/validation/forward discipline."),
      stability,
      reasons: [walkForwardReason("WF_UNKNOWN_SPLIT_ONLY", "Unknown split treated as exploration only", { parameterSetId, symbol })],
    };
  }

  const hasFullOnly =
    rows.length === 1 &&
    rows[0]!.datasetSplit === "full" &&
    (req.requireTrain || req.requireValidation || req.requireForward);

  const train = aggregateBucket(rowsForTrain(rows), "train", parameterSetId, symbol);
  const val = aggregateBucket(rowsForValidation(rows), "validation", parameterSetId, symbol);
  const fwd = aggregateBucket(rowsForForward(rows), "forward", parameterSetId, symbol);

  const splitsPresent = [...new Set(rows.map((r) => r.datasetSplit))];
  const stability = buildStability(train, val, fwd, st);

  let overfitLevel: WalkForwardOverfitRiskLevel = "low";
  const overfitCodes: WalkForwardReasonCode[] = [];
  let overfitExplain = "No strong overfit pattern detected in v1 heuristics.";

  if (hasFullOnly) {
    reasons.push(walkForwardReason("WF_FULL_SPLIT_SUBSTITUTE_NOTE", "Full split row substitutes into train/validation/forward buckets — interpret cautiously.", { parameterSetId, symbol }));
  }

  if (req.requireTrain && !train) {
    reasons.push(walkForwardReason("WF_MISSING_TRAIN", "Required train split not found", { parameterSetId, symbol }));
  }
  if (req.requireValidation && !val) {
    reasons.push(walkForwardReason("WF_MISSING_VALIDATION", "Required validation split not found", { parameterSetId, symbol }));
  }
  if (req.requireForward && !fwd) {
    reasons.push(walkForwardReason("WF_MISSING_FORWARD", "Required forward split not found", { parameterSetId, symbol }));
  }

  if (train && train.tradeCount < st.minTradesTrain) {
    reasons.push(walkForwardReason("WF_LOW_TRADES_TRAIN", `Train trades ${train.tradeCount} < ${st.minTradesTrain}`, { parameterSetId, symbol }));
  }
  if (val && val.tradeCount < st.minTradesValidation) {
    reasons.push(walkForwardReason("WF_LOW_TRADES_VALIDATION", `Validation trades ${val.tradeCount} < ${st.minTradesValidation}`, { parameterSetId, symbol }));
  }
  if (fwd && fwd.tradeCount < st.minTradesForward) {
    reasons.push(walkForwardReason("WF_LOW_TRADES_FORWARD", `Forward trades ${fwd.tradeCount} < ${st.minTradesForward}`, { parameterSetId, symbol }));
  }

  const totalTrades = (train?.tradeCount ?? 0) + (val?.tradeCount ?? 0) + (fwd?.tradeCount ?? 0);
  if (totalTrades < st.minTotalTrades) {
    reasons.push(walkForwardReason("WF_LOW_TOTAL_TRADES", `Total trades ${totalTrades} < ${st.minTotalTrades}`, { parameterSetId, symbol }));
  }

  if (train && val && train.tradeCount >= st.minTradesTrain && val.tradeCount >= st.minTradesValidation) {
    const ratio = train.rankScore / Math.max(0.01, val.rankScore);
    if (ratio > st.maxTrainToValidationRankScoreRatio) {
      overfitCodes.push("WF_TRAIN_DOMINATES_VALIDATION");
      overfitLevel = "high";
      overfitExplain = "Train rank score materially exceeds validation — possible overfit.";
      reasons.push(
        walkForwardReason("WF_TRAIN_DOMINATES_VALIDATION", `Train/val rank ratio ${ratio.toFixed(2)} > ${st.maxTrainToValidationRankScoreRatio}`, { parameterSetId, symbol }),
      );
    }
    const drop = (train.averageR ?? 0) - (val.averageR ?? 0);
    if (drop > st.maxAllowedTrainValidationAvgRDrop) {
      overfitCodes.push("WF_TRAIN_DOMINATES_VALIDATION");
      overfitLevel = overfitLevel === "high" ? "high" : "medium";
      overfitExplain = "Train averageR much higher than validation.";
      reasons.push(
        walkForwardReason("WF_TRAIN_DOMINATES_VALIDATION", `Train-validation avgR drop ${drop.toFixed(3)}`, { parameterSetId, symbol }),
      );
    }
  }

  if (val && fwd && val.tradeCount >= st.minTradesValidation && fwd.tradeCount >= st.minTradesForward) {
    const dropVf = (val.averageR ?? 0) - (fwd.averageR ?? 0);
    if (dropVf > st.maxAllowedValidationForwardAvgRDrop) {
      overfitCodes.push("WF_VALIDATION_DOMINATES_FORWARD");
      overfitLevel = overfitLevel === "high" ? "high" : "medium";
      overfitExplain = "Validation stronger than forward — degradation out-of-sample.";
      reasons.push(walkForwardReason("WF_VALIDATION_DOMINATES_FORWARD", `Validation-forward avgR drop ${dropVf.toFixed(3)}`, { parameterSetId, symbol }));
    }
  }

  if (val) {
    if ((val.averageR ?? -1) < st.minAverageRValidation) {
      reasons.push(walkForwardReason("WF_VALIDATION_NEGATIVE_EXPECTANCY", "Validation averageR below threshold", { parameterSetId, symbol }));
    }
    if (finitePf(val.profitFactor) < st.minProfitFactorValidation) {
      reasons.push(walkForwardReason("WF_VALIDATION_METRICS_FAIL", "Validation profit factor below threshold", { parameterSetId, symbol }));
    }
    if (val.maxDrawdownR > st.maxDrawdownR) {
      reasons.push(walkForwardReason("WF_VALIDATION_METRICS_FAIL", "Validation max drawdown exceeds threshold", { parameterSetId, symbol }));
    }
  }

  if (fwd) {
    if (finitePf(fwd.profitFactor) < st.minProfitFactorValidation * 0.95) {
      reasons.push(walkForwardReason("WF_FORWARD_METRICS_FAIL", "Forward profit factor weak vs validation threshold", { parameterSetId, symbol }));
    }
    if (fwd.maxDrawdownR > st.maxDrawdownR + 0.5) {
      reasons.push(walkForwardReason("WF_FORWARD_METRICS_FAIL", "Forward drawdown elevated", { parameterSetId, symbol }));
    }
  }

  const scoreList = [train?.rankScore, val?.rankScore, fwd?.rankScore].filter((x) => x != null) as number[];
  const highVariance = stddev(scoreList) >= st.highVarianceRankScoreStdDev && scoreList.length >= 2;
  if (highVariance) {
    reasons.push(walkForwardReason("WF_HIGH_VARIANCE_SPLITS", "High rank score variance across splits", { parameterSetId, symbol }));
  }

  const valFails =
    val != null &&
    ((val.averageR ?? -999) < st.minAverageRValidation ||
      finitePf(val.profitFactor) < st.minProfitFactorValidation ||
      val.maxDrawdownR > st.maxDrawdownR);

  let recommendation: WalkForwardRecommendation = "not_rankable";

  if (req.requireTrain && !train) {
    recommendation = "needs_more_data";
  } else if (req.requireValidation && !val) {
    recommendation = "needs_more_data";
  } else if (valFails) {
    recommendation = "rejected";
  } else if (overfitLevel === "high") {
    recommendation = "overfit_risk";
  } else if (highVariance) {
    recommendation = "unstable";
  } else if (req.requireForward && !fwd && train && val) {
    recommendation = "promising_but_unproven";
  } else if (req.requireForward && !fwd) {
    recommendation = "needs_more_data";
  } else if (totalTrades < st.minTotalTrades) {
    recommendation = "needs_more_data";
  } else if (overfitLevel === "medium") {
    recommendation = "overfit_risk";
  } else if (train && val && fwd) {
    recommendation = "candidate_for_more_testing";
  } else if (train && val) {
    recommendation = "candidate_for_more_testing";
  } else {
    recommendation = "promising_but_unproven";
  }

  const overfitRisk = buildOverfitRisk(overfitLevel, overfitCodes, overfitExplain);

  return {
    symbol,
    parameterSetId,
    splitsPresent,
    splitAggregates: { train, validation: val, forward: fwd },
    recommendation,
    quality: classifyQuality(recommendation),
    overfitRisk,
    stability,
    reasons,
  };
}

function mergeOverfitRisk(a: WalkForwardOverfitRisk, b: WalkForwardOverfitRisk): WalkForwardOverfitRisk {
  const rank: Record<WalkForwardOverfitRiskLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
  const level = rank[a.level] >= rank[b.level] ? a.level : b.level;
  const reasonCodes = [...new Set([...a.reasonCodes, ...b.reasonCodes])];
  const explanation = rank[a.level] >= rank[b.level] ? a.explanation : b.explanation;
  return { level, reasonCodes, explanation };
}

function mergeStability(a: WalkForwardStabilitySummary, b: WalkForwardStabilitySummary): WalkForwardStabilitySummary {
  return {
    rankScoreVarianceAcrossSplits: Math.max(a.rankScoreVarianceAcrossSplits, b.rankScoreVarianceAcrossSplits),
    averageRDropTrainToValidation: null,
    averageRDropValidationToForward: null,
    maxDrawdownAcrossSplits: Math.max(a.maxDrawdownAcrossSplits, b.maxDrawdownAcrossSplits),
    winRateSpread: Math.max(a.winRateSpread ?? 0, b.winRateSpread ?? 0) || null,
    sampleSizeAdequate: a.sampleSizeAdequate && b.sampleSizeAdequate,
  };
}

export function evaluateWalkForward(input: WalkForwardInput): WalkForwardResult {
  const reasons: WalkForwardReason[] = [];
  const safety = {
    reviewOnly: true as const,
    executionEnabled: false as const,
    registryMutationAllowed: false as const,
    autoApprovalEnabled: false as const,
  };

  const fail = (
    status: WalkForwardStatus,
    splitResults: WalkForwardSplitResult[],
    msg: WalkForwardReason,
  ): WalkForwardResult => {
    reasons.push(msg);
    return {
      status,
      parameterSetResults: [],
      splitResults,
      overfitRisk: buildOverfitRisk("unknown", [msg.code], msg.message),
      stability: {
        rankScoreVarianceAcrossSplits: 0,
        averageRDropTrainToValidation: null,
        averageRDropValidationToForward: null,
        maxDrawdownAcrossSplits: 0,
        winRateSpread: null,
        sampleSizeAdequate: false,
      },
      reasons,
      ...safety,
    };
  };

  let splitResults = collectSplitResults(input);

  if (
    splitResults.length === 0 &&
    input.datasets?.length &&
    input.parameterSets?.length &&
    input.campaignSettings
  ) {
    const candidates: ParameterGridCandidate[] = input.parameterSets.map((parameterSet) => ({ parameterSet }));
    const grid = runParameterGrid({
      datasets: input.datasets,
      candidates,
      campaignSettings: input.campaignSettings,
      gridSettings: input.gridSettings ?? createDefaultParameterGridSettingsForTests(),
      defaultAccountGuardInput: input.defaultAccountGuardInput,
      defaultRegistryCompatibility: input.defaultRegistryCompatibility,
    });
    if (grid.status === "no_valid_datasets" || grid.status === "no_valid_parameter_sets" || grid.status === "failed") {
      return fail("failed", [], walkForwardReason("WF_INTERNAL_GRID_FAILED", "Internal parameter grid did not yield runs"));
    }
    for (const c of grid.candidates) {
      if (!c.campaignResult) continue;
      for (const r of c.campaignResult.runResults) {
        splitResults.push(mapRun(r));
      }
    }
  }

  if (!input.parameterGridResult && !input.campaignResult && splitResults.length === 0) {
    return fail("insufficient_data", [], walkForwardReason("WF_NO_INPUT", "Provide parameterGridResult, campaignResult, or datasets+parameterSets+campaignSettings"));
  }

  if (splitResults.length === 0) {
    return fail("no_valid_parameter_sets", [], walkForwardReason("WF_EMPTY_RUNS", "No campaign run rows to evaluate"));
  }

  const groups = new Map<string, WalkForwardSplitResult[]>();
  for (const row of splitResults) {
    const k = `${row.parameterSetId}\x1f${row.symbol}`;
    const g = groups.get(k) ?? [];
    g.push(row);
    groups.set(k, g);
  }

  const strategyByPs = new Map<string, string>();
  for (const row of splitResults) {
    if (!strategyByPs.has(row.parameterSetId)) strategyByPs.set(row.parameterSetId, "MZP_IFVG_ZONE_REACTION_V1");
  }
  for (const ps of input.parameterSets ?? []) {
    strategyByPs.set(ps.parameterSetId, ps.strategyId);
  }
  if (input.parameterGridResult) {
    for (const c of input.parameterGridResult.candidates) {
      strategyByPs.set(c.parameterSetId, c.strategyId);
    }
  }

  const symbolResults: WalkForwardSymbolResult[] = [];
  for (const [key, rows] of groups) {
    const [parameterSetId, symbol] = key.split("\x1f") as [string, string];
    const strategyId = strategyByPs.get(parameterSetId) ?? "MZP_IFVG_ZONE_REACTION_V1";
    symbolResults.push(evaluateSymbolSlice(parameterSetId, strategyId, symbol, rows, input.splitRequirements, input.settings));
  }

  const byPs = new Map<string, WalkForwardSymbolResult[]>();
  for (const sr of symbolResults) {
    const g = byPs.get(sr.parameterSetId) ?? [];
    g.push(sr);
    byPs.set(sr.parameterSetId, g);
  }

  const parameterSetResults: WalkForwardParameterSetResult[] = [];
  let globalOverfit = buildOverfitRisk("low", [], "Aggregate");
  let globalStability: WalkForwardStabilitySummary | null = null;

  for (const [psId, syms] of byPs) {
    let rec: WalkForwardRecommendation = "candidate_for_more_testing";
    for (const s of syms) {
      rec = worseRec(rec, s.recommendation);
    }
    let or: WalkForwardOverfitRisk = syms[0]!.overfitRisk;
    let st: WalkForwardStabilitySummary = syms[0]!.stability;
    const pr: WalkForwardReason[] = [];
    for (const s of syms) {
      or = mergeOverfitRisk(or, s.overfitRisk);
      st = mergeStability(st, s.stability);
      pr.push(...s.reasons);
    }
    globalOverfit = mergeOverfitRisk(globalOverfit, or);
    globalStability = globalStability ? mergeStability(globalStability, st) : st;
    parameterSetResults.push({
      parameterSetId: psId,
      strategyId: strategyByPs.get(psId) ?? "MZP_IFVG_ZONE_REACTION_V1",
      symbolResults: syms,
      recommendation: rec,
      quality: classifyQuality(rec),
      overfitRisk: or,
      stability: st,
      reasons: pr,
    });
  }

  parameterSetResults.sort((a, b) => a.parameterSetId.localeCompare(b.parameterSetId));

  let status: WalkForwardStatus = "completed";
  const anyMissing =
    symbolResults.some((s) =>
      (input.splitRequirements.requireTrain && !s.splitAggregates.train) ||
      (input.splitRequirements.requireValidation && !s.splitAggregates.validation) ||
      (input.splitRequirements.requireForward && !s.splitAggregates.forward),
    );
  if (anyMissing) {
    status = "missing_required_splits";
  } else if (
    symbolResults.some(
      (s) =>
        s.recommendation === "needs_more_data" ||
        s.recommendation === "overfit_risk" ||
        s.recommendation === "unstable",
    )
  ) {
    status = "completed_with_warnings";
  }

  reasons.push(walkForwardReason("WF_OK", "Walk-forward evaluation completed"));

  return {
    status,
    parameterSetResults,
    splitResults,
    overfitRisk: globalOverfit,
    stability:
      globalStability ??
      ({
        rankScoreVarianceAcrossSplits: 0,
        averageRDropTrainToValidation: null,
        averageRDropValidationToForward: null,
        maxDrawdownAcrossSplits: 0,
        winRateSpread: null,
        sampleSizeAdequate: false,
      } satisfies WalkForwardStabilitySummary),
    reasons,
    ...safety,
  };
}
