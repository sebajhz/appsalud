import { describe, expect, it } from "vitest";
import { calculateATR, calculateAtrSeries, calculateTrueRange } from "../src/atr";
import type { Candle } from "../src/candle";
import { detectConfirmation } from "../src/confirmation-detector";
import { detectDisplacement } from "../src/displacement";
import { detectFvgAtIndex } from "../src/fvg-detector";
import { tryConvertFvgToIfvg } from "../src/ifvg-converter";
import {
  detectLowerPoolSweepForBuy,
  detectUpperPoolSweepForSell,
} from "../src/liquidity-sweep";
import { roundToTickSize, zonePaddingPrice } from "../src/normalize";
import { computeStrategyScore } from "../src/strategy-score";
import { detectIfvgZoneCandidates } from "../src/strategy-detection";
import { createDefaultIfvgStrategySettingsForTests } from "../src/strategy-settings";
import { detectSwings } from "../src/swing-detector";
import { buildZoneCandidateFromIfvg } from "../src/zone-candidate";
import { detectRetest } from "../src/retest-detector";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

function bar(t: number, o: number, h: number, l: number, cl: number): Candle {
  return { time: t * 60_000, open: o, high: h, low: l, close: cl, isClosed: true };
}

describe("Checkpoint 2 — A. Swing detection", () => {
  it("detects swing high", () => {
    const candles: Candle[] = [
      bar(0, 100, 100, 99, 99.5),
      bar(1, 99.5, 101, 99, 100),
      bar(2, 100, 102, 99.5, 101),
      bar(3, 101, 110, 100.5, 109),
      bar(4, 109, 109.5, 100, 101),
      bar(5, 101, 102, 100, 101),
      bar(6, 101, 103, 100.5, 102),
    ];
    const swings = detectSwings(candles, { swingLeftBars: 2, swingRightBars: 2 });
    const sh = swings.find((s) => s.type === "HIGH");
    expect(sh).toBeDefined();
    expect(sh!.index).toBe(3);
    expect(sh!.price).toBe(110);
  });

  it("detects swing low", () => {
    const candles: Candle[] = [
      bar(0, 100, 101, 99.5, 100),
      bar(1, 100, 101, 99, 100),
      bar(2, 100, 101, 98, 99),
      bar(3, 99, 100, 85, 90),
      bar(4, 90, 92, 88, 91),
      bar(5, 91, 94, 90, 93),
      bar(6, 93, 95, 92, 94),
    ];
    const swings = detectSwings(candles, { swingLeftBars: 2, swingRightBars: 2 });
    const sl = swings.find((s) => s.type === "LOW");
    expect(sl).toBeDefined();
    expect(sl!.index).toBe(3);
    expect(sl!.price).toBe(85);
  });

  it("does not emit swing without enough right bars (truncated series)", () => {
    const full: Candle[] = [
      bar(0, 100, 100, 99, 99.5),
      bar(1, 99.5, 101, 99, 100),
      bar(2, 100, 102, 99.5, 101),
      bar(3, 101, 110, 100.5, 109),
      bar(4, 109, 109.5, 100, 101),
    ];
    const swings = detectSwings(full, { swingLeftBars: 2, swingRightBars: 2 });
    expect(swings.find((s) => s.type === "HIGH")).toBeUndefined();
  });
});

describe("Checkpoint 2 — B. Sweep / near sweep", () => {
  const ctx = {
    atr: 1,
    spreadPrice: 0,
    tickSize: 0.01,
    sweepToleranceAtr: 0.05,
    sweepSpreadFactor: 1,
    minSweepTicks: 0,
    nearSweepToleranceAtr: 0.02,
    nearSweepSpreadFactor: 0,
    minNearSweepTicks: 0,
  };

  it("confirmed lower sweep + reclaim", () => {
    const swingLow = 100;
    const candles: Candle[] = [
      bar(0, 101, 102, 100.5, 101),
      bar(1, 101, 101.5, 94, 95),
      bar(2, 95, 99, 94.5, 100.5),
    ];
    const r = detectLowerPoolSweepForBuy(candles, swingLow, 0, 2, ctx, { reclaimBars: 3 });
    expect(r.status).toBe("CONFIRMED_SWEEP");
    expect(r.reclaimIndex).toBe(2);
  });

  it("near lower sweep (no full penetration)", () => {
    const swingLow = 100;
    const sweepTol = 0.05 * ctx.atr;
    const line = swingLow - sweepTol;
    const candles: Candle[] = [bar(0, 101, 102, line + 0.005, 101)];
    const r = detectLowerPoolSweepForBuy(candles, swingLow, 0, 0, ctx, { reclaimBars: 2 });
    expect(r.status).toBe("NEAR_SWEEP");
  });

  it("upper sweep without reclaim => possible break risk", () => {
    const swingHigh = 200;
    const ctxSell = {
      atr: 1,
      spreadPrice: 0,
      tickSize: 0.01,
      sweepToleranceAtr: 0.05,
      sweepSpreadFactor: 1,
      minSweepTicks: 0,
      nearSweepToleranceAtr: 0.02,
      nearSweepSpreadFactor: 0,
      minNearSweepTicks: 0,
    };
    const candles: Candle[] = [
      bar(0, 199, 200.5, 198, 199),
      bar(1, 199, 210, 198, 205),
      bar(2, 205, 206, 204, 205.5),
    ];
    const r = detectUpperPoolSweepForSell(candles, swingHigh, 0, 2, ctxSell, { reclaimBars: 2 });
    expect(r.status).toBe("POSSIBLE_BREAK_RISK");
    expect(r.reclaimIndex).toBeNull();
  });
});

