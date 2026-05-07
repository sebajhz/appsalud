import { describe, expect, it } from "vitest";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";
import { createIfvgReplayBacktestFixtures } from "../src/ifvg-replay-backtest-fixtures";
import { runIfvgReplayBacktest } from "../src/ifvg-replay-backtest";
import { createEngineRealityFixtures } from "../src/engine-reality-fixtures";
import { detectIfvgZoneCandidates } from "../src/strategy-detection";
import type { ZoneCandidate } from "../src/zone-candidate";
import { createDefaultDecisionModelSettingsForTests } from "../src/decision-model-settings";

const fx = createDecisionModelFixtureInputs();
const replayClean = createIfvgReplayBacktestFixtures().CLEAN_ONE_TP;

describe("V2-05 decision model — A. hard gates", () => {
  it("missing Entry/SL/TP (null) blocks", () => {
    const r = evaluateDecisionModel({
      ...fx.primaryClean,
      entrySlTp: null,
    });
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "ENTRY_SL_TP_MISSING")).toBe(true);
    expect(r.variant).toBe("invalid_variant");
  });

  it("bad R:R blocks via Entry/SL/TP observe/blocked reasons", () => {
    const r = evaluateDecisionModel(fx.invalidBadRr);
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "RR_BELOW_MINIMUM")).toBe(true);
  });

  it("account guard blocks", () => {
    const r = evaluateDecisionModel({
      ...fx.primaryClean,
      accountGuard: { ...fx.primaryClean.accountGuard!, allowTradeReview: false },
    });
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "ACCOUNT_GUARD_BLOCKS")).toBe(true);
  });

  it("registry blocks trade review", () => {
    const r = evaluateDecisionModel({
      ...fx.primaryClean,
      registryCompatibility: {
        ...fx.primaryClean.registryCompatibility!,
        allowTradeReview: false,
        compatible: false,
        blockingReasons: ["PARAMETER_SET_NOT_FOUND"],
      },
    });
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "REGISTRY_BLOCKS_TRADE_REVIEW")).toBe(true);
  });

  it("strict missing candidate timing blocks", () => {
    const r = evaluateDecisionModel(fx.invalidStrictTiming);
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "TIMING_LOOKAHEAD_UNSAFE")).toBe(true);
  });
});

describe("V2-05 decision model — B. score bands", () => {
  it("clean primary setup reaches wait band or higher (deterministic fixture)", () => {
    const r = evaluateDecisionModel(fx.primaryClean);
    expect(r.hardGates.hardGatePassed).toBe(true);
    expect(r.softScore.totalScore).toBeGreaterThanOrEqual(62);
    expect(["wait", "review_candidate", "high_confidence_review_candidate"]).toContain(r.confidenceBand);
  });

  it("near-sweep variant lowers sweep component vs primary", () => {
    const a = evaluateDecisionModel(fx.primaryClean);
    const b = evaluateDecisionModel(fx.acceptedNearSweep);
    const sa = a.softScore.components.find((c) => c.id === "sweepQuality")!.score;
    const sb = b.softScore.components.find((c) => c.id === "sweepQuality")!.score;
    expect(sb).toBeLessThan(sa);
    expect(b.softScore.totalScore).toBeLessThan(95);
  });

  it("weak confirmation lowers total vs primary", () => {
    const a = evaluateDecisionModel(fx.primaryClean);
    const b = evaluateDecisionModel(fx.strongSweepWeakConfirmation);
    expect(b.softScore.totalScore).toBeLessThan(a.softScore.totalScore);
  });

  it("break-risk lowers score vs clean primary when not invalidating variant", () => {
    const a = evaluateDecisionModel(fx.primaryClean);
    const b = evaluateDecisionModel({
      ...fx.breakRiskVariant,
      settings: { ...fx.breakRiskVariant.settings!, breakRiskInvalidatesVariant: false },
    });
    expect(b.softScore.totalScore).toBeLessThan(a.softScore.totalScore);
  });
});

