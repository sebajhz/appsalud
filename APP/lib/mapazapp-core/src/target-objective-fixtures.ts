/**
 * V2-09 — deterministic target objective fixtures (not broker truth).
 */

import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { Candle } from "./candle";
import type { TargetObjectiveInput } from "./target-objective-types";
import { createDefaultTargetObjectiveSettingsForTests } from "./target-objective-settings";

const BASE_MS = Date.UTC(2026, 1, 4, 12, 0, 0);
const STEP = 15 * 60 * 1000;

function candle(i: number, o: number, h: number, l: number, c: number): Candle {
  return { time: BASE_MS + i * STEP, open: o, high: h, low: l, close: c, isClosed: true };
}

/** Uptrend swings: higher highs for BUY previous-high objective. */
export function targetObjectiveFixtureSwingCandles(): Candle[] {
  return [
    candle(0, 100, 101, 99.5, 100.2),
    candle(1, 100.2, 102, 100, 101.5),
    candle(2, 101.5, 103, 101, 102.4),
    candle(3, 102.4, 104, 102, 103.2),
    candle(4, 103.2, 105, 103, 104.5),
    candle(5, 104.5, 106, 104, 105.1),
    candle(6, 105.1, 107, 105, 106),
    candle(7, 106, 108, 105.8, 107.2),
    candle(8, 107.2, 109, 107, 108),
  ];
}

/** Clear pivot high at bar 5 for `swingLeftBars: 2`, `swingRightBars: 2` (fixture). */
export function targetObjectiveClearSwingHighCandles(): Candle[] {
  return [
    candle(0, 100, 100.4, 99.5, 100.05),
    candle(1, 100.05, 100.4, 99.6, 100.05),
    candle(2, 100.05, 100.4, 99.6, 100.05),
    candle(3, 100.05, 100.4, 99.6, 100.05),
    candle(4, 100.05, 100.25, 99.6, 100.1),
    candle(5, 100.1, 106.0, 100.0, 105.0),
    candle(6, 105.0, 105.2, 104.5, 104.8),
    candle(7, 104.8, 105.0, 104.4, 104.6),
  ];
}

export type TargetObjectiveFixtureId =
  | "BUY_FIXED_R_IDEAL"
  | "SELL_FIXED_R_MIRROR"
  | "BUY_LIQUIDITY_BEATS_FIXED"
  | "BUY_TOO_CLOSE"
  | "BUY_ALREADY_REACHED"
  | "SELL_PREVIOUS_LOW"
  | "RANGE_EXTREME_BUY"
  | "TARGET_TOO_FAR"
  | "HYBRID_BEST"
  | "BAD_RR_REJECTED";

export function createTargetObjectiveFixtures(): Record<TargetObjectiveFixtureId, TargetObjectiveInput> {
  const profile = ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD;
  const base = (): TargetObjectiveInput => ({
    direction: "BUY",
    entryPrice: 100,
    stopLossPrice: 99,
    symbolProfile: profile,
    atrPrice: 0.5,
    spreadPrice: profile.spreadPrice,
    settings: createDefaultTargetObjectiveSettingsForTests(),
  });

  const sFixed = createDefaultTargetObjectiveSettingsForTests();
  sFixed.mode = "fixed_r";
  sFixed.minRr = 1;
  sFixed.recommendedMinRr = 2;
  sFixed.fixedRTarget = 2;

  const sHybrid = createDefaultTargetObjectiveSettingsForTests();
  sHybrid.mode = "hybrid_best_available";
  sHybrid.minRr = 1;
  sHybrid.recommendedMinRr = 1.5;
  sHybrid.fixedRTarget = 2;
  sHybrid.preferLiquidityWhenBeatsFixedR = true;

  return {
    BUY_FIXED_R_IDEAL: {
      ...base(),
      settings: sFixed,
    },
    SELL_FIXED_R_MIRROR: {
      direction: "SELL",
      entryPrice: 100,
      stopLossPrice: 101,
      symbolProfile: profile,
      atrPrice: 0.5,
      spreadPrice: profile.spreadPrice,
      settings: { ...sFixed, mode: "fixed_r" },
    },
    BUY_LIQUIDITY_BEATS_FIXED: {
      ...base(),
      opposingLiquidityPrice: 104,
      settings: { ...sHybrid, fixedRTarget: 2 },
    },
    BUY_TOO_CLOSE: {
      ...base(),
      currentPrice: 101.9,
      settings: { ...sFixed, mode: "fixed_r", fixedRTarget: 2, tooCloseToTargetR: 0.5 },
    },
    BUY_ALREADY_REACHED: {
      ...base(),
      currentPrice: 102.02,
      settings: { ...sFixed, mode: "fixed_r", fixedRTarget: 2, bufferTicksForAlreadyReached: 1 },
    },
    SELL_PREVIOUS_LOW: {
      direction: "SELL",
      entryPrice: 100,
      stopLossPrice: 101,
      symbolProfile: profile,
      structureLow: 97,
      atrPrice: 0.5,
      settings: { ...createDefaultTargetObjectiveSettingsForTests(), mode: "structure_level", minRr: 1 },
    },
    RANGE_EXTREME_BUY: {
      ...base(),
      rangeHigh: 103.5,
      settings: { ...createDefaultTargetObjectiveSettingsForTests(), mode: "range_extreme", minRr: 1 },
    },
    TARGET_TOO_FAR: {
      ...base(),
      opposingLiquidityPrice: 130,
      settings: {
        ...createDefaultTargetObjectiveSettingsForTests(),
        mode: "opposing_liquidity",
        targetTooFarAtrMultiple: 2,
        minRr: 1,
      },
    },
    HYBRID_BEST: {
      ...base(),
      opposingLiquidityPrice: 103.5,
      settings: sHybrid,
    },
    BAD_RR_REJECTED: {
      ...base(),
      settings: {
        ...createDefaultTargetObjectiveSettingsForTests(),
        mode: "fixed_r",
        fixedRTarget: 0.5,
        minRr: 1.5,
        allowRewardShorterThanRisk: false,
      },
    },
  };
}
