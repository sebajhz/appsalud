import type { Candle } from "./candle";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { ReplayTradeInput } from "./replay-trade-types";

export type ReplayTradeFixtureId =
  | "CLEAN_BUY_TP"
  | "CLEAN_BUY_SL"
  | "EXPIRED_BEFORE_ENTRY"
  | "MISSED_BEFORE_ENTRY"
  | "SAME_CANDLE_AMBIGUOUS"
  | "SELL_TP"
  | "BAD_RR_INVALID"
  | "SYMBOL_PRECISION_COMPARISON";

const BASE_TIME_MS = Date.UTC(2026, 0, 2, 0, 0, 0);
const STEP_MS = 15 * 60 * 1000;

function c(i: number, open: number, high: number, low: number, close: number): Candle {
  return { time: BASE_TIME_MS + i * STEP_MS, open, high, low, close, isClosed: true };
}

export function createReplayTradeFixtures(): Record<ReplayTradeFixtureId, ReplayTradeInput> {
  const buyBase = {
    direction: "BUY" as const,
    entryPrice: 100,
    entryAreaLow: 99.9,
    entryAreaHigh: 100.1,
    stopLoss: 99,
    takeProfit: 102,
    entryModel: "zone_touch" as const,
    exitModel: "explicit_tp_sl" as const,
  };

  return {
    CLEAN_BUY_TP: {
      ...buyBase,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [
        c(0, 100.6, 100.8, 99.95, 100.4),
        c(1, 100.4, 101.4, 100.1, 101.2),
        c(2, 101.2, 102.2, 100.9, 102.0),
      ],
    },
    CLEAN_BUY_SL: {
      ...buyBase,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [
        c(0, 100.6, 100.8, 99.96, 100.2),
        c(1, 100.2, 100.3, 98.9, 99.1),
      ],
    },
    EXPIRED_BEFORE_ENTRY: {
      ...buyBase,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      expiresAfterBars: 1,
      candles: [
        c(0, 100.6, 100.7, 100.35, 100.6),
        c(1, 100.6, 100.8, 100.3, 100.5),
      ],
    },
    MISSED_BEFORE_ENTRY: {
      ...buyBase,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      settings: { missedIfMovesTowardTargetR: 0.75 },
      candles: [
        c(0, 101.0, 101.0, 100.6, 100.9),
        c(1, 100.9, 101.0, 100.7, 100.95),
      ],
    },
    SAME_CANDLE_AMBIGUOUS: {
      ...buyBase,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [c(0, 100.0, 102.2, 98.9, 100.3)],
    },
    SELL_TP: {
      direction: "SELL",
      entryPrice: 100,
      entryAreaLow: 99.9,
      entryAreaHigh: 100.1,
      stopLoss: 101,
      takeProfit: 98,
      entryModel: "zone_touch",
      exitModel: "explicit_tp_sl",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [
        c(0, 99.8, 100.1, 99.7, 99.9),
        c(1, 99.9, 100.0, 97.8, 98.2),
      ],
    },
    BAD_RR_INVALID: {
      ...buyBase,
      takeProfit: 100.2,
      settings: { minRr: 1 },
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [c(0, 100.2, 100.3, 99.9, 100.1)],
    },
    SYMBOL_PRECISION_COMPARISON: {
      ...buyBase,
      direction: "BUY",
      entryPrice: 1.10015,
      entryAreaLow: 1.1001,
      entryAreaHigh: 1.1002,
      stopLoss: 1.09915,
      takeProfit: 1.10215,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.EURUSD,
      candles: [
        c(0, 1.1003, 1.1004, 1.10012, 1.1002),
        c(1, 1.1002, 1.1022, 1.1001, 1.102),
      ],
      entryModel: "zone_touch",
      exitModel: "explicit_tp_sl",
    },
  };
}
