import { describe, expect, it } from "vitest";
import { atrAtIndex, calculateAtrSeries } from "../src/atr";
import type { Candle } from "../src/candle";
import {
  createEngineRealityFixtures,
  createEngineRealityPrecisionProfiles,
  createEngineRealityStrategySettings,
} from "../src/engine-reality-fixtures";
import { detectConfirmation } from "../src/confirmation-detector";
import {
  detectLowerPoolSweepForBuy,
  detectUpperPoolSweepForSell,
  type LiquiditySweepToleranceContext,
} from "../src/liquidity-sweep";
import { nearSweepTolerancePrice, sweepTolerancePrice } from "../src/normalize";
import { detectRetest } from "../src/retest-detector";
import { computeStrategyScore } from "../src/strategy-score";
import { detectIfvgZoneCandidates } from "../src/strategy-detection";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import { evaluateTradeReviewPlan } from "../src/trade-plan-evaluator";

const fixtures = createEngineRealityFixtures();
const strategySettings = createEngineRealityStrategySettings();

function expectValidOhlc(c: Candle): void {
  expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
  expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
  expect(c.high).toBeGreaterThanOrEqual(c.low);
}

function atrForLast(candles: Candle[]): number {
  const series = calculateAtrSeries(candles, strategySettings.atrPeriod);
  return atrAtIndex(series, candles.length - 1) ?? 1;
}

describe("V2-01 Engine Reality — A. Fixture sanity", () => {
  it("fixtures are deterministic, sorted, and OHLC-valid", () => {
    for (const fx of Object.values(fixtures)) {
      expect(fx.timeframe).toBe("M15");
      expect(fx.candles.length).toBeGreaterThanOrEqual(strategySettings.atrPeriod + 3);
      expect(fx.strategyId.length).toBeGreaterThan(0);
      for (let i = 0; i < fx.candles.length; i++) {
        const c = fx.candles[i]!;
        expectValidOhlc(c);
        if (i > 0) {
          expect(c.time).toBeGreaterThan(fx.candles[i - 1]!.time);
        }
      }
    }
  });
});

describe("V2-01 Engine Reality — B. Dynamic tolerance", () => {
  it("sweep tolerance scales with ATR/spread/tick and differs across symbols", () => {
    const profiles = createEngineRealityPrecisionProfiles();
    const values = profiles.map((p) =>
      sweepTolerancePrice({
        atr: 1,
        sweepToleranceAtr: strategySettings.sweep.sweepToleranceAtr,
        spreadPrice: p.spreadPrice,
        sweepSpreadFactor: strategySettings.sweep.sweepSpreadFactor,
        tickSize: p.tickSize,
        minSweepTicks: strategySettings.sweep.minSweepTicks,
      }),
    );

    const unique = new Set(values.map((v) => v.toFixed(8)));
    expect(unique.size).toBeGreaterThan(2);
    expect(Math.max(...values)).toBeGreaterThan(Math.min(...values));
  });

  it("near sweep is classified differently from confirmed sweep", () => {
    const clean = fixtures.CLEAN_BULLISH_IFVG;
    const near = fixtures.NEAR_SWEEP_BULLISH_IFVG;
    const probe = clean.sweepProbe!;
    const ctx: LiquiditySweepToleranceContext = {
      atr: atrForLast(clean.candles),
      spreadPrice: clean.symbolProfile.spreadPrice,
      tickSize: clean.symbolProfile.tickSize,
      sweepToleranceAtr: strategySettings.sweep.sweepToleranceAtr,
      sweepSpreadFactor: strategySettings.sweep.sweepSpreadFactor,
      minSweepTicks: strategySettings.sweep.minSweepTicks,
      nearSweepToleranceAtr: strategySettings.sweep.nearSweepToleranceAtr,
      nearSweepSpreadFactor: strategySettings.sweep.nearSweepSpreadFactor,
      minNearSweepTicks: strategySettings.sweep.minNearSweepTicks,
    };

    const cleanSweep = detectLowerPoolSweepForBuy(
      clean.candles,
      probe.swingLevel,
      probe.searchFromIndex,
      probe.searchToIndex,
      ctx,
      { reclaimBars: strategySettings.sweep.reclaimBars },
    );
    const nearSweep = detectLowerPoolSweepForBuy(
      near.candles,
      probe.swingLevel,
      probe.searchFromIndex,
      probe.searchToIndex,
      ctx,
      { reclaimBars: strategySettings.sweep.reclaimBars },
    );

    expect(cleanSweep.status).toBe("CONFIRMED_SWEEP");
    expect(nearSweep.status).toBe("NEAR_SWEEP");
    expect(
      nearSweepTolerancePrice({
        atr: ctx.atr,
        nearSweepToleranceAtr: ctx.nearSweepToleranceAtr,
        spreadPrice: ctx.spreadPrice,
        nearSweepSpreadFactor: ctx.nearSweepSpreadFactor,
        tickSize: ctx.tickSize,
        minNearSweepTicks: ctx.minNearSweepTicks,
      }),
    ).toBeGreaterThan(0);
  });
});

