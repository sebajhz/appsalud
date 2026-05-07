import { describe, expect, it } from "vitest";
import { evaluateTargetObjective } from "../src/target-objective-model";
import {
  createTargetObjectiveFixtures,
  targetObjectiveClearSwingHighCandles,
} from "../src/target-objective-fixtures";
import { buildEntrySlTpPlan, createDefaultEntrySlTpSettingsForTests } from "../src/entry-sl-tp-model";
import { createEntrySlTpFixtures } from "../src/entry-sl-tp-fixtures";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";
import type { ContextBiasResult } from "../src/context-bias-types";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "../src/engine-reality-fixtures";
import { detectSwings } from "../src/swing-detector";

const fx = createTargetObjectiveFixtures();

describe("V2-09 target objective — A. fixed R", () => {
  it("BUY fixed R target produces valid rr", () => {
    const r = evaluateTargetObjective(fx.BUY_FIXED_R_IDEAL);
    expect(r.selectedTargetPrice).toBe(102);
    expect(r.rr).toBe(2);
    expect(r.classification).toBe("ideal_target");
    expect(r.reviewOnly).toBe(true);
  });

  it("SELL fixed R mirror works", () => {
    const r = evaluateTargetObjective(fx.SELL_FIXED_R_MIRROR);
    expect(r.selectedTargetPrice).toBe(98);
    expect(r.rr).toBe(2);
    expect(["ideal_target", "acceptable_target"]).toContain(r.classification);
  });
});

describe("V2-09 target objective — B. opposing liquidity", () => {
  it("selects opposing liquidity when it improves rr vs fixed R (hybrid)", () => {
    const r = evaluateTargetObjective(fx.BUY_LIQUIDITY_BEATS_FIXED);
    expect(r.selectedSource).toBe("hybrid_selection");
    expect(r.selectedTargetPrice).toBe(104);
    expect(r.rr).toBeGreaterThanOrEqual(3.5);
  });
});

describe("V2-09 target objective — C. previous high / low", () => {
  it("derives swing high target from recent candles when structure omitted", () => {
    const candles = targetObjectiveClearSwingHighCandles();
    expect(detectSwings(candles, { swingLeftBars: 2, swingRightBars: 2 }).some((s) => s.type === "HIGH")).toBe(
      true,
    );
    const input = {
      ...fx.BUY_FIXED_R_IDEAL,
      recentCandles: candles,
      settings: {
        ...fx.BUY_FIXED_R_IDEAL.settings,
        mode: "previous_high_low" as const,
        swingLeftBars: 2,
        swingRightBars: 2,
        targetTooFarAtrMultiple: 20,
      },
    };
    const r = evaluateTargetObjective(input);
    expect(r.selectedTargetPrice).not.toBeNull();
    expect(r.selectedTargetPrice).toBeGreaterThan(input.entryPrice);
    expect(r.candidates.some((c) => c.source === "swing_high")).toBe(true);
  });

  it("uses structure levels when provided", () => {
    const r = evaluateTargetObjective({
      ...fx.BUY_FIXED_R_IDEAL,
      structureHigh: 103,
      settings: { ...fx.BUY_FIXED_R_IDEAL.settings, mode: "structure_level" },
    });
    expect(r.selectedTargetPrice).toBe(103);
  });
});

describe("V2-09 target objective — D. too close / bad R:R", () => {
  it("rejects reward shorter than risk when disallowed", () => {
    const r = evaluateTargetObjective(fx.BAD_RR_REJECTED);
    expect(r.selectedTargetPrice).toBeNull();
    expect(r.blockingReasons.some((b) => b.code === "NO_VALID_CANDIDATE")).toBe(true);
  });

  it("classifies too_close vs current price (BUY)", () => {
    const r = evaluateTargetObjective(fx.BUY_TOO_CLOSE);
    expect(r.classification).toBe("too_close");
  });
});

describe("V2-09 target objective — E. already reached", () => {
  it("BUY current beyond target → already_reached", () => {
    const r = evaluateTargetObjective(fx.BUY_ALREADY_REACHED);
    expect(r.classification).toBe("already_reached");
    expect(r.selectedTargetPrice).toBe(102);
  });

  it("SELL mirror: price through target downward", () => {
    const r = evaluateTargetObjective({
      direction: "SELL",
      entryPrice: 100,
      stopLossPrice: 101,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      currentPrice: 97.9,
      atrPrice: 0.5,
      settings: { ...fx.SELL_FIXED_R_MIRROR.settings, mode: "fixed_r", fixedRTarget: 2 },
    });
    expect(r.classification).toBe("already_reached");
  });
});

describe("V2-09 target objective — F. hybrid", () => {
  it("selects best valid target between fixed R and liquidity", () => {
    const r = evaluateTargetObjective(fx.HYBRID_BEST);
    expect(r.selectedMode).toBe("hybrid_best_available");
    expect(r.selectedTargetPrice).toBe(103.5);
  });
});

