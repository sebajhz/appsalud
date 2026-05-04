import { describe, expect, it } from "vitest";
import { evaluateTradeReviewPlan } from "../src/trade-plan-evaluator";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import { roundToTickSize, nearlyEqual } from "../src/normalize";
import type { ZoneCandidate } from "../src/zone-candidate";
import type { TradePlanInput } from "../src/trade-plan-types";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

function zoneBase(over: Partial<ZoneCandidate> = {}): ZoneCandidate {
  return {
    zoneId: "Z_TEST_1",
    strategyId: "MZP_IFVG_V1",
    parameterSetId: "PS_TEST",
    canonicalSymbol: "XAUUSD",
    direction: "BUY",
    zoneLow: 2000,
    zoneHigh: 2010,
    midpoint: 2005,
    invalidationPrice: 1990,
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceIfvgId: "ifvg-1",
    reasonSimple: "",
    reasonTechnical: "",
    initialState: "WAIT_RETEST",
    ...over,
  };
}

function baseInput(over: Partial<TradePlanInput> = {}): TradePlanInput {
  const settings = createDefaultTradePlanEvaluationSettingsForTests();
  return {
    zoneCandidate: zoneBase(),
    symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
    tradePlanSettings: settings,
    retestResult: { retested: true, retestMode: "full_zone", touchPrice: 2004, event: "RETEST_HIT" },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "CLEAR",
      body: 2,
    },
    confirmationAtr: 2,
    confirmationClose: 2008,
    spreadPrice: V1_TEST_SYMBOL_PROFILES.XAUUSD.spreadPrice,
    score: { totalScore: 80 },
    accountGuard: {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
    },
    evaluationTimeIso: "2026-01-02T12:00:00.000Z",
    accountId: "TEST_ACC_V1",
    sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 1998 },
    ...over,
  };
}

describe("Checkpoint 3 — A. SL / TP / R:R (fixed_R)", () => {
  it("BUY: SL below min(zone, sweep) minus buffer; TP at fixed_R; tick-normalized", () => {
    const input = baseInput({
      sweep: { sweepLow: 1998, sweepStatus: "CONFIRMED_SWEEP" },
      confirmationClose: 2008,
    });
    const r = evaluateTradeReviewPlan(input);
    expect(r.plan.status).toBe("TRADE_READY");
    expect(r.plan.stopLoss).not.toBeNull();
    expect(r.plan.takeProfit).not.toBeNull();
    const tick = V1_TEST_SYMBOL_PROFILES.XAUUSD.tickSize;
    const buf = Math.max(
      2 * input.tradePlanSettings.slAtrFactor,
      input.spreadPrice! * input.tradePlanSettings.slSpreadFactor,
      tick * input.tradePlanSettings.minSlTicks,
    );
    const structural = Math.min(2000, 1998);
    const expectedSl = roundToTickSize(structural - buf, tick, "down");
    expect(r.plan.stopLoss).toBe(expectedSl);
    const risk = 2008 - expectedSl;
    const expectedTp = roundToTickSize(2008 + risk * input.tradePlanSettings.rrTarget, tick, "nearest");
    expect(r.plan.takeProfit).toBe(expectedTp);
    expect(r.plan.metrics?.rr).toBeGreaterThanOrEqual(input.tradePlanSettings.minRr - 1e-9);
  });

  it("SELL: SL above max(zoneHigh, sweepHigh) + buffer; TP fixed_R", () => {
    const sym = V1_TEST_SYMBOL_PROFILES.EURUSD;
    const z = zoneBase({
      direction: "SELL",
      canonicalSymbol: "EURUSD",
      zoneLow: 1.08,
      zoneHigh: 1.081,
      midpoint: (1.08 + 1.081) / 2,
      invalidationPrice: 1.0825,
    });
    const input = baseInput({
      zoneCandidate: z,
      symbolProfile: sym,
      confirmationAtr: 0.001,
      spreadPrice: sym.spreadPrice,
      sweep: { sweepHigh: 1.0815, sweepStatus: "CONFIRMED_SWEEP" },
      confirmationClose: 1.0802,
      confirmationResult: {
        confirmed: true,
        direction: "BEARISH",
        quality: "CLEAR",
        body: 0.0003,
      },
    });
    const r = evaluateTradeReviewPlan(input);
    expect(r.plan.status).toBe("TRADE_READY");
    const tick = sym.tickSize;
    const buf = Math.max(
      0.001 * input.tradePlanSettings.slAtrFactor,
      sym.spreadPrice * input.tradePlanSettings.slSpreadFactor,
      tick * input.tradePlanSettings.minSlTicks,
    );
    const structural = Math.max(z.zoneHigh, 1.0815);
    const expectedSl = roundToTickSize(structural + buf, tick, "up");
    expect(r.plan.stopLoss).toBe(expectedSl);
    const risk = expectedSl - 1.0802;
    const expectedTp = roundToTickSize(1.0802 - risk * input.tradePlanSettings.rrTarget, tick, "nearest");
    expect(r.plan.takeProfit).toBe(expectedTp);
  });
});

