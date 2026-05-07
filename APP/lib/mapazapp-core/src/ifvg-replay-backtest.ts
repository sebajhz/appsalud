/**
 * V2-04 — IFVG strategy replay backtest (pure core). Chains detection → trade plan → Entry/SL/TP → candle replay.
 */

import { atrAtIndex, calculateAtrSeries } from "./atr";
import type { BacktestTrade } from "./backtest-types";
import {
  calculateBacktestSummary,
  calculateProfitFactor,
  calculateTotalR,
  calculateWinRate,
} from "./backtest-metrics";
import type { Candle } from "./candle";
import { detectConfirmation } from "./confirmation-detector";
import { buildEntrySlTpPlan } from "./entry-sl-tp-model";
import type {
  IfvgReplayBacktestCandidateTrace,
  IfvgReplayBacktestInput,
  IfvgReplayBacktestResult,
  IfvgReplayBacktestSettings,
  IfvgReplayBacktestStatus,
  IfvgReplayBacktestSummary,
} from "./ifvg-replay-backtest-types";
import { ifvgReplayBacktestReason } from "./ifvg-replay-backtest-reasons";
import type { IfvgReplayBacktestDiagnostic, IfvgReplayBacktestReason } from "./ifvg-replay-backtest-types";
import type { BacktestRunId, BacktestTradeId } from "./ids";
import { detectRetest } from "./retest-detector";
import { simulateReplayTrade } from "./replay-trade-simulator";
import { detectIfvgZoneCandidates, type DetectIfvgZoneCandidatesResult } from "./strategy-detection";
import type { ZoneCandidate } from "./zone-candidate";
import { evaluateTradeReviewPlan } from "./trade-plan-evaluator";
import type { TradePlanInput } from "./trade-plan-types";
import { buildDisplacementAtBar, evaluateDecisionModel } from "./decision-model";
import { createDefaultDecisionModelSettingsForTests } from "./decision-model-settings";
import type { DecisionModelResult } from "./decision-model-types";
import { evaluateContextBias } from "./context-bias-engine";
import { createDefaultContextBiasSettingsForTests } from "./context-bias-settings";
import type { ContextBiasResult } from "./context-bias-types";

export function createDefaultIfvgReplayBacktestSettings(): IfvgReplayBacktestSettings {
  return {
    replayOnlyTradeReady: true,
    includeObserveCandidates: false,
    defaultScore: 82,
    useDecisionModelScore: true,
    allowNonReadyPlansWithPrices: false,
  };
}

/** Best-effort: FVG ids from `strategy-detection` look like `ifvg_fvg_{i}_{time}`. */
export function inferFvgCenterBarIndexFromSourceIfvgId(sourceIfvgId: string): number | null {
  const m = sourceIfvgId.match(/ifvg_fvg_(\d+)_/);
  if (m) return parseInt(m[1]!, 10);
  const m2 = sourceIfvgId.match(/^fvg_(\d+)_/);
  if (m2) return parseInt(m2[1]!, 10);
  return null;
}

function resolveRetestSearchStart(
  zone: ZoneCandidate,
  candleLen: number,
): {
  startSearch: number;
  inferredCenterBarIndex: number | null;
  diagnostic: "CANDIDATE_INDEX_UNAVAILABLE" | "CANDIDATE_INDEX_INFERRED_FROM_ID" | null;
} {
  const t = zone.candidateTiming;
  let inferredCenterBarIndex: number | null = t?.fvgMiddleIndex ?? null;
  let diagnostic: "CANDIDATE_INDEX_UNAVAILABLE" | "CANDIDATE_INDEX_INFERRED_FROM_ID" | null = null;

  let startSearch: number;
  if (t?.firstRetestSearchIndex != null) {
    startSearch = Math.max(0, Math.min(t.firstRetestSearchIndex, candleLen));
  } else if (t?.candidateCreatedIndex != null) {
    startSearch = Math.max(0, Math.min(t.candidateCreatedIndex + 1, candleLen));
  } else {
    const inferred = inferFvgCenterBarIndexFromSourceIfvgId(zone.sourceIfvgId);
    if (inferred != null) {
      inferredCenterBarIndex = inferred;
      diagnostic = "CANDIDATE_INDEX_INFERRED_FROM_ID";
      const cap = candleLen > 0 ? candleLen - 1 : 0;
      startSearch = Math.max(0, Math.min(inferred + 1, cap));
    } else {
      diagnostic = "CANDIDATE_INDEX_UNAVAILABLE";
      startSearch = 0;
    }
  }

  if (t?.candidateCreatedIndex != null && startSearch < t.candidateCreatedIndex + 1) {
    startSearch = Math.max(0, Math.min(t.candidateCreatedIndex + 1, candleLen));
  }

  return { startSearch, inferredCenterBarIndex, diagnostic };
}