describe("Checkpoint 2 — C. Displacement", () => {
  const settings = {
    displacementBodyFactor: 0.2,
    closePositionMinBuy: 0.55,
    closePositionMaxSell: 0.45,
    minDisplacementAtr: 0,
  };

  it("bullish displacement passes", () => {
    const prev = bar(0, 100, 101, 99.5, 100);
    const cur = bar(1, 100, 105, 99, 104);
    const d = detectDisplacement(cur, prev, 2, settings);
    expect(d.direction).toBe("BULLISH");
  });

  it("weak candle fails", () => {
    const prev = bar(0, 100, 101, 99.5, 100);
    const cur = bar(1, 100, 100.5, 99.9, 100.1);
    const d = detectDisplacement(cur, prev, 2, settings);
    expect(d.direction).toBe("NONE");
  });

  it("bearish displacement passes", () => {
    const prev = bar(0, 100, 101, 99.5, 100.5);
    const cur = bar(1, 100.5, 101, 96, 96.5);
    const d = detectDisplacement(cur, prev, 2, settings);
    expect(d.direction).toBe("BEARISH");
  });
});

describe("Checkpoint 2 — D. FVG / IFVG", () => {
  it("detects bullish FVG", () => {
    const candles: Candle[] = [
      bar(0, 100, 100, 99, 99.5),
      bar(1, 99.5, 100, 99, 99.5),
      bar(2, 99.5, 101, 100.5, 100.8),
    ];
    const fvg = detectFvgAtIndex(candles, 1, 0.5, { fvgMinSizeAtr: 0.01, fvgMaxSizeAtr: 5 }, "f1");
    expect(fvg).not.toBeNull();
    expect(fvg!.direction).toBe("BULLISH");
    expect(fvg!.fvgLow).toBe(100);
    expect(fvg!.fvgHigh).toBe(100.5);
  });

  it("detects bearish FVG", () => {
    const candles: Candle[] = [
      bar(0, 100, 101, 100, 100.5),
      bar(1, 100.5, 101, 100.2, 100.4),
      bar(2, 100.4, 99.2, 98.5, 99),
    ];
    const fvg = detectFvgAtIndex(candles, 1, 0.5, { fvgMinSizeAtr: 0.01, fvgMaxSizeAtr: 5 }, "f2");
    expect(fvg).not.toBeNull();
    expect(fvg!.direction).toBe("BEARISH");
    expect(fvg!.fvgLow).toBe(99.2);
    expect(fvg!.fvgHigh).toBe(100);
  });

  it("bearish FVG -> bullish IFVG after upside invalidation (close mode)", () => {
    const candles: Candle[] = [
      bar(0, 100, 101, 100, 100.5),
      bar(1, 100.5, 101, 100.2, 100.4),
      bar(2, 100.4, 99.2, 98.5, 99),
      bar(3, 99, 106, 98.5, 105),
    ];
    const fvg = detectFvgAtIndex(candles, 1, 0.5, { fvgMinSizeAtr: 0.01, fvgMaxSizeAtr: 5 }, "f2");
    expect(fvg).toBeTruthy();
    const atrSeries = candles.map((_, i) => (i >= 1 ? 0.5 : null));
    const ifvg = tryConvertFvgToIfvg(
      fvg!,
      candles,
      atrSeries,
      0.25,
      0.01,
      {
        ifvgBreakMode: "close",
        ifvgBreakBufferAtr: 0.01,
        ifvgBreakSpreadFactor: 0,
        minIfvgBreakTicks: 0,
        maxBarsFromFvgToIfvg: 5,
      },
      "if1",
    );
    expect(ifvg).not.toBeNull();
    expect(ifvg!.direction).toBe("BULLISH");
  });

  it("bullish FVG -> bearish IFVG after downside invalidation", () => {
    const candles: Candle[] = [
      bar(0, 100, 100, 99, 99.5),
      bar(1, 99.5, 100, 99, 99.5),
      bar(2, 99.5, 101, 100.5, 100.8),
      bar(3, 100.8, 101, 98, 98.5),
    ];
    const fvg = detectFvgAtIndex(candles, 1, 0.5, { fvgMinSizeAtr: 0.01, fvgMaxSizeAtr: 5 }, "fb");
    expect(fvg?.direction).toBe("BULLISH");
    const atrSeries = candles.map(() => 0.5);
    const ifvg = tryConvertFvgToIfvg(
      fvg!,
      candles,
      atrSeries,
      0.25,
      0.01,
      {
        ifvgBreakMode: "close",
        ifvgBreakBufferAtr: 0.01,
        ifvgBreakSpreadFactor: 0,
        minIfvgBreakTicks: 0,
        maxBarsFromFvgToIfvg: 5,
      },
      "if2",
    );
    expect(ifvg?.direction).toBe("BEARISH");
  });
});

