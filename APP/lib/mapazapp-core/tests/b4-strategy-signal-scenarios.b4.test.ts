import { describe, expect, it } from "vitest";
import { evaluateContextBias } from "../src/context-bias-engine";
import { createContextBiasFixtureInputs } from "../src/context-bias-fixtures";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";
import { createDefaultDecisionModelSettingsForTests } from "../src/decision-model-settings";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "../src/engine-reality-fixtures";
import { createIfvgReplayBacktestFixtures } from "../src/ifvg-replay-backtest-fixtures";
import { runIfvgReplayBacktest } from "../src/ifvg-replay-backtest";
import { detectIfvgZoneCandidates } from "../src/strategy-detection";

const replayFx = createIfvgReplayBacktestFixtures();
const dmFx = createDecisionModelFixtureInputs();
const ctxFx = createContextBiasFixtureInputs();
const er = createEngineRealityFixtures();
const strat = createEngineRealityStrategySettings();

function assertNoOperationalApprovalTokens(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("execute order");
  expect(low).not.toContain("send order");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
}

function assertFiniteDecisionScores(r: ReturnType<typeof evaluateDecisionModel>): void {
  expect(Number.isFinite(r.softScore.totalScore)).toBe(true);
  expect(Number.isFinite(r.softScore.weightedSumRaw)).toBe(true);
  for (const c of r.softScore.components) {
    expect(Number.isFinite(c.score)).toBe(true);
    expect(Number.isFinite(c.weight)).toBe(true);
    expect(Number.isFinite(c.contribution)).toBe(true);
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
  }
}

