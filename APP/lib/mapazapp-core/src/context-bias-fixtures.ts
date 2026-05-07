/**
 * V2-07 — synthetic HTF candle bundles for context/bias tests (not broker truth).
 */

import type { Candle } from "./candle";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { ContextBiasInput } from "./context-bias-types";
import { createDefaultContextBiasSettingsForTests } from "./context-bias-settings";

const HOUR_MS = 60 * 60 * 1000;

function c(i: number, o: number, h: number, l: number, cl: number, stepMs = HOUR_MS): Candle {
  return { time: Date.UTC(2026, 0, 10) + i * stepMs, open: o, high: h, low: l, close: cl, isClosed: true };
}

/** Clear HH/HL structure with `swingLeftBars: 2`, `swingRightBars: 2`. */
export function buildBullishH4DiscountSeries(): Candle[] {
  const out: Candle[] = [];
  let i = 0;
  const push = (o: number, h: number, l: number, cl: number) => {
    out.push(c(i, o, h, l, cl));
    i++;
  };
  // Base drift up with explicit swing pivots every ~8 bars
  push(100, 100.3, 99.8, 100.1);
  push(100.1, 100.4, 99.9, 100.15);
  push(100.15, 100.5, 100.0, 100.2);
  push(100.2, 100.55, 100.05, 100.25);
  push(100.25, 100.6, 100.1, 100.3);
  push(100.3, 100.9, 100.25, 100.85);
  push(100.85, 101.0, 100.7, 100.9);
  push(100.9, 101.1, 100.8, 100.95);
  push(100.95, 101.15, 100.85, 101.0);
  push(101.0, 101.4, 100.95, 101.35);
  push(101.35, 101.5, 101.2, 101.4);
  push(101.4, 101.55, 101.25, 101.45);
  push(101.45, 101.7, 101.35, 101.65);
  push(101.65, 101.9, 101.55, 101.8);
  push(101.8, 102.0, 101.65, 101.9);
  push(101.9, 102.35, 101.8, 102.25);
  push(102.25, 102.5, 102.1, 102.35);
  push(102.35, 102.55, 102.2, 102.45);
  push(102.45, 102.75, 102.35, 102.65);
  push(102.65, 102.95, 102.5, 102.85);
  push(102.85, 103.1, 102.7, 103.0);
  push(103.0, 103.45, 102.9, 103.35);
  push(103.35, 103.55, 103.2, 103.45);
  push(103.45, 103.65, 103.3, 103.55);
  push(103.55, 103.95, 103.45, 103.85);
  push(103.85, 104.1, 103.7, 104.0);
  push(104.0, 104.25, 103.85, 104.15);
  push(104.15, 104.55, 104.0, 104.45);
  push(104.45, 104.7, 104.3, 104.55);
  push(104.55, 104.8, 104.4, 104.65);
  push(104.65, 105.05, 104.5, 104.95);
  push(104.95, 105.2, 104.8, 105.1);
  push(105.1, 105.35, 104.95, 105.2);
  push(105.2, 105.6, 105.05, 105.5);
  push(105.5, 105.75, 105.35, 105.6);
  push(105.6, 105.85, 105.45, 105.7);
  push(105.7, 106.05, 105.55, 105.95);
  push(105.95, 106.2, 105.8, 106.1);
  push(106.1, 106.35, 105.95, 106.2);
  push(106.2, 106.55, 106.05, 106.45);
  push(106.45, 106.75, 106.3, 106.65);
  push(106.65, 106.9, 106.5, 106.8);
  push(106.8, 107.1, 106.65, 107.0);
  push(107.0, 107.35, 106.85, 107.25);
  push(107.25, 107.5, 107.1, 107.35);
  push(107.35, 107.65, 107.2, 107.55);
  push(107.55, 107.85, 107.4, 107.75);
  push(107.75, 108.0, 107.6, 107.9);
  push(107.9, 108.25, 107.75, 108.15);
  push(108.15, 108.4, 108.0, 108.25);
  push(108.25, 108.55, 108.1, 108.45);
  push(108.45, 108.7, 108.3, 108.55);
  push(108.55, 108.85, 108.4, 108.75);
  push(108.75, 109.0, 108.6, 108.85);
  push(108.85, 109.1, 108.7, 108.95);
  return out;
}