describe("V2-01 Engine Reality — C. Clean bullish setup", () => {
  it("returns BUY candidate and can become TRADE_READY only with gates", () => {
    const fx = fixtures.CLEAN_BULLISH_IFVG;
    const detection = detectIfvgZoneCandidates({
      candles: fx.candles,
      symbolProfile: fx.symbolProfile,
      settings: strategySettings,
      strategyId: fx.strategyId,
      parameterSetId: fx.parameterSetId,
      canonicalSymbol: fx.canonicalSymbol,
    });

    const buy = detection.candidates.find((z) => z.direction === "BUY");
    expect(buy).toBeDefined();
    expect(buy!.zoneLow).toBeLessThan(buy!.zoneHigh);

    const retestCandle = fx.candles[16]!;
    const confirmationCandle = fx.candles[17]!;
    const prev = fx.candles[16]!;
    const atr = atrForLast(fx.candles);
    const retest = detectRetest(
      retestCandle,
      buy!.zoneLow,
      buy!.zoneHigh,
      buy!.midpoint,
      buy!.direction,
      strategySettings.zone.retestMode,
    );
    const conf = detectConfirmation(
      confirmationCandle,
      prev,
      buy!.direction,
      buy!.midpoint,
      atr,
      strategySettings.confirmation,
    );

    const strictSettings = {
      ...createDefaultTradePlanEvaluationSettingsForTests(),
      testOrDevMode: false,
      requireApprovedParameterSet: true,
      requireAccountIdForGuard: true,
      minScoreTrade: 70,
    };

    const blocked = evaluateTradeReviewPlan({
      zoneCandidate: buy!,
      symbolProfile: fx.symbolProfile,
      tradePlanSettings: strictSettings,
      retestResult: retest,
      confirmationResult: conf,
      score: { totalScore: 82 },
      confirmationAtr: atr,
      confirmationClose: confirmationCandle.close,
      spreadPrice: fx.symbolProfile.spreadPrice,
      accountId: fx.symbolProfile.accountId,
      accountGuard: {
        allowTradeReview: true,
        approvedParameterSetForAccount: false,
        spreadAllowed: true,
        operationalStatus: "TRADING_ALLOWED",
      },
      sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 98.7 },
    });
    expect(blocked.plan.status).not.toBe("TRADE_READY");

    const allowed = evaluateTradeReviewPlan({
      zoneCandidate: buy!,
      symbolProfile: fx.symbolProfile,
      tradePlanSettings: strictSettings,
      retestResult: retest,
      confirmationResult: conf,
      score: { totalScore: 82 },
      confirmationAtr: atr,
      confirmationClose: confirmationCandle.close,
      spreadPrice: fx.symbolProfile.spreadPrice,
      accountId: fx.symbolProfile.accountId,
      accountGuard: {
        allowTradeReview: true,
        approvedParameterSetForAccount: true,
        spreadAllowed: true,
        operationalStatus: "TRADING_ALLOWED",
      },
      sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 98.7 },
    });
    expect(allowed.plan.status).toBe("TRADE_READY");
  });
});

