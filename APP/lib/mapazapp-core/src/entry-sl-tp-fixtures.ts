import type { Candle } from "./candle";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { EntrySlTpModelInput } from "./entry-sl-tp-types";
import type { ZoneCandidate } from "./zone-candidate";
import { createDefaultEntrySlTpSettingsForTests } from "./entry-sl-tp-model";

export type EntrySlTpFixtureId =
  | "CLEAN_BUY_FIXED_R"
  | "CLEAN_SELL_FIXED_R"
  | "BAD_RR_TOO_CLOSE"
  | "REWARD_SHORTER_THAN_RISK"
  | "PASSED_TRADE_CHASE"
  | "BEYOND_SWEEP_SL"
  | "OPPOSING_LIQUIDITY_TP"
  | "HYBRID_TP"
  | "EURUSD_PRECISION_ZONE"
  | "REPLAY_CHAIN_BUY";

const BASE_MS = Date.UTC(2026, 0, 3, 12, 0, 0);
const STEP_MS = 15 * 60 * 1000;

export function entrySlTpFixtureCandle(i: number, o: number, h: number, l: number, c: number): Candle {
  return { time: BASE_MS + i * STEP_MS, open: o, high: h, low: l, close: c, isClosed: true };
}

function zoneBuy(low: number, high: number): ZoneCandidate {
  const mid = (low + high) / 2;
  return {
    zoneId: "Z_V203_BUY" as never,
    strategyId: "MZP_IFVG_ZONE_REACTION_V1" as never,
    canonicalSymbol: "XAUUSD",
    direction: "BUY",
    zoneLow: low,
    zoneHigh: high,
    midpoint: mid,
    invalidationPrice: low - 2,
    createdAt: "2026-01-03T12:00:00.000Z",
    sourceIfvgId: "IFVG_V203_B",
    reasonSimple: "fixture",
    reasonTechnical: "fixture",
    initialState: "WAIT_RETEST",
  };
}

function zoneSell(low: number, high: number): ZoneCandidate {
  const mid = (low + high) / 2;
  return {
    zoneId: "Z_V203_SELL" as never,
    strategyId: "MZP_IFVG_ZONE_REACTION_V1" as never,
    canonicalSymbol: "XAUUSD",
    direction: "SELL",
    zoneLow: low,
    zoneHigh: high,
    midpoint: mid,
    invalidationPrice: high + 2,
    createdAt: "2026-01-03T12:00:00.000Z",
    sourceIfvgId: "IFVG_V203_S",
    reasonSimple: "fixture",
    reasonTechnical: "fixture",
    initialState: "WAIT_RETEST",
  };
}

export function createEntrySlTpFixtures(): Record<EntrySlTpFixtureId, EntrySlTpModelInput> {
  const baseSettings = () => {
    const s = createDefaultEntrySlTpSettingsForTests();
    s.atrBufferMultiplier = 0.35;
    s.spreadMultiplier = 1.25;
    s.minTicks = 3;
    s.fallbackAtrPrice = 0.5;
    s.minRr = 2;
    s.fixedRTarget = 2;
    s.entryMode = "zone_midpoint";
    s.slMode = "beyond_zone";
    s.tpMode = "fixed_r";
    return s;
  };

  return {
    CLEAN_BUY_FIXED_R: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      settings: baseSettings(),
    },
    CLEAN_SELL_FIXED_R: {
      zoneCandidate: zoneSell(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      settings: (() => {
        const s = baseSettings();
        s.zoneEdgePreference = "high";
        return s;
      })(),
    },
    BAD_RR_TOO_CLOSE: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      settings: (() => {
        const s = baseSettings();
        s.fixedRTarget = 1.2;
        s.minRr = 2;
        return s;
      })(),
    },
    REWARD_SHORTER_THAN_RISK: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      settings: (() => {
        const s = baseSettings();
        s.tpMode = "explicit";
        return s;
      })(),
      explicitTp: 100.35,
    },
    PASSED_TRADE_CHASE: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      currentPrice: 100.5,
      settings: (() => {
        const s = baseSettings();
        s.lateTradePolicy = "observe_only";
        return s;
      })(),
    },
    BEYOND_SWEEP_SL: {
      zoneCandidate: zoneBuy(99.85, 100.15),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      sweepLow: 99.35,
      settings: (() => {
        const s = baseSettings();
        s.slMode = "beyond_sweep";
        return s;
      })(),
    },
    OPPOSING_LIQUIDITY_TP: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      opposingLiquidityPrice: 102.4,
      settings: (() => {
        const s = baseSettings();
        s.tpMode = "opposing_liquidity";
        return s;
      })(),
    },
    HYBRID_TP: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      opposingLiquidityPrice: 101.2,
      settings: (() => {
        const s = baseSettings();
        s.tpMode = "hybrid_fixed_r_or_liquidity";
        s.fixedRTarget = 2;
        s.minMeaningfulRewardR = 0.2;
        return s;
      })(),
    },
    EURUSD_PRECISION_ZONE: {
      zoneCandidate: {
        zoneId: "Z_V203_EUR" as never,
        strategyId: "MZP_IFVG_ZONE_REACTION_V1" as never,
        canonicalSymbol: "EURUSD",
        direction: "BUY",
        zoneLow: 1.10005,
        zoneHigh: 1.10025,
        midpoint: 1.10015,
        invalidationPrice: 1.0995,
        createdAt: "2026-01-03T12:00:00.000Z",
        sourceIfvgId: "IFVG_V203_E",
        reasonSimple: "fixture",
        reasonTechnical: "fixture",
        initialState: "WAIT_RETEST",
      },
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.EURUSD,
      atr: 0.0004,
      settings: baseSettings(),
    },
    REPLAY_CHAIN_BUY: {
      zoneCandidate: zoneBuy(99.9, 100.1),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      recentCandles: [
        entrySlTpFixtureCandle(0, 100.6, 100.8, 99.95, 100.4),
        entrySlTpFixtureCandle(1, 100.4, 101.4, 100.05, 101.1),
        entrySlTpFixtureCandle(2, 101.1, 102.2, 100.9, 102.0),
      ],
      settings: baseSettings(),
    },
  };
}