/** Steady downtrend with readable swing / slope bias (synthetic). */
export function buildBearishH4PremiumSeries(): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < 60; i++) {
    const base = 195 - i * 0.25;
    const o = base + 0.02;
    const cl = base - 0.18;
    const h = Math.max(o, cl) + 0.14;
    const l = Math.min(o, cl) - 0.1;
    out.push(c(i, o, h, l, cl));
  }
  return out;
}

/** Ranging — oscillate around mean with HH/HL not sustained. */
export function buildMiddleRangeH4Series(): Candle[] {
  const out: Candle[] = [];
  const mean = 200;
  for (let i = 0; i < 50; i++) {
    const w = Math.sin(i / 3.2) * 1.2;
    const o = mean + w;
    const cl = mean + Math.sin((i + 1) / 3.2) * 1.2;
    const h = Math.max(o, cl) + 0.15;
    const l = Math.min(o, cl) - 0.15;
    out.push(c(i, o, h, l, cl));
  }
  return out;
}

/** Very small bodies vs range — choppy proxy. */
export function buildChoppyH4Series(): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < 50; i++) {
    const mid = 150 + (i % 7) * 0.02;
    const o = mid;
    const cl = mid + (i % 2 === 0 ? 0.02 : -0.02);
    const h = mid + 1.2;
    const l = mid - 1.2;
    out.push(c(i, o, h, l, cl));
  }
  return out;
}

/** Shorter-TF bearish mirror for MTF conflict tests (invert bullish rhythm). */
export function buildBearishH1Series(): Candle[] {
  const pivot = 220;
  const bullSlice = buildBullishH4DiscountSeries().slice(0, 50);
  return bullSlice.map((b, idx) => ({
    time: Date.UTC(2026, 0, 11) + idx * 15 * 60 * 1000,
    open: pivot - b.open,
    high: pivot - b.low,
    low: pivot - b.high,
    close: pivot - b.close,
    isClosed: true,
  }));
}

export function createContextBiasFixtureInputs(): {
  bullishDiscountBuy: ContextBiasInput;
  bearishPremiumSell: ContextBiasInput;
  middleWeak: ContextBiasInput;
  choppyNoTrade: ContextBiasInput;
  mtfConflict: ContextBiasInput;
  insufficient: ContextBiasInput;
} {
  const profile = ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD;
  const settings = createDefaultContextBiasSettingsForTests();
  const bull = buildBullishH4DiscountSeries();
  const bear = buildBearishH4PremiumSeries();
  const discountPrice = bull[Math.floor(bull.length * 0.25)]!.close;
  const bearHi = Math.max(...bear.map((b) => b.high));
  const bearLo = Math.min(...bear.map((b) => b.low));
  const premiumPrice = bearLo + (bearHi - bearLo) * 0.88;

  return {
    bullishDiscountBuy: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings,
      htfCandlesByTimeframe: { H4: bull },
      currentPrice: discountPrice,
      directionToEvaluate: "BUY",
    },
    bearishPremiumSell: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings,
      htfCandlesByTimeframe: { H4: bear },
      currentPrice: premiumPrice,
      directionToEvaluate: "SELL",
    },
    middleWeak: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings,
      htfCandlesByTimeframe: { H4: buildMiddleRangeH4Series() },
      currentPrice: 200,
      directionToEvaluate: null,
    },
    choppyNoTrade: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings: { ...settings, choppyBodyRangeRatioMax: 0.45 },
      htfCandlesByTimeframe: { H4: buildChoppyH4Series() },
      currentPrice: 152,
      directionToEvaluate: "BUY",
    },
    mtfConflict: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings,
      htfCandlesByTimeframe: {
        H4: buildBullishH4DiscountSeries(),
        H1: buildBearishH1Series(),
      },
      currentPrice: buildBullishH4DiscountSeries()[40]!.close,
      directionToEvaluate: "BUY",
    },
    insufficient: {
      canonicalSymbol: "XAUUSD",
      symbolProfile: profile,
      settings,
      htfCandlesByTimeframe: { H4: bull.slice(0, 8) },
      currentPrice: 101,
      directionToEvaluate: "BUY",
    },
  };
}