describe("V2-05 decision model — C. variant classification", () => {
  it("primary_setup for clean fixture", () => {
    const r = evaluateDecisionModel(fx.primaryClean);
    expect(r.variant).toBe("primary_setup");
  });

  it("accepted_variant for near-sweep compensation path", () => {
    const r = evaluateDecisionModel(fx.acceptedNearSweep);
    expect(r.variant).toBe("accepted_variant");
  });

  it("weak_observe_variant for partial retest", () => {
    const r = evaluateDecisionModel(fx.weakObserve);
    expect(r.variant).toBe("weak_observe_variant");
  });

  it("invalid_variant on hard gate failure", () => {
    const r = evaluateDecisionModel(fx.invalidBadRr);
    expect(r.variant).toBe("invalid_variant");
  });

  it("break risk can invalidate when setting enabled", () => {
    const r = evaluateDecisionModel(fx.breakRiskVariant);
    expect(r.variant).toBe("invalid_variant");
  });
});

describe("V2-05 decision model — D. explainability", () => {
  it("every component has score, weight, contribution and explanation; total deterministic", () => {
    const r = evaluateDecisionModel(fx.primaryClean);
    expect(r.softScore.components).toHaveLength(10);
    for (const c of r.softScore.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(c.weight).toBeGreaterThan(0);
      expect(c.contribution).toBeCloseTo(c.score * c.weight, 8);
      expect(c.explanationSimple.length).toBeGreaterThan(3);
    }
    const r2 = evaluateDecisionModel(fx.primaryClean);
    expect(r2.softScore.totalScore).toBe(r.softScore.totalScore);
    expect(r2.softScore.weightedSumRaw).toBe(r.softScore.weightedSumRaw);
    expect(r.explainability).toHaveLength(10);
  });
});

describe("V2-05 decision model — E. IFVG replay integration", () => {
  it("replay trace includes decisionModelResult and measured effective score", () => {
    const r = runIfvgReplayBacktest(replayClean);
    const t = r.traces.find((x) => x.replay != null);
    expect(t).toBeDefined();
    expect(t!.decisionModelResult).not.toBeNull();
    expect(t!.decisionModelResult!.reviewOnly).toBe(true);
    expect(t!.decisionModelResult!.canAutoExecute).toBe(false);
    expect(t!.decisionModelResult!.registryMutationAllowed).toBe(false);
    expect(typeof t!.effectiveScoreForReplay).toBe("number");
    expect(t!.effectiveScoreForReplay).toBe(t!.decisionModelResult!.softScore.totalScore);
    expect(t!.legacyDefaultScore).toBe(82);
  });

  it("useDecisionModelScore false keeps legacy score for eligibility", () => {
    const r = runIfvgReplayBacktest({
      ...replayClean,
      backtestSettings: { ...replayClean.backtestSettings, useDecisionModelScore: false },
    });
    const t = r.traces.find((x) => x.replay != null);
    expect(t?.effectiveScoreForReplay).toBe(82);
    expect(t?.decisionModelResult).not.toBeNull();
  });

  it("strict candidate timing on synthetic zone blocks decision hard gate in trace", () => {
    const er = createEngineRealityFixtures().CLEAN_BULLISH_IFVG;
    const det = detectIfvgZoneCandidates({
      candles: er.candles,
      symbolProfile: er.symbolProfile,
      settings: replayClean.strategySettings!,
      strategyId: er.strategyId,
      parameterSetId: er.parameterSetId,
      canonicalSymbol: er.canonicalSymbol,
    });
    const base = det.candidates[0]!;
    const z: ZoneCandidate = {
      ...base,
      zoneId: "Z_STRICT_DM" as never,
      candidateTiming: { sourceKind: "missing", sourceReasonCodes: ["TEST"] },
    };
    const dm = {
      ...createDefaultDecisionModelSettingsForTests(),
      strictCandidateTiming: true,
    };
    const r = runIfvgReplayBacktest({
      ...replayClean,
      testOnlyAppendZones: [z],
      backtestSettings: {
        ...replayClean.backtestSettings,
        maxCandidates: 99,
        decisionModelSettings: dm,
      },
    });
    const hit = r.traces.find((x) => x.zoneId === ("Z_STRICT_DM" as never));
    expect(hit?.decisionModelResult?.hardGates.hardGatePassed).toBe(false);
  });
});
