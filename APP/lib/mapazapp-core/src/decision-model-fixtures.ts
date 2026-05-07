/**
 * V2-05 — deterministic inputs for `evaluateDecisionModel` tests (not broker truth).
 */

import { buildEntrySlTpPlan, createDefaultEntrySlTpSettingsForTests } from "./entry-sl-tp-model";
import type { DecisionModelInput } from "./decision-model-types";
import { createDefaultDecisionModelSettingsForTests } from "./decision-model-settings";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "./engine-reality-fixtures";
import { detectConfirmation } from "./confirmation-detector";
import { detectRetest } from "./retest-detector";
import { evaluateTradeReviewPlan } from "./trade-plan-evaluator";
import { createDefaultTradePlanEvaluationSettingsForTests } from "./trade-plan-settings";
import type { ZoneCandidate } from "./zone-candidate";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import { atrAtIndex, calculateAtrSeries } from "./atr";
import type { DisplacementResult } from "./displacement";
import { detectIfvgZoneCandidates } from "./strategy-detection";

function cloneZone(z: ZoneCandidate, patch: Partial<ZoneCandidate>): ZoneCandidate {
  return { ...z, ...patch };
}

function approvedRegistryFixture(): ParameterSetCompatibilityResult {
  return {
    compatible: true,
    allowObserve: true,
    allowAlert: true,
    allowTradeReview: true,
    status: "approved_for_trade_review",
    approvalLevel: "trade_review",
    blockingReasons: [],
    warningReasons: [],
    parameterSet: null,
    strategy: null,
    simpleSummary: "fixture approved_for_trade_review",
    technicalSummary: "DECISION_MODEL_FIXTURE",
  };
}