describe("Checkpoint 3 — B. Status logic", () => {
  it("zone without retest => WAIT_RETEST", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        retestResult: { retested: false, retestMode: "full_zone", touchPrice: null, event: "NONE" },
      }),
    );
    expect(r.plan.status).toBe("WAIT_RETEST");
    expect(r.plan.reasons.some((x) => x.code === "WAITING_FOR_RETEST")).toBe(true);
  });

  it("retest without confirmation => WAIT_CONFIRMATION", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        confirmationResult: {
          confirmed: false,
          direction: "NONE",
          quality: "NONE",
          body: 0.01,
        },
      }),
    );
    expect(r.plan.status).toBe("WAIT_CONFIRMATION");
    expect(r.plan.reasons.some((x) => x.code === "WAITING_FOR_CONFIRMATION")).toBe(true);
  });

  it("confirmation + gates pass => TRADE_READY", () => {
    const r = evaluateTradeReviewPlan(baseInput());
    expect(r.plan.status).toBe("TRADE_READY");
    expect(r.plan.reviewReady).toBe(true);
  });

  it("invalidated zone => INVALIDATED", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        currentPrice: 1989,
      }),
    );
    expect(r.plan.status).toBe("INVALIDATED");
  });

  it("expired zone => EXPIRED", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        zoneCandidate: zoneBase({ expiresAt: "2026-01-01T00:00:00.000Z" }),
        evaluationTimeIso: "2026-06-01T00:00:00.000Z",
      }),
    );
    expect(r.plan.status).toBe("EXPIRED");
  });
});

