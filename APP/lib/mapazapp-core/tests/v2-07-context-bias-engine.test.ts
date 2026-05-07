import { describe, expect, it } from "vitest";
import { evaluateContextBias } from "../src/context-bias-engine";
import { createContextBiasFixtureInputs } from "../src/context-bias-fixtures";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";
import { createDefaultDecisionModelSettingsForTests } from "../src/decision-model-settings";
import { runIfvgReplayBacktest } from "../src/ifvg-replay-backtest";
import { createIfvgReplayBacktestFixtures } from "../src/ifvg-replay-backtest-fixtures";
import { buildBullishH4DiscountSeries } from "../src/context-bias-fixtures";

const fx = createContextBiasFixtureInputs();
const dmFx = createDecisionModelFixtureInputs();

describe("V2-07 context bias — A. bullish", () => {
  it("buy-favored: buyScore > sellScore and buy_only or both with discount", () => {
    const r = evaluateContextBias(fx.bullishDiscountBuy);
    expect(r.buyScore).toBeGreaterThan(r.sellScore);
    expect(["buy_only", "both_allowed"]).toContain(r.preferredDirection);
    expect(r.rangePosition === "discount" || r.rangePosition === "extreme_low").toBe(true);
  });

  it("discount improves buy vs premium same structure (sanity)", () => {
    const base = evaluateContextBias(fx.bullishDiscountBuy);
    const hi = evaluateContextBias({
      ...fx.bullishDiscountBuy,
      currentPrice: buildBullishH4DiscountSeries()[52]!.close,
    });
    expect(base.buyScore).toBeGreaterThanOrEqual(hi.buyScore - 5);
  });
});

describe("V2-07 context bias — B. bearish", () => {
  it("sell-favored: sellScore > buyScore", () => {
    const r = evaluateContextBias(fx.bearishPremiumSell);
    expect(r.sellScore).toBeGreaterThan(r.buyScore);
    expect(["sell_only", "both_allowed"]).toContain(r.preferredDirection);
    expect(r.rangePosition === "premium" || r.rangePosition === "extreme_high").toBe(true);
  });
});

describe("V2-07 context bias — C. middle / range", () => {
  it("middle weakens conviction — both_allowed or unclear", () => {
    const r = evaluateContextBias(fx.middleWeak);
    expect(["both_allowed", "unclear", "no_trade"]).toContain(r.preferredDirection);
    expect(r.rangePosition === "middle" || r.structureState === "mixed").toBe(true);
  });
});

describe("V2-07 context bias — D. choppy", () => {
  it("choppy lowers scores or elevates no_trade posture", () => {
    const r = evaluateContextBias(fx.choppyNoTrade);
    expect(r.marketRegime === "choppy" || r.noTradeScore >= 30).toBe(true);
    expect(r.contextScore).toBeLessThan(75);
  });
});

describe("V2-07 context bias — E. MTF conflict", () => {
  it("H4 bullish vs H1 bearish reduces confidence and flags conflict", () => {
    const r = evaluateContextBias(fx.mtfConflict);
    expect(r.reasonCodes).toContain("HTF_MTF_CONFLICT");
    expect(r.confidenceBand).toBe("low");
    expect(r.contextScore).toBeLessThan(85);
  });
});

describe("V2-07 context bias — F. insufficient data", () => {
  it("does not throw; returns unclear with reasons", () => {
    const r = evaluateContextBias(fx.insufficient);
    expect(r.structureState).toBe("unknown");
    expect(r.reasonCodes).toContain("INSUFFICIENT_HTF_DATA");
  });
});

describe("V2-07 context bias — G. decision model integration", () => {
  it("contextBiasResult raises contextQuality vs placeholder when aligned", () => {
    const bias = evaluateContextBias(fx.bullishDiscountBuy);
    const base = evaluateDecisionModel(dmFx.primaryClean);
    const adj = evaluateDecisionModel({
      ...dmFx.primaryClean,
      contextBiasResult: bias,
    });
    const cb = base.softScore.components.find((c) => c.id === "contextQuality")!.score;
    const ca = adj.softScore.components.find((c) => c.id === "contextQuality")!.score;
    expect(ca).toBeGreaterThan(cb);
  });

  it("opposite HTF vs zone direction lowers contextQuality", () => {
    const bias = evaluateContextBias(fx.bearishPremiumSell);
    const r = evaluateDecisionModel({
      ...dmFx.primaryClean,
      contextBiasResult: bias,
    });
    const ctx = r.softScore.components.find((c) => c.id === "contextQuality")!;
    expect(ctx.score).toBeLessThan(80);
    expect(ctx.reasonCodes.includes("CONTEXT_BIAS_ADJUSTED") || ctx.score < 72).toBe(true);
  });

  it("no_trade + policy can invalidate variant without hard gate", () => {
    const settings = createDefaultDecisionModelSettingsForTests();
    const chop = evaluateContextBias(fx.choppyNoTrade);
    const r = evaluateDecisionModel({
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
    expect(r.hardGates.hardGatePassed).toBe(true);
    expect(r.variant).toBe("invalid_variant");
  });
});

describe("V2-07 context bias — H. determinism", () => {
  it("same input yields identical outputs", () => {
    const a = evaluateContextBias(fx.bullishDiscountBuy);
    const b = evaluateContextBias(fx.bullishDiscountBuy);
    expect(a).toEqual(b);
  });
});

describe("V2-07 — replay optional HTF passthrough", () => {
  it("replay trace may include contextBiasResult when htfCandlesByTimeframe set", () => {
    const replayClean = createIfvgReplayBacktestFixtures().CLEAN_ONE_TP;
    const r = runIfvgReplayBacktest({
      ...replayClean,
      htfCandlesByTimeframe: { H4: buildBullishH4DiscountSeries() },
    });
    const t = r.traces.find((x) => x.replay != null);
    expect(t?.contextBiasResult).toBeDefined();
    expect(t?.contextBiasResult?.canonicalSymbol).toBe(replayClean.canonicalSymbol);
  });
});