describe("V2-09 target objective — range / too far", () => {
  it("range high objective for BUY", () => {
    const r = evaluateTargetObjective(fx.RANGE_EXTREME_BUY);
    expect(r.selectedTargetPrice).toBe(103.5);
  });

  it("marks unrealistic distant opposing liquidity as too_far and blocks selection when only candidate", () => {
    const r = evaluateTargetObjective(fx.TARGET_TOO_FAR);
    expect(r.candidates.some((c) => c.classification === "too_far")).toBe(true);
    expect(r.selectedTargetPrice).toBeNull();
  });
});

describe("V2-09 target objective — G. Entry/SL/TP integration", () => {
  it("hybrid TP uses TargetObjectiveResult selected price as liquidity leg", () => {
    const esFx = createEntrySlTpFixtures().HYBRID_TP;
    const to = evaluateTargetObjective({
      direction: "BUY",
      entryPrice: esFx.zoneCandidate!.midpoint,
      stopLossPrice: esFx.zoneCandidate!.zoneLow - 0.5,
      symbolProfile: esFx.symbolProfile,
      opposingLiquidityPrice: 999,
      atrPrice: 0.5,
      settings: createTargetObjectiveFixtures().HYBRID_BEST.settings,
    });
    expect(to.selectedTargetPrice).not.toBeNull();

    const st = createDefaultEntrySlTpSettingsForTests();
    st.tpMode = "hybrid_fixed_r_or_liquidity";
    st.fixedRTarget = 2;
    st.minRr = 1;
    st.minMeaningfulRewardR = 0.1;

    const plan = buildEntrySlTpPlan({
      ...esFx,
      settings: st,
      targetObjectiveResult: to,
    });
    expect(plan.pricePlan?.takeProfit).toBe(to.selectedTargetPrice);
  });
});

describe("V2-09 target objective — H. Decision model integration", () => {
  it("ideal target boosts entry SLTP soft component vs baseline without objective", () => {
    const dfx = createDecisionModelFixtureInputs();
    const toIdeal = evaluateTargetObjective(fx.BUY_FIXED_R_IDEAL);
    expect(toIdeal.classification).toBe("ideal_target");

    const a = evaluateDecisionModel({ ...dfx.primaryClean, targetObjectiveResult: null });
    const b = evaluateDecisionModel({ ...dfx.primaryClean, targetObjectiveResult: toIdeal });
    const sa = a.softScore.components.find((c) => c.id === "entrySlTpQuality")!.score;
    const sb = b.softScore.components.find((c) => c.id === "entrySlTpQuality")!.score;
    expect(sb).toBeGreaterThanOrEqual(sa);
    expect(b.softScore.components.find((c) => c.id === "entrySlTpQuality")!.reasonCodes).toContain(
      "TARGET_OBJECTIVE_IDEAL_BOOST",
    );
  });

  it("too_close / already_reached lowers timing and can weaken variant", () => {
    const dfx = createDecisionModelFixtureInputs();
    const toClose = evaluateTargetObjective(fx.BUY_TOO_CLOSE);
    const r = evaluateDecisionModel({ ...dfx.primaryClean, targetObjectiveResult: toClose });
    expect(r.softScore.components.find((c) => c.id === "timingQuality")!.score).toBeLessThanOrEqual(46);
    expect(r.variant).toBe("weak_observe_variant");

    const toPast = evaluateTargetObjective(fx.BUY_ALREADY_REACHED);
    const r2 = evaluateDecisionModel({ ...dfx.primaryClean, targetObjectiveResult: toPast });
    expect(r2.variant).toBe("invalid_variant");
  });
});

describe("V2-09 target objective — context alignment (score)", () => {
  it("applies soft penalty when context opposes direction", () => {
    const bias = {
      canonicalSymbol: "XAUUSD",
      preferredDirection: "sell_only",
      allowedDirections: ["SELL"],
      contextScore: 55,
      buyScore: 20,
      sellScore: 80,
      noTradeScore: 10,
      marketRegime: "trending_down",
      rangePosition: "premium",
      structureState: "lower_highs_lower_lows",
      confidenceBand: "medium",
      reasonCodes: ["OK"] as const,
      explainability: [],
      components: [],
      perTimeframe: [],
      summaryExplanation: "fixture",
    } as unknown as ContextBiasResult;

    const aligned = evaluateTargetObjective(fx.BUY_FIXED_R_IDEAL);
    const opposed = evaluateTargetObjective({ ...fx.BUY_FIXED_R_IDEAL, contextBiasResult: bias });
    expect(opposed.qualityScore).toBeLessThanOrEqual(aligned.qualityScore);
  });
});

describe("V2-09 target objective — I. determinism", () => {
  it("same input returns deeply equal economics", () => {
    const a = evaluateTargetObjective(fx.HYBRID_BEST);
    const b = evaluateTargetObjective(fx.HYBRID_BEST);
    expect(a).toEqual(b);
  });
});