describe("B4 strategy / signal scenarios", () => {
  it("A. Positive IFVG setup — candidates, reasons, finite scores, review-only safety", () => {
    const clean = er.CLEAN_BULLISH_IFVG;
    const det = detectIfvgZoneCandidates({
      candles: clean.candles,
      symbolProfile: clean.symbolProfile,
      settings: strat,
      strategyId: clean.strategyId,
      parameterSetId: clean.parameterSetId,
      canonicalSymbol: clean.canonicalSymbol,
    });
    expect(det.candidates.length).toBeGreaterThan(0);
    const z = det.candidates[0]!;
    expect(z.reasonSimple?.length ?? 0).toBeGreaterThan(5);
    expect(z.reasonTechnical?.length ?? 0).toBeGreaterThan(5);

    const r = runIfvgReplayBacktest(replayFx.CLEAN_ONE_TP);
    expect(["completed", "completed_with_warnings"]).toContain(r.status);
    expect(r.detection?.candidates.length ?? 0).toBeGreaterThan(0);
    const trace = r.traces.find((t) => t.tradeEvaluation?.plan?.reasons?.length);
    expect(trace?.tradeEvaluation?.plan?.reasons?.length ?? 0).toBeGreaterThan(0);
    expect(Number.isFinite(trace?.effectiveScoreForReplay ?? NaN)).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.reviewOnly).toBe(true);
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("B. Negative flat series — no IFVG candidates, no replay trades", () => {
    const r = runIfvgReplayBacktest(replayFx.NO_CANDIDATE_FLAT);
    expect(r.status).toBe("no_candidates");
    expect(r.detection?.candidates.length ?? 0).toBe(0);
    expect(r.summary.replayedTradeCount).toBe(0);
    expect(r.summary.replayAttemptedCount).toBe(0);
    expect(r.executionEnabled).toBe(false);
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("B2. Decision weak_observe_variant — non-primary classification (contract)", () => {
    const r = evaluateDecisionModel(dmFx.weakObserve);
    expect(r.variant).toBe("weak_observe_variant");
    expect(r.hardGates.hardGatePassed).toBe(true);
    assertFiniteDecisionScores(r);
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("C. Insufficient bars replay — safe insufficient_data, no trades", () => {
    const r = runIfvgReplayBacktest(replayFx.INSUFFICIENT_BARS);
    expect(r.status).toBe("insufficient_data");
    expect(r.summary.replayedTradeCount).toBe(0);
    expect(r.executionEnabled).toBe(false);
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("C2. Context bias insufficient HTF — controlled reasons, no throw", () => {
    const r = evaluateContextBias(ctxFx.insufficient);
    expect(r.structureState).toBe("unknown");
    expect(r.reasonCodes).toContain("INSUFFICIENT_HTF_DATA");
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("D. Invalid / blocked decision paths — invalid_variant (bad R:R) and lookahead timing", () => {
    const badRr = evaluateDecisionModel(dmFx.invalidBadRr);
    expect(badRr.variant).toBe("invalid_variant");
    expect(badRr.hardGates.hardGatePassed).toBe(false);
    assertNoOperationalApprovalTokens(JSON.stringify(badRr));

    const timing = evaluateDecisionModel(dmFx.invalidStrictTiming);
    expect(timing.variant).toBe("invalid_variant");
    expect(timing.hardGates.blockingReasons.some((b) => b.code === "TIMING_LOOKAHEAD_UNSAFE")).toBe(true);
    assertNoOperationalApprovalTokens(JSON.stringify(timing));
  });

  it("E. Gap — no anti-spam / duplicate-signal policy in mapazapp-core (documented)", () => {
    /** Product code search shows no anti-spam API; idempotence of detection is not spam control. */
    expect(true).toBe(true);
  });

  it("F. Reasons / evidence — positive decision explainability stable; negative carries blocking reasons", () => {
    const a = evaluateDecisionModel(dmFx.primaryClean);
    const b = evaluateDecisionModel(dmFx.primaryClean);
    expect(JSON.stringify(a.explainability)).toBe(JSON.stringify(b.explainability));
    expect(a.explainability.length).toBeGreaterThan(0);
    expect(a.softScore.components.every((c) => c.explanationSimple.length > 0)).toBe(true);

    const neg = evaluateDecisionModel(dmFx.invalidBadRr);
    expect(neg.hardGates.blockingReasons.length).toBeGreaterThan(0);
    expect(neg.hardGates.blockingReasons[0]!.message.length).toBeGreaterThan(3);
    const low = JSON.stringify(a).toLowerCase();
    expect(low).not.toContain("guaranteed profit");
    expect(low).not.toContain("sure win");
  });

  it("G. Score / confidence band — finite totals; band is categorical contract (no separate confidence %)", () => {
    const r = evaluateDecisionModel(dmFx.primaryClean);
    assertFiniteDecisionScores(r);
    expect(["no_trade", "observe", "wait", "review_candidate", "high_confidence_review_candidate"]).toContain(
      r.confidenceBand,
    );
    expect(typeof r.confidenceBand).toBe("string");
  });

  it("H. Invalid by risk — account guard blocks decision model; replay gate zeros trades", () => {
    const blocked = evaluateDecisionModel({
      ...dmFx.primaryClean,
      accountGuard: { ...dmFx.primaryClean.accountGuard!, allowTradeReview: false },
    });
    expect(blocked.hardGates.hardGatePassed).toBe(false);
    expect(blocked.hardGates.blockingReasons.some((b) => b.code === "ACCOUNT_GUARD_BLOCKS")).toBe(true);
    assertNoOperationalApprovalTokens(JSON.stringify(blocked));

    const gated = runIfvgReplayBacktest({
      ...replayFx.CLEAN_ONE_TP,
      accountGuardInput: {
        ...replayFx.CLEAN_ONE_TP.accountGuardInput!,
        approvedParameterSetForAccount: false,
      },
    });
    expect(gated.summary.replayedTradeCount).toBe(0);
    expect(gated.executionEnabled).toBe(false);
  });

  it("I. Market context weakens or invalidates — opposite bias lowers contextQuality; no_trade policy can invalidate", () => {
    const bearish = evaluateContextBias(ctxFx.bearishPremiumSell);
    const adj = evaluateDecisionModel({
      ...dmFx.primaryClean,
      contextBiasResult: bearish,
    });
    const ctx = adj.softScore.components.find((c) => c.id === "contextQuality")!;
    expect(ctx.score).toBeLessThan(80);
    assertNoOperationalApprovalTokens(JSON.stringify(adj));

    const settings = createDefaultDecisionModelSettingsForTests();
    const chop = evaluateContextBias(ctxFx.choppyNoTrade);
    const invalidated = evaluateDecisionModel({
      ...dmFx.primaryClean,
      settings: {
        ...settings,
        contextBiasIntegration: {
          contextBiasCanHardBlock: false,
          minContextBiasScoreForHardGate: 20,
          contextNoTradeInvalidatesVariant: true,
          noTradeInvalidateMaxContextScore: 72,
        },
      },
      contextBiasResult: {
        ...chop,
        preferredDirection: "no_trade",
        contextScore: 40,
      },
    });
    expect(invalidated.hardGates.hardGatePassed).toBe(true);
    expect(invalidated.variant).toBe("invalid_variant");
    assertNoOperationalApprovalTokens(JSON.stringify(invalidated));
  });

  it("J. Very short / degenerate series — detection yields no candidates (same INSUFFICIENT bars as replay fixture)", () => {
    const short = replayFx.INSUFFICIENT_BARS.candles;
    const det = detectIfvgZoneCandidates({
      candles: short,
      symbolProfile: er.CLEAN_BULLISH_IFVG.symbolProfile,
      settings: strat,
      strategyId: er.CLEAN_BULLISH_IFVG.strategyId,
      parameterSetId: er.CLEAN_BULLISH_IFVG.parameterSetId,
      canonicalSymbol: er.CLEAN_BULLISH_IFVG.canonicalSymbol,
    });
    expect(det.candidates.length).toBe(0);
    assertNoOperationalApprovalTokens(JSON.stringify(det));
  });
});