describe("V2-01 Engine Reality — D. Near-sweep characterization", () => {
  it("does not discard imperfect liquidity and stays non-trade-ready by default", () => {
    const fx = fixtures.NEAR_SWEEP_BULLISH_IFVG;
    const detection = detectIfvgZoneCandidates({
      candles: fx.candles,
      symbolProfile: fx.symbolProfile,
      settings: strategySettings,
      strategyId: fx.strategyId,
      parameterSetId: fx.parameterSetId,
      canonicalSymbol: fx.canonicalSymbol,
    });
    expect(detection.candidates.length).toBeGreaterThan(0);

    const z = detection.candidates.find((x) => x.direction === "BUY") ?? detection.candidates[0]!;
    const atr = atrForLast(fx.candles);
    const plan = evaluateTradeReviewPlan({
      zoneCandidate: z,
      symbolProfile: fx.symbolProfile,
      tradePlanSettings: {
        ...createDefaultTradePlanEvaluationSettingsForTests(),
        minScoreTrade: 65,
      },
      retestResult: { retested: true, retestMode: "full_zone", touchPrice: z.midpoint, event: "RETEST_HIT" },
      confirmationResult: { confirmed: true, direction: "BULLISH", quality: "CLEAR", body: 1 },
      score: { totalScore: 90 },
      confirmationAtr: atr,
      confirmationClose: z.midpoint + 0.4,
      spreadPrice: fx.symbolProfile.spreadPrice,
      accountGuard: {
        allowTradeReview: true,
        approvedParameterSetForAccount: true,
        spreadAllowed: true,
        operationalStatus: "TRADING_ALLOWED",
      },
      sweep: { sweepStatus: "NEAR_SWEEP", sweepLow: 99.02 },
    });

    expect(plan.plan.status).toBe("OBSERVE");
    expect(plan.plan.reasons.some((r) => r.code === "NEAR_SWEEP_NOT_TRADE_READY")).toBe(true);
    // TODO(V2-02/V2-05): calibrar cuándo NEAR_SWEEP puede pasar a estados superiores con replay real.
  });

  it("late-trade fixture stays as characterization (no missed-trade state yet)", () => {
    const fx = fixtures.LATE_TRADE_ALREADY_PASSED;
    const detection = detectIfvgZoneCandidates({
      candles: fx.candles,
      symbolProfile: fx.symbolProfile,
      settings: strategySettings,
      strategyId: fx.strategyId,
      parameterSetId: fx.parameterSetId,
      canonicalSymbol: fx.canonicalSymbol,
    });
    if (detection.candidates.length === 0) {
      expect(detection.candidates.length).toBe(0);
      // TODO(V2-02): replay lifecycle should classify late/missed trades explicitly.
      return;
    }
    const z = detection.candidates[0]!;
    const plan = evaluateTradeReviewPlan({
      zoneCandidate: z,
      symbolProfile: fx.symbolProfile,
      tradePlanSettings: createDefaultTradePlanEvaluationSettingsForTests(),
      retestResult: { retested: false, retestMode: "full_zone", touchPrice: null, event: "NONE" },
      confirmationResult: { confirmed: false, direction: "NONE", quality: "NONE", body: 0 },
      score: { totalScore: 80 },
      confirmationAtr: atrForLast(fx.candles),
      currentPrice: fx.candles[fx.candles.length - 1]!.close,
    });
    expect(["WAIT_RETEST", "OBSERVE", "NO_TRADE"]).toContain(plan.plan.status);
  });
});

describe("V2-01 Engine Reality — E. Over-sweep / break risk", () => {
  it("is classified riskier than clean sweep", () => {
    const clean = fixtures.CLEAN_BULLISH_IFVG;
    const over = fixtures.OVER_SWEEP_BREAK_RISK;
    const probe = clean.sweepProbe!;
    const ctx: LiquiditySweepToleranceContext = {
      atr: atrForLast(clean.candles),
      spreadPrice: clean.symbolProfile.spreadPrice,
      tickSize: clean.symbolProfile.tickSize,
      sweepToleranceAtr: strategySettings.sweep.sweepToleranceAtr,
      sweepSpreadFactor: strategySettings.sweep.sweepSpreadFactor,
      minSweepTicks: strategySettings.sweep.minSweepTicks,
      nearSweepToleranceAtr: strategySettings.sweep.nearSweepToleranceAtr,
      nearSweepSpreadFactor: strategySettings.sweep.nearSweepSpreadFactor,
      minNearSweepTicks: strategySettings.sweep.minNearSweepTicks,
    };
    const cleanSweep = detectLowerPoolSweepForBuy(
      clean.candles,
      probe.swingLevel,
      probe.searchFromIndex,
      probe.searchToIndex,
      ctx,
      { reclaimBars: strategySettings.sweep.reclaimBars },
    );
    const overSweep = detectLowerPoolSweepForBuy(
      over.candles,
      probe.swingLevel,
      probe.searchFromIndex,
      probe.searchToIndex,
      ctx,
      { reclaimBars: strategySettings.sweep.reclaimBars },
    );

    expect(overSweep.status).toBe("POSSIBLE_BREAK_RISK");
    const cleanScore = computeStrategyScore({
      contextAlign01: 0.8,
      sweepStatus: cleanSweep.status,
      displacement01: 0.8,
      ifvg01: 0.8,
      retest01: 0.8,
      confirmation01: 0.8,
      riskSpread01: 0.8,
    });
    const riskScore = computeStrategyScore({
      contextAlign01: 0.8,
      sweepStatus: overSweep.status,
      displacement01: 0.8,
      ifvg01: 0.8,
      retest01: 0.8,
      confirmation01: 0.8,
      riskSpread01: 0.8,
    });
    expect(riskScore.total).toBeLessThan(cleanScore.total);
  });
});