function findRetestConfirmIndices(
  candles: Candle[],
  zone: ZoneCandidate,
  startSearch: number,
  strategySettings: import("./strategy-settings").IfvgStrategySettings,
  atrSeries: (number | null)[],
): { retestIdx: number; confirmIdx: number } | null {
  const mode = strategySettings.zone.retestMode;
  for (let j = startSearch; j < candles.length; j++) {
    const retest = detectRetest(
      candles[j]!,
      zone.zoneLow,
      zone.zoneHigh,
      zone.midpoint,
      zone.direction,
      mode,
    );
    if (!retest.retested) continue;
    for (let k = j; k < candles.length; k++) {
      const prev = k > 0 ? candles[k - 1] : undefined;
      const atr = atrAtIndex(atrSeries, k) ?? atrAtIndex(atrSeries, j);
      const conf = detectConfirmation(
        candles[k]!,
        prev,
        zone.direction,
        zone.midpoint,
        atr,
        strategySettings.confirmation,
      );
      if (conf.confirmed) return { retestIdx: j, confirmIdx: k };
    }
  }
  return null;
}

function replaySliceFromPlanReady(candles: Candle[], planReadyIndex: number): Candle[] {
  return candles.slice(planReadyIndex);
}

function planReplayEligible(
  plan: import("./trade-plan-types").TradeReviewPlan,
  score: number,
  bs: IfvgReplayBacktestSettings,
): boolean {
  if (bs.minScore != null && score < bs.minScore) return false;
  if (plan.status === "OBSERVE" && !bs.includeObserveCandidates) return false;
  if (plan.stopLoss == null || plan.takeProfit == null) return false;
  if (bs.replayOnlyTradeReady) {
    return plan.status === "TRADE_READY" && plan.reviewReady;
  }
  if (plan.status === "NO_TRADE") return false;
  if (plan.reviewReady) return true;
  return bs.allowNonReadyPlansWithPrices;
}

function replayToBacktestTrade(params: {
  replay: import("./replay-trade-types").ReplayTradeResult;
  zone: ZoneCandidate;
  runId: string;
  tradeIdx: number;
  strategyId: import("./ids").StrategyId;
  parameterSetId: import("./ids").ParameterSetId;
  canonicalSymbol: string;
  brokerSymbol?: string;
  accountId: import("./ids").AccountId;
  scoreTotal?: number;
}): BacktestTrade | null {
  const r = params.replay;
  if (r.entryPrice == null || r.direction == null) return null;
  const tid = `IFVG_REPLAY_${params.zone.zoneId}_${params.tradeIdx}` as BacktestTradeId;
  let exitPrice = r.entryPrice;
  if (r.status === "take_profit" && r.takeProfit != null) exitPrice = r.takeProfit;
  else if (r.status === "stop_loss" && r.stopLoss != null) exitPrice = r.stopLoss;
  else if (r.status === "expired" || r.status === "missed" || r.status === "not_triggered") {
    exitPrice = r.entryPrice;
  }
  return {
    tradeId: tid,
    runId: params.runId as BacktestRunId,
    strategyId: params.strategyId,
    parameterSetId: params.parameterSetId,
    canonicalSymbol: params.canonicalSymbol,
    brokerSymbol: params.brokerSymbol,
    accountId: params.accountId,
    direction: params.replay.direction!,
    entryTime:
      r.entryTimeUtc != null ? new Date(r.entryTimeUtc).toISOString() : new Date(0).toISOString(),
    exitTime:
      r.exitTimeUtc != null ? new Date(r.exitTimeUtc).toISOString() : new Date(0).toISOString(),
    entryPrice: r.entryPrice,
    exitPrice,
    sl: r.stopLoss ?? undefined,
    tp: r.takeProfit ?? undefined,
    resultMoney: 0,
    resultR: r.resultR,
    scoreTotal: params.scoreTotal,
    zoneId: params.zone.zoneId,
    exitReason: r.status,
    reasonCodes: [r.reason.code],
  };
}