describe("Checkpoint 2 — E. Zone candidate", () => {
  it("builds padded zone from IFVG and respects tick precision", () => {
    const spec = V1_TEST_SYMBOL_PROFILES.XAUUSD;
    const ifvg = {
      id: "if_test",
      direction: "BULLISH" as const,
      ifvgLow: 2000,
      ifvgHigh: 2001,
      sourceFvgId: "f",
      invalidationIndex: 5,
      time: 5,
    };
    const z = buildZoneCandidateFromIfvg({
      ifvg,
      symbolProfile: spec,
      atr: 2,
      zonePaddingAtrFactor: 0.05,
      zonePaddingSpreadFactor: 1,
      minZoneTicks: 2,
      zoneId: "Z1",
      strategyId: "MZP_IFVG_ZONE_REACTION_V1",
      canonicalSymbol: "XAUUSD",
      sweepStatus: "CONFIRMED_SWEEP",
      createdAtIso: "2026-01-01T00:00:00.000Z",
    });
    expect(z.direction).toBe("BUY");
    expect(z.initialState).toBe("WAIT_RETEST");
    const pad = zonePaddingPrice({
      atr: 2,
      zonePaddingAtrFactor: 0.05,
      spreadPrice: spec.spreadPrice,
      zonePaddingSpreadFactor: 1,
      tickSize: spec.tickSize,
      minZoneTicks: 2,
    });
    expect(z.zoneHigh).toBe(roundToTickSize(2001 + pad, spec.tickSize, "up"));
    expect(z.initialState === "TRADE_READY").toBe(false);
  });
});

describe("Checkpoint 2 — F. Retest / confirmation", () => {
  it("full_zone retest", () => {
    const c = bar(0, 100, 102, 99, 101);
    const r = detectRetest(c, 100.5, 101.5, 101, "BUY", "full_zone");
    expect(r.retested).toBe(true);
    expect(r.event).toBe("RETEST_HIT");
  });

  it("midpoint retest buy", () => {
    const c = bar(0, 100, 101, 100.2, 100.5);
    const r = detectRetest(c, 100, 102, 101, "BUY", "midpoint");
    expect(r.retested).toBe(true);
  });

  it("buy confirmation after retest", () => {
    const prev = bar(0, 100, 101, 99.5, 100);
    const cur = bar(1, 100, 103, 99, 102);
    const conf = detectConfirmation(cur, prev, "BUY", 100.5, 1.5, {
      confirmationMinBodyAtr: 0.05,
      wickConfirmationEnabled: false,
      wickBodyRatio: 1,
    });
    expect(conf.confirmed).toBe(true);
  });

  it("sell confirmation after retest", () => {
    const prev = bar(0, 100, 102, 99.5, 101);
    const cur = bar(1, 101, 101.5, 97, 97.5);
    const conf = detectConfirmation(cur, prev, "SELL", 100.5, 1.5, {
      confirmationMinBodyAtr: 0.05,
      wickConfirmationEnabled: false,
      wickBodyRatio: 1,
    });
    expect(conf.confirmed).toBe(true);
  });
});

describe("Checkpoint 2 — G. Score", () => {
  it("confirmed sweep scores higher than near sweep", () => {
    const base = {
      contextAlign01: 0.8,
      displacement01: 0.8,
      ifvg01: 0.8,
      retest01: 0.5,
      confirmation01: 0.5,
      riskSpread01: 0.8,
    };
    const sConf = computeStrategyScore({ ...base, sweepStatus: "CONFIRMED_SWEEP" });
    const sNear = computeStrategyScore({ ...base, sweepStatus: "NEAR_SWEEP" });
    expect(sConf.total).toBeGreaterThan(sNear.total);
  });

  it("hard gate failure forces NO_TRADE classification", () => {
    const s = computeStrategyScore({
      contextAlign01: 1,
      sweepStatus: "CONFIRMED_SWEEP",
      displacement01: 1,
      ifvg01: 1,
      retest01: 1,
      confirmation01: 1,
      riskSpread01: 1,
      hardGates: {
        hasSymbolProfile: false,
        hasApprovedParameterSet: true,
        tradingAllowed: true,
        operationalAllowsTrade: true,
        liquidityAndSessionOk: true,
      },
    });
    expect(s.hardGatesFailed).toBe(true);
    expect(s.classification).toBe("NO_TRADE");
    expect(s.total).toBeLessThanOrEqual(44);
  });
});