describe("Checkpoint 3 — C. Hard gates", () => {
  it("SL distance above max ATR multiple => NO_TRADE", () => {
    const s = createDefaultTradePlanEvaluationSettingsForTests();
    const r = evaluateTradeReviewPlan(
      baseInput({
        tradePlanSettings: { ...s, maxSlAtr: 1 },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("SL_DISTANCE_ABOVE_MAX_ATR");
  });

  it("R:R below minimum => NO_TRADE", () => {
    const s = createDefaultTradePlanEvaluationSettingsForTests();
    const r = evaluateTradeReviewPlan(
      baseInput({
        tradePlanSettings: { ...s, minRr: 50 },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("RR_BELOW_MINIMUM");
    expect(r.plan.noTradeReasons.some((x) => x.code === "RR_BELOW_MINIMUM")).toBe(true);
  });

  it("spread not allowed on guard => NO_TRADE", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        accountGuard: {
          allowTradeReview: true,
          approvedParameterSetForAccount: true,
          spreadAllowed: false,
        },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("SPREAD_NOT_ALLOWED");
  });

  it("spread above ceiling => NO_TRADE", () => {
    const s = createDefaultTradePlanEvaluationSettingsForTests();
    const r = evaluateTradeReviewPlan(
      baseInput({
        tradePlanSettings: { ...s, maxSpreadPrice: 0.01 },
        spreadPrice: 0.25,
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("SPREAD_ABOVE_MAX");
  });

  it("daily drawdown blocked => NO_TRADE", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        accountGuard: {
          allowTradeReview: true,
          approvedParameterSetForAccount: true,
          spreadAllowed: true,
          dailyDrawdownBlocked: true,
        },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("DAILY_DRAWDOWN_BLOCKED");
  });

  it("approved parameter set required in prod mode => NO_TRADE", () => {
    const s = createDefaultTradePlanEvaluationSettingsForTests();
    const r = evaluateTradeReviewPlan(
      baseInput({
        tradePlanSettings: { ...s, testOrDevMode: false, requireApprovedParameterSet: true },
        accountGuard: { allowTradeReview: true, spreadAllowed: true },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.failedHardGates).toContain("APPROVED_PARAMETER_SET_REQUIRED");
  });

  it("score below minimum => OBSERVE (not TRADE_READY)", () => {
    const r = evaluateTradeReviewPlan(baseInput({ score: { totalScore: 40 } }));
    expect(r.plan.status).toBe("OBSERVE");
    expect(r.plan.reasons.some((x) => x.code === "SCORE_BELOW_MINIMUM")).toBe(true);
  });
});

describe("Checkpoint 3 — D. Near sweep", () => {
  it("NEAR_SWEEP cannot become TRADE_READY by default", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        sweep: { sweepStatus: "NEAR_SWEEP", sweepLow: 1998 },
      }),
    );
    expect(r.plan.status).toBe("OBSERVE");
    expect(r.plan.reasons.some((x) => x.code === "NEAR_SWEEP_NOT_TRADE_READY")).toBe(true);
  });

  it("CONFIRMED_SWEEP can reach TRADE_READY when gates pass", () => {
    const r = evaluateTradeReviewPlan(
      baseInput({
        sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 1998 },
      }),
    );
    expect(r.plan.status).toBe("TRADE_READY");
  });
});

describe("Checkpoint 3 — E. Symbol normalization", () => {
  it("XAUUSD and EURUSD SL/TP align to tick grid", () => {
    const r1 = evaluateTradeReviewPlan(baseInput());
    const tick1 = V1_TEST_SYMBOL_PROFILES.XAUUSD.tickSize;
    expect(nearlyEqual(r1.plan.stopLoss!, roundToTickSize(r1.plan.stopLoss!, tick1))).toBe(true);
    const r2 = evaluateTradeReviewPlan(
      baseInput({
        zoneCandidate: zoneBase({
          canonicalSymbol: "EURUSD",
          zoneLow: 1.05,
          zoneHigh: 1.051,
          midpoint: (1.05 + 1.051) / 2,
          invalidationPrice: 1.049,
        }),
        symbolProfile: V1_TEST_SYMBOL_PROFILES.EURUSD,
        confirmationAtr: 0.0005,
        spreadPrice: V1_TEST_SYMBOL_PROFILES.EURUSD.spreadPrice,
        confirmationClose: 1.0506,
      }),
    );
    const tick2 = V1_TEST_SYMBOL_PROFILES.EURUSD.tickSize;
    const sl = r2.plan.stopLoss!;
    const tp = r2.plan.takeProfit!;
    expect(nearlyEqual(sl, roundToTickSize(sl, tick2))).toBe(true);
    expect(nearlyEqual(tp, roundToTickSize(tp, tick2))).toBe(true);
  });

  it("BTCUSD and NAS100 tick rounding is stable", () => {
    for (const key of ["BTCUSD", "NAS100"] as const) {
      const sym = V1_TEST_SYMBOL_PROFILES[key];
      const mid = 98123.4;
      const z = zoneBase({
        canonicalSymbol: key,
        direction: "BUY",
        zoneLow: mid - 2,
        zoneHigh: mid + 2,
        midpoint: mid,
        invalidationPrice: mid - 10,
      });
      const r = evaluateTradeReviewPlan(
        baseInput({
          zoneCandidate: z,
          symbolProfile: sym,
          confirmationAtr: 15,
          spreadPrice: sym.spreadPrice,
          confirmationClose: mid + 0.5,
        }),
      );
      const tick = sym.tickSize;
      expect(nearlyEqual(r.plan.stopLoss!, roundToTickSize(r.plan.stopLoss!, tick))).toBe(true);
      expect(nearlyEqual(r.plan.takeProfit!, roundToTickSize(r.plan.takeProfit!, tick))).toBe(true);
    }
  });
});

describe("Checkpoint 3 — F. Reason codes", () => {
  it("blocked plan includes stable reason codes", () => {
    const s = createDefaultTradePlanEvaluationSettingsForTests();
    const r = evaluateTradeReviewPlan(
      baseInput({
        tradePlanSettings: { ...s, minRr: 99 },
      }),
    );
    expect(r.plan.noTradeReasons.map((x) => x.code)).toContain("RR_BELOW_MINIMUM");
  });

  it("TRADE_READY includes review-only reason code", () => {
    const r = evaluateTradeReviewPlan(baseInput());
    expect(r.plan.reasons.map((x) => x.code)).toContain("TRADE_READY_REVIEW_ONLY");
  });
});