function emptySummary(): IfvgReplayBacktestSummary {
  return {
    candidateCount: 0,
    replayAttemptedCount: 0,
    replayedTradeCount: 0,
    wins: 0,
    losses: 0,
    expiredCount: 0,
    missedCount: 0,
    invalidatedCount: 0,
    ambiguousCount: 0,
    notTriggeredCount: 0,
    totalR: 0,
    averageR: null,
    winRate: null,
    profitFactor: null,
    maxDrawdownR: 0,
    averageMaeR: 0,
    averageMfeR: 0,
    bestTradeR: 0,
    worstTradeR: 0,
  };
}

export function runIfvgReplayBacktest(input: IfvgReplayBacktestInput): IfvgReplayBacktestResult {
  const diagnostics: IfvgReplayBacktestDiagnostic[] = [];
  const warnings: IfvgReplayBacktestReason[] = [];
  const traces: IfvgReplayBacktestCandidateTrace[] = [];
  const trades: BacktestTrade[] = [];
  let detection: DetectIfvgZoneCandidatesResult | null = null;
  let status: IfvgReplayBacktestStatus = "completed";

  const fail = (s: IfvgReplayBacktestStatus, reason: IfvgReplayBacktestReason): IfvgReplayBacktestResult => ({
    status: s,
    summary: emptySummary(),
    trades: [],
    traces,
    diagnostics,
    warnings: [...warnings, reason],
    detection,
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
  });

  try {
    if (!input.candles?.length) {
      return fail("insufficient_data", ifvgReplayBacktestReason("INSUFFICIENT_CANDLES"));
    }
    if (!input.symbolProfile) {
      return fail("insufficient_data", ifvgReplayBacktestReason("MISSING_SYMBOL_PROFILE"));
    }
    if (!input.strategySettings) {
      return fail("insufficient_data", ifvgReplayBacktestReason("MISSING_STRATEGY_SETTINGS"));
    }

    const minBars = input.strategySettings.atrPeriod + 3;
    if (input.candles.length < minBars) {
      return fail("insufficient_data", ifvgReplayBacktestReason("INSUFFICIENT_CANDLES"));
    }

    detection = detectIfvgZoneCandidates({
      candles: input.candles,
      symbolProfile: input.symbolProfile,
      settings: input.strategySettings,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      canonicalSymbol: input.canonicalSymbol,
      brokerSymbol: input.brokerSymbol,
    });

    for (const w of detection.assumptionsWarnings) {
      warnings.push(ifvgReplayBacktestReason("DETECTION_ASSUMPTION", w));
    }

    if (detection.candidates.length === 0) {
      return {
        status: "no_candidates",
        summary: { ...emptySummary(), candidateCount: 0 },
        trades: [],
        traces: [],
        diagnostics,
        warnings,
        detection,
        executionEnabled: false,
        registryMutationAllowed: false,
        reviewOnly: true,
      };
    }

    const bs = input.backtestSettings;
    const atrSeries = calculateAtrSeries(input.candles, input.strategySettings.atrPeriod);
    const runId = input.syntheticRunId ?? "SYNTH_IFVG_REPLAY_V204";

    const accountGuard: import("./trade-plan-types").TradePlanAccountGuardInput = {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
      ...input.accountGuardInput,
    };

    let candidates = [...detection.candidates, ...(input.testOnlyAppendZones ?? [])];
    if (bs.maxCandidates != null && bs.maxCandidates >= 0) {
      candidates = candidates.slice(0, bs.maxCandidates);
    }

    const legacyDefaultScore = bs.defaultScore;
    let replayAttempted = 0;
    let replayed = 0;

    for (let ci = 0; ci < candidates.length; ci++) {
      const zone = candidates[ci]!;
      const { startSearch, inferredCenterBarIndex: centerIdx, diagnostic: indexDiagnostic } =
        resolveRetestSearchStart(zone, input.candles.length);

      if (indexDiagnostic != null) {
        diagnostics.push({
          code: indexDiagnostic,
          message: ifvgReplayBacktestReason(indexDiagnostic).message,
          candidateZoneId: zone.zoneId,
        });
      }

      const path = findRetestConfirmIndices(
        input.candles,
        zone,
        startSearch,
        input.strategySettings,
        atrSeries,
      );

      if (path == null) {
        traces.push({
          zoneId: zone.zoneId,
          sourceIfvgId: zone.sourceIfvgId,
          inferredCenterBarIndex: centerIdx,
          retestSearchStartIndex: startSearch,
          replaySliceStartBarIndex: null,
          planReadyBarIndex: null,
          detectionDiagnostics: detection.diagnostics,
          tradeEvaluation: null,
          entrySlTp: null,
          replay: null,
          skippedReason: "NO_RETEST_CONFIRM_PATH",
          skipMessage: "No retest+confirmation forward from candidate slice.",
          backtestTrade: null,
        });
        continue;
      }

      const { retestIdx, confirmIdx: planReadyIdx } = path;
      const confirmCandle = input.candles[planReadyIdx]!;
      const retestCandleForPlan = input.candles[retestIdx]!;
      const confirmationAtr = atrAtIndex(atrSeries, planReadyIdx);
      if (confirmationAtr == null || confirmationAtr <= 0) {
        traces.push({
          zoneId: zone.zoneId,
          sourceIfvgId: zone.sourceIfvgId,
          inferredCenterBarIndex: centerIdx,
          retestSearchStartIndex: startSearch,
          replaySliceStartBarIndex: null,
          planReadyBarIndex: planReadyIdx,
          detectionDiagnostics: detection.diagnostics,
          tradeEvaluation: null,
          entrySlTp: null,
          replay: null,
          skippedReason: "PIPELINE_INTERNAL",
          skipMessage: "ATR null at confirmation bar.",
          backtestTrade: null,
        });
        continue;
      }

      const retest = detectRetest(
        retestCandleForPlan,
        zone.zoneLow,
        zone.zoneHigh,
        zone.midpoint,
        zone.direction,
        input.strategySettings.zone.retestMode,
      );
      const prev = planReadyIdx > 0 ? input.candles[planReadyIdx - 1] : undefined;
      const confirmation = detectConfirmation(
        confirmCandle,
        prev,
        zone.direction,
        zone.midpoint,
        confirmationAtr,
        input.strategySettings.confirmation,
      );

      const sweepStatus = zone.sweepStatus ?? "CONFIRMED_SWEEP";
      const dmSettings = bs.decisionModelSettings ?? createDefaultDecisionModelSettingsForTests();
      const useDecisionModelScore = bs.useDecisionModelScore !== false;

      const baseTradePlanInput: TradePlanInput = {
        zoneCandidate: zone,
        symbolProfile: input.symbolProfile,
        tradePlanSettings: input.tradePlanSettings,
        accountGuard,
        retestResult: retest,
        confirmationResult: confirmation,
        score: { totalScore: legacyDefaultScore },
        confirmationAtr,
        confirmationClose: confirmCandle.close,
        currentPrice: confirmCandle.close,
        spreadPrice: input.symbolProfile.spreadPrice,
        sweep: {
          sweepStatus,
          sweepLow: zone.direction === "BUY" ? bs.sweepLow : undefined,
          sweepHigh: zone.direction === "SELL" ? bs.sweepHigh : undefined,
        },
        evaluationTimeIso: new Date(confirmCandle.time).toISOString(),
        accountId: input.accountId,
        strategyId: input.strategyId,
        parameterSetId: input.parameterSetId,
        registryCompatibility: input.registryCompatibility ?? undefined,
      };

      const tradeEvalBaseline = evaluateTradeReviewPlan(baseTradePlanInput);
      const entrySlTpBaseline = buildEntrySlTpPlan({
        tradeReviewPlan: tradeEvalBaseline.plan,
        symbolProfile: input.symbolProfile,
        atr: confirmationAtr,
        confirmationClose: confirmCandle.close,
        sweepLow: bs.sweepLow,
        sweepHigh: bs.sweepHigh,
        settings: input.entrySlTpSettings,
      });

      const displacement = buildDisplacementAtBar(
        input.candles,
        planReadyIdx,
        atrSeries,
        input.strategySettings.displacement,
      );

      let contextBiasForTrace: ContextBiasResult | null = null;
      if (input.contextBiasResultOverride !== undefined) {
        contextBiasForTrace = input.contextBiasResultOverride;
      } else if (input.htfCandlesByTimeframe && input.symbolProfile) {
        const hasAny = Object.values(input.htfCandlesByTimeframe).some(
          (arr) => Array.isArray(arr) && arr.length > 0,
        );
        if (hasAny) {
          contextBiasForTrace = evaluateContextBias({
            canonicalSymbol: input.canonicalSymbol,
            brokerSymbol: input.brokerSymbol,
            lowerTimeframe: input.timeframe,
            htfCandlesByTimeframe: input.htfCandlesByTimeframe,
            currentPrice: confirmCandle.close,
            directionToEvaluate: zone.direction,
            symbolProfile: input.symbolProfile,
            settings: input.contextBiasSettings ?? createDefaultContextBiasSettingsForTests(),
          });
        }
      }

      let decisionModelResult: DecisionModelResult | null = null;
      let effectiveScoreForReplay = legacyDefaultScore;

      if (input.symbolProfile) {
        decisionModelResult = evaluateDecisionModel({
          settings: dmSettings,
          minRr: input.entrySlTpSettings.minRr,
          symbolProfile: input.symbolProfile,
          zoneCandidate: zone,
          entrySlTp: entrySlTpBaseline,
          sweepStatus,
          displacement,
          fvgSizeAtr: undefined,
          retest,
          confirmation,
          candidateTiming: zone.candidateTiming ?? null,
          accountGuard,
          registryCompatibility: input.registryCompatibility ?? undefined,
          contextQualityScore: undefined,
          confirmationAtr,
          tradePlanHardGateFailures: tradeEvalBaseline.failedHardGates,
          contextBiasResult: contextBiasForTrace ?? undefined,
        });
        if (useDecisionModelScore) {
          effectiveScoreForReplay = decisionModelResult.softScore.totalScore;
        }
      }

      let tradeEvaluation = evaluateTradeReviewPlan({
        ...baseTradePlanInput,
        score: { totalScore: effectiveScoreForReplay },
      });
      let plan = tradeEvaluation.plan;
      let entrySlTp = buildEntrySlTpPlan({
        tradeReviewPlan: plan,
        symbolProfile: input.symbolProfile,
        atr: confirmationAtr,
        confirmationClose: confirmCandle.close,
        sweepLow: bs.sweepLow,
        sweepHigh: bs.sweepHigh,
        settings: input.entrySlTpSettings,
      });

      if (input.symbolProfile) {
        decisionModelResult = evaluateDecisionModel({
          settings: dmSettings,
          minRr: input.entrySlTpSettings.minRr,
          symbolProfile: input.symbolProfile,
          zoneCandidate: zone,
          entrySlTp,
          sweepStatus,
          displacement,
          fvgSizeAtr: undefined,
          retest,
          confirmation,
          candidateTiming: zone.candidateTiming ?? null,
          accountGuard,
          registryCompatibility: input.registryCompatibility ?? undefined,
          contextQualityScore: undefined,
          confirmationAtr,
          tradePlanHardGateFailures: tradeEvaluation.failedHardGates,
          contextBiasResult: contextBiasForTrace ?? undefined,
        });
        if (useDecisionModelScore) {
          effectiveScoreForReplay = decisionModelResult.softScore.totalScore;
        }
      }

      const scoreForEligibility = useDecisionModelScore ? effectiveScoreForReplay : legacyDefaultScore;

      if (!planReplayEligible(plan, scoreForEligibility, bs)) {
        traces.push({
          zoneId: zone.zoneId,
          sourceIfvgId: zone.sourceIfvgId,
          inferredCenterBarIndex: centerIdx,
          retestSearchStartIndex: startSearch,
          replaySliceStartBarIndex: null,
          planReadyBarIndex: planReadyIdx,
          detectionDiagnostics: detection.diagnostics,
          tradeEvaluation,
          entrySlTp,
          replay: null,
          skippedReason: "OK",
          skipMessage: "Plan filtered by replay eligibility settings.",
          backtestTrade: null,
          decisionModelResult,
          effectiveScoreForReplay,
          legacyDefaultScore,
          contextBiasResult: contextBiasForTrace,
        });
        continue;
      }

      replayAttempted += 1;

      if (!entrySlTp.canReplay || !entrySlTp.replayInputPreview) {
        traces.push({
          zoneId: zone.zoneId,
          sourceIfvgId: zone.sourceIfvgId,
          inferredCenterBarIndex: centerIdx,
          retestSearchStartIndex: startSearch,
          replaySliceStartBarIndex: null,
          planReadyBarIndex: planReadyIdx,
          detectionDiagnostics: detection.diagnostics,
          tradeEvaluation,
          entrySlTp,
          replay: null,
          skippedReason: "OK",
          skipMessage: "Entry/SL/TP plan not replayable.",
          backtestTrade: null,
          decisionModelResult,
          effectiveScoreForReplay,
          legacyDefaultScore,
          contextBiasResult: contextBiasForTrace,
        });
        continue;
      }

      let replaySliceStartBar = planReadyIdx;
      if (zone.candidateTiming?.firstReplayIndex != null) {
        replaySliceStartBar = Math.max(planReadyIdx, zone.candidateTiming.firstReplayIndex);
      }

      const replayCandles = replaySliceFromPlanReady(input.candles, replaySliceStartBar);
      if (replayCandles.length === 0) {
        traces.push({
          zoneId: zone.zoneId,
          sourceIfvgId: zone.sourceIfvgId,
          inferredCenterBarIndex: centerIdx,
          retestSearchStartIndex: startSearch,
          replaySliceStartBarIndex: replaySliceStartBar,
          planReadyBarIndex: planReadyIdx,
          detectionDiagnostics: detection.diagnostics,
          tradeEvaluation,
          entrySlTp,
          replay: null,
          skippedReason: "INSUFFICIENT_CANDLES",
          skipMessage: "No candles after plan-ready index.",
          backtestTrade: null,
          decisionModelResult,
          effectiveScoreForReplay,
          legacyDefaultScore,
          contextBiasResult: contextBiasForTrace,
        });
        continue;
      }

      const replay = simulateReplayTrade({
        ...entrySlTp.replayInputPreview,
        candles: replayCandles,
        settings: { ...entrySlTp.replayInputPreview.settings, ...input.replaySettings },
      });

      const bt = replayToBacktestTrade({
        replay,
        zone,
        runId,
        tradeIdx: replayed,
        strategyId: input.strategyId,
        parameterSetId: input.parameterSetId,
        canonicalSymbol: input.canonicalSymbol,
        brokerSymbol: input.brokerSymbol,
        accountId: input.accountId,
        scoreTotal: effectiveScoreForReplay,
      });

      if (bt) trades.push(bt);
      replayed += 1;

      traces.push({
        zoneId: zone.zoneId,
        sourceIfvgId: zone.sourceIfvgId,
        inferredCenterBarIndex: centerIdx,
        retestSearchStartIndex: startSearch,
        replaySliceStartBarIndex: replaySliceStartBar,
        planReadyBarIndex: planReadyIdx,
        detectionDiagnostics: detection.diagnostics,
        tradeEvaluation,
        entrySlTp,
        replay,
        backtestTrade: bt,
        decisionModelResult,
        effectiveScoreForReplay,
        legacyDefaultScore,
        contextBiasResult: contextBiasForTrace,
      });
    }

    const summaryTrades = trades.filter((t) => t != null);
    const base = summaryTrades.length > 0 ? calculateBacktestSummary(summaryTrades) : null;

    let wins = 0;
    let losses = 0;
    let expiredCount = 0;
    let missedCount = 0;
    let invalidatedCount = 0;
    let ambiguousCount = 0;
    let notTriggeredCount = 0;
    let maeSum = 0;
    let mfeSum = 0;
    let maeN = 0;
    const rs: number[] = [];

    for (const t of traces) {
      if (!t.replay) continue;
      rs.push(t.replay.resultR);
      maeSum += t.replay.maeR;
      mfeSum += t.replay.mfeR;
      maeN += 1;
      if (t.replay.resultR > 0) wins += 1;
      else if (t.replay.resultR < 0) losses += 1;
      switch (t.replay.status) {
        case "expired":
          expiredCount += 1;
          break;
        case "missed":
          missedCount += 1;
          break;
        case "invalidated":
          invalidatedCount += 1;
          break;
        case "ambiguous_same_candle":
          ambiguousCount += 1;
          break;
        case "not_triggered":
          notTriggeredCount += 1;
          break;
        default:
          break;
      }
    }

    const summary: IfvgReplayBacktestSummary = {
      candidateCount: candidates.length,
      replayAttemptedCount: replayAttempted,
      replayedTradeCount: summaryTrades.length,
      wins,
      losses,
      expiredCount,
      missedCount,
      invalidatedCount,
      ambiguousCount,
      notTriggeredCount,
      totalR: base ? base.totalR : 0,
      averageR: summaryTrades.length > 0 ? calculateTotalR(summaryTrades) / summaryTrades.length : null,
      winRate: summaryTrades.length > 0 ? calculateWinRate(summaryTrades) : null,
      profitFactor: summaryTrades.length > 0 ? calculateProfitFactor(summaryTrades) : null,
      maxDrawdownR: base ? base.maxDrawdownR : 0,
      averageMaeR: maeN > 0 ? maeSum / maeN : 0,
      averageMfeR: maeN > 0 ? mfeSum / maeN : 0,
      bestTradeR: rs.length > 0 ? Math.max(...rs) : 0,
      worstTradeR: rs.length > 0 ? Math.min(...rs) : 0,
    };

    if (diagnostics.length > 0 || detection.pipelineWarnings.length > 0) {
      status = "completed_with_warnings";
    }
    if (replayAttempted > 0 && summaryTrades.length === 0) {
      status = "completed_with_warnings";
    }

    return {
      status,
      summary,
      trades: summaryTrades,
      traces,
      diagnostics,
      warnings,
      detection,
      executionEnabled: false,
      registryMutationAllowed: false,
      reviewOnly: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail("failed", ifvgReplayBacktestReason("PIPELINE_INTERNAL", msg));
  }
}