describe("Checkpoint 2 — H. Pipeline smoke", () => {
  it("synthetic path yields BUY zone candidate (bullish IFVG)", () => {
    const settings = createDefaultIfvgStrategySettingsForTests();
    settings.atrPeriod = 5;
    settings.fvg.fvgMinSizeAtr = 0.001;
    settings.fvg.fvgMaxSizeAtr = 50;
    settings.ifvg.maxBarsFromFvgToIfvg = 10;
    settings.ifvg.ifvgBreakBufferAtr = 0.001;
    const candles: Candle[] = [];
    for (let i = 0; i < 12; i++) {
      candles.push(bar(i, 100, 100.6, 99.7, 100.2));
    }
    candles.push(bar(12, 100.2, 100.6, 100, 100.35));
    candles.push(bar(13, 100.35, 100.55, 100.1, 100.4));
    candles.push(bar(14, 100.4, 99.6, 99.2, 99.4));
    candles.push(bar(15, 99.4, 106, 99.2, 105.5));

    const res = detectIfvgZoneCandidates({
      candles,
      symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
      settings,
      strategyId: "MZP_IFVG_ZONE_REACTION_V1",
      canonicalSymbol: "XAUUSD",
    });
    expect(res.diagnostics.ifvgCount).toBeGreaterThan(0);
    const buy = res.candidates.filter((c) => c.direction === "BUY");
    expect(buy.length).toBeGreaterThan(0);
  });

  it("synthetic path yields SELL zone candidate (bearish IFVG)", () => {
    const settings = createDefaultIfvgStrategySettingsForTests();
    settings.atrPeriod = 5;
    settings.fvg.fvgMinSizeAtr = 0.001;
    settings.fvg.fvgMaxSizeAtr = 50;
    settings.ifvg.maxBarsFromFvgToIfvg = 10;
    settings.ifvg.ifvgBreakBufferAtr = 0.001;
    const candles: Candle[] = [];
    for (let i = 0; i < 12; i++) {
      candles.push(bar(i, 100, 100.6, 99.7, 100.2));
    }
    candles.push(bar(12, 100.2, 100.35, 100.05, 100.15));
    candles.push(bar(13, 100.15, 100.3, 100.08, 100.12));
    candles.push(bar(14, 100.12, 101.8, 101.45, 101.6));
    candles.push(bar(15, 101.6, 101.7, 99.5, 99.8));

    const res = detectIfvgZoneCandidates({
      candles,
      symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
      settings,
      strategyId: "MZP_IFVG_ZONE_REACTION_V1",
      canonicalSymbol: "XAUUSD",
    });
    expect(res.diagnostics.ifvgCount).toBeGreaterThan(0);
    const sell = res.candidates.filter((c) => c.direction === "SELL");
    expect(sell.length).toBeGreaterThan(0);
  });

  it("pipeline diagnostics include FVG count on synthetic series", () => {
    const settings = createDefaultIfvgStrategySettingsForTests();
    settings.atrPeriod = 5;
    settings.fvg.fvgMinSizeAtr = 0.001;
    const candles: Candle[] = [];
    for (let i = 0; i < 12; i++) {
      candles.push(bar(i, 100, 100.6, 99.7, 100.2));
    }
    candles.push(bar(12, 100.2, 100.6, 100, 100.35));
    candles.push(bar(13, 100.35, 100.55, 100.1, 100.4));
    candles.push(bar(14, 100.4, 99.6, 99.2, 99.4));
    candles.push(bar(15, 99.4, 106, 99.2, 105.5));
    const atr = calculateAtrSeries(candles, settings.atrPeriod);
    const fvg = detectFvgAtIndex(candles, 13, atr[13] ?? null, settings.fvg, "fx");
    expect(fvg).not.toBeNull();
  });
});

describe("Checkpoint 2 — ATR helper", () => {
  it("calculateTrueRange without previous uses range only", () => {
    const c = bar(0, 100, 110, 95, 100);
    expect(calculateTrueRange(c, undefined)).toBe(15);
  });

  it("calculateATR returns null when insufficient candles", () => {
    const candles = [bar(0, 1, 2, 0.5, 1), bar(1, 1, 2, 0.5, 1.5)];
    expect(calculateATR(candles, 14)).toBeNull();
  });
});