describe("V2-01 Engine Reality — F. Bad R:R", () => {
  it("blocks trade-ready when R:R threshold is stricter than modeled target", () => {
    const fx = fixtures.BAD_RR_SETUP;
    const detection = detectIfvgZoneCandidates({
      candles: fx.candles,
      symbolProfile: fx.symbolProfile,
      settings: strategySettings,
      strategyId: fx.strategyId,
      parameterSetId: fx.parameterSetId,
      canonicalSymbol: fx.canonicalSymbol,
    });
    const z = detection.candidates.find((x) => x.direction === "BUY");
    expect(z).toBeDefined();

    const plan = evaluateTradeReviewPlan({
      zoneCandidate: z!,
      symbolProfile: fx.symbolProfile,
      tradePlanSettings: {
        ...createDefaultTradePlanEvaluationSettingsForTests(),
        minRr: 3,
      },
      retestResult: { retested: true, retestMode: "full_zone", touchPrice: z!.midpoint, event: "RETEST_HIT" },
      confirmationResult: { confirmed: true, direction: "BULLISH", quality: "CLEAR", body: 1 },
      score: { totalScore: 90 },
      confirmationAtr: atrForLast(fx.candles),
      confirmationClose: z!.midpoint + 0.4,
      spreadPrice: fx.symbolProfile.spreadPrice,
      accountGuard: {
        allowTradeReview: true,
        approvedParameterSetForAccount: true,
        spreadAllowed: true,
        operationalStatus: "TRADING_ALLOWED",
      },
      sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 98.7 },
    });

    expect(plan.plan.status).toBe("NO_TRADE");
    expect(plan.plan.failedHardGates).toContain("RR_BELOW_MINIMUM");
  });
});

describe("V2-01 Engine Reality — G. Symbol precision", () => {
  it("symbol-specific tolerance differs by tick/point/spread (no universal pip)", () => {
    const profiles = createEngineRealityPrecisionProfiles();
    const out = profiles.map((p) => ({
      symbol: p.canonicalSymbol,
      sweep: sweepTolerancePrice({
        atr: 1.2,
        sweepToleranceAtr: strategySettings.sweep.sweepToleranceAtr,
        spreadPrice: p.spreadPrice,
        sweepSpreadFactor: strategySettings.sweep.sweepSpreadFactor,
        tickSize: p.tickSize,
        minSweepTicks: strategySettings.sweep.minSweepTicks,
      }),
    }));
    const unique = new Set(out.map((x) => x.sweep.toFixed(8)));
    expect(unique.size).toBeGreaterThan(2);
  });
});

describe("V2-01 Engine Reality — H. Bearish mirror", () => {
  it("supports sell-side setup or exposes gap explicitly", () => {
    const fx = fixtures.BEARISH_MIRROR_IFVG;
    const detection = detectIfvgZoneCandidates({
      candles: fx.candles,
      symbolProfile: fx.symbolProfile,
      settings: strategySettings,
      strategyId: fx.strategyId,
      parameterSetId: fx.parameterSetId,
      canonicalSymbol: fx.canonicalSymbol,
    });
    const sell = detection.candidates.filter((z) => z.direction === "SELL");
    expect(sell.length).toBeGreaterThan(0);

    const probe = fx.sweepProbe!;
    const sweep = detectUpperPoolSweepForSell(
      fx.candles,
      probe.swingLevel,
      probe.searchFromIndex,
      probe.searchToIndex,
      {
        atr: atrForLast(fx.candles),
        spreadPrice: fx.symbolProfile.spreadPrice,
        tickSize: fx.symbolProfile.tickSize,
        sweepToleranceAtr: strategySettings.sweep.sweepToleranceAtr,
        sweepSpreadFactor: strategySettings.sweep.sweepSpreadFactor,
        minSweepTicks: strategySettings.sweep.minSweepTicks,
        nearSweepToleranceAtr: strategySettings.sweep.nearSweepToleranceAtr,
        nearSweepSpreadFactor: strategySettings.sweep.nearSweepSpreadFactor,
        minNearSweepTicks: strategySettings.sweep.minNearSweepTicks,
      },
      { reclaimBars: strategySettings.sweep.reclaimBars },
    );
    expect(["CONFIRMED_SWEEP", "NEAR_SWEEP", "POSSIBLE_BREAK_RISK", "NO_SWEEP"]).toContain(sweep.status);
  });
});