export function createDecisionModelFixtureInputs(): {
  primaryClean: DecisionModelInput;
  acceptedNearSweep: DecisionModelInput;
  weakObserve: DecisionModelInput;
  invalidBadRr: DecisionModelInput;
  invalidStrictTiming: DecisionModelInput;
  breakRiskVariant: DecisionModelInput;
  strongRrWeakSweep: DecisionModelInput;
  strongSweepWeakConfirmation: DecisionModelInput;
} {
  const er = createEngineRealityFixtures();
  const clean = er.CLEAN_BULLISH_IFVG;
  const settings = createDefaultDecisionModelSettingsForTests();
  const dmSettingsStrict = { ...settings, strictCandidateTiming: true };
  const dmBreak = { ...settings, breakRiskInvalidatesVariant: true };
  const strat = createEngineRealityStrategySettings();
  const candles = clean.candles;
  const atrSeries = calculateAtrSeries(candles, strat.atrPeriod);
  const confirmIdx = candles.length - 4;
  const retestIdx = confirmIdx - 2;
  const retestCandle = candles[retestIdx]!;
  const confirmCandle = candles[confirmIdx]!;
  const prev = confirmIdx > 0 ? candles[confirmIdx - 1]! : undefined;
  const atr = atrAtIndex(atrSeries, confirmIdx)!;

  const det = detectIfvgZoneCandidates({
    candles: clean.candles,
    symbolProfile: clean.symbolProfile,
    settings: strat,
    strategyId: clean.strategyId,
    parameterSetId: clean.parameterSetId,
    canonicalSymbol: clean.canonicalSymbol,
  }).candidates[0]!;

  const retest = detectRetest(
    retestCandle,
    det.zoneLow,
    det.zoneHigh,
    det.midpoint,
    det.direction,
    strat.zone.retestMode,
  );
  const confirmationDetected = detectConfirmation(
    confirmCandle,
    prev,
    det.direction,
    det.midpoint,
    atr,
    strat.confirmation,
  );
  const confirmation = {
    ...confirmationDetected,
    confirmed: true,
    quality: "CLEAR" as const,
    direction: det.direction === "BUY" ? ("BULLISH" as const) : ("BEARISH" as const),
  };

  const accountGuard = {
    allowTradeReview: true,
    approvedParameterSetForAccount: true,
    spreadAllowed: true,
    operationalStatus: "TRADING_ALLOWED" as const,
    accountId: clean.symbolProfile.accountId,
  };

  const tradePlanInput = {
    zoneCandidate: det,
    symbolProfile: clean.symbolProfile,
    tradePlanSettings: {
      ...createDefaultTradePlanEvaluationSettingsForTests(),
      testOrDevMode: false,
      requireApprovedParameterSet: true,
      requireAccountIdForGuard: true,
      minScoreTrade: 70,
      allowNearSweepTradeReady: true,
    },
    accountGuard,
    retestResult: retest,
    confirmationResult: confirmation,
    score: { totalScore: 82 },
    confirmationAtr: atr,
    confirmationClose: confirmCandle.close,
    currentPrice: confirmCandle.close,
    spreadPrice: clean.symbolProfile.spreadPrice,
    sweep: { sweepStatus: det.sweepStatus ?? "CONFIRMED_SWEEP", sweepLow: 98.7 },
    evaluationTimeIso: new Date(confirmCandle.time).toISOString(),
    accountId: clean.symbolProfile.accountId,
    strategyId: clean.strategyId,
    parameterSetId: clean.parameterSetId,
    registryCompatibility: approvedRegistryFixture(),
  };

  const tradeEval = evaluateTradeReviewPlan(tradePlanInput);
  const entrySl = createDefaultEntrySlTpSettingsForTests();
  entrySl.minRr = 1.5;
  const entrySlTp = buildEntrySlTpPlan({
    tradeReviewPlan: tradeEval.plan,
    symbolProfile: clean.symbolProfile,
    atr,
    confirmationClose: confirmCandle.close,
    sweepLow: 98.7,
    settings: entrySl,
  });

  const displacementStrong: DisplacementResult = {
    direction: det.direction === "BUY" ? "BULLISH" : "BEARISH",
    quality: "STRONG",
    body: atr * 0.5,
    range: atr * 0.9,
    closePosition: 0.78,
    atrThreshold: atr * 0.25,
  };

  const displacementWeak: DisplacementResult = {
    direction: "NONE",
    quality: "WEAK",
    body: 0,
    range: atr * 0.15,
    closePosition: 0.5,
    atrThreshold: 0,
  };

  const base: DecisionModelInput = {
    settings,
    minRr: entrySl.minRr,
    symbolProfile: clean.symbolProfile,
    zoneCandidate: cloneZone(det, { sweepStatus: "CONFIRMED_SWEEP" }),
    entrySlTp,
    sweepStatus: "CONFIRMED_SWEEP",
    displacement: displacementStrong,
    retest,
    confirmation,
    candidateTiming: det.candidateTiming,
    accountGuard,
    registryCompatibility: approvedRegistryFixture(),
    confirmationAtr: atr,
    tradePlanHardGateFailures: tradeEval.failedHardGates,
  };

  const nearZone = cloneZone(det, { sweepStatus: "NEAR_SWEEP" });
  const baseNear: DecisionModelInput = {
    ...base,
    zoneCandidate: nearZone,
    sweepStatus: "NEAR_SWEEP",
  };

  const weakObserveInput: DecisionModelInput = {
    ...base,
    displacement: displacementWeak,
    retest: { ...retest, retested: false, touchPrice: null, event: "NONE" },
  };

  const strongSweepWeakConfirmation: DecisionModelInput = {
    ...base,
    confirmation: { ...confirmation, confirmed: true, quality: "MARGINAL", direction: "BULLISH", body: confirmation.body },
  };

  const badRrSettings = { ...entrySl, minRr: 99 };
  const badEntry = buildEntrySlTpPlan({
    tradeReviewPlan: tradeEval.plan,
    symbolProfile: clean.symbolProfile,
    atr,
    confirmationClose: confirmCandle.close,
    sweepLow: 98.7,
    settings: badRrSettings,
  });

  const noTimingZone = cloneZone(det, { candidateTiming: { sourceKind: "missing", sourceReasonCodes: ["TEST"] } });

  const breakZone = cloneZone(det, { sweepStatus: "POSSIBLE_BREAK_RISK" });

  const breakRiskVariant: DecisionModelInput = {
    ...base,
    settings: dmBreak,
    zoneCandidate: breakZone,
    sweepStatus: "POSSIBLE_BREAK_RISK",
    displacement: displacementWeak,
  };

  const noSweepBase: DecisionModelInput = {
    ...base,
    sweepStatus: "NO_SWEEP",
    displacement: displacementWeak,
    zoneCandidate: cloneZone(det, { sweepStatus: "NO_SWEEP" }),
  };

  return {
    primaryClean: base,
    acceptedNearSweep: baseNear,
    weakObserve: weakObserveInput,
    invalidBadRr: { ...base, entrySlTp: badEntry, minRr: 99 },
    invalidStrictTiming: {
      ...base,
      settings: dmSettingsStrict,
      candidateTiming: noTimingZone.candidateTiming,
      zoneCandidate: noTimingZone,
    },
    breakRiskVariant,
    strongRrWeakSweep: {
      ...noSweepBase,
      entrySlTp: base.entrySlTp!,
    },
    strongSweepWeakConfirmation,
  };
}
