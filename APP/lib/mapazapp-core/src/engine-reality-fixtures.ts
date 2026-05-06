import type { Candle } from "./candle";
import type { CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import { createDefaultIfvgStrategySettingsForTests, type IfvgStrategySettings } from "./strategy-settings";
import type { SymbolMarketSpec } from "./symbol-profile";

export type EngineRealityFixtureId =
  | "CLEAN_BULLISH_IFVG"
  | "NEAR_SWEEP_BULLISH_IFVG"
  | "OVER_SWEEP_BREAK_RISK"
  | "LATE_TRADE_ALREADY_PASSED"
  | "BAD_RR_SETUP"
  | "BEARISH_MIRROR_IFVG";

export interface EngineRealitySweepProbe {
  side: "BUY" | "SELL";
  swingLevel: number;
  searchFromIndex: number;
  searchToIndex: number;
}

export interface EngineRealityFixture {
  fixtureId: EngineRealityFixtureId;
  title: string;
  timeframe: "M15";
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  symbolProfile: SymbolMarketSpec;
  candles: Candle[];
  sweepProbe?: EngineRealitySweepProbe;
  notes: string[];
  intendedOutcome: string;
}

const BASE_TIME_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const STEP_MS = 15 * 60 * 1000;
const STRATEGY_ID = "MZP_IFVG_ZONE_REACTION_V1";

function c(i: number, open: number, high: number, low: number, close: number): Candle {
  return {
    time: BASE_TIME_MS + i * STEP_MS,
    open,
    high,
    low,
    close,
    isClosed: true,
  };
}

export const ENGINE_REALITY_SYMBOL_PROFILES: Record<
  "XAUUSD" | "EURUSD" | "USDJPY" | "NAS100" | "BTCUSD",
  SymbolMarketSpec
> = {
  XAUUSD: {
    accountId: "TEST_ACC_V2_01",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    digits: 2,
    point: 0.01,
    tickSize: 0.01,
    tickValue: 1,
    contractSize: 100,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    spreadPoints: 25,
    spreadPrice: 0.25,
  },
  EURUSD: {
    accountId: "TEST_ACC_V2_01",
    canonicalSymbol: "EURUSD",
    brokerSymbol: "EURUSD",
    digits: 5,
    point: 0.00001,
    tickSize: 0.00001,
    tickValue: 1,
    contractSize: 100000,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    spreadPoints: 12,
    spreadPrice: 0.00012,
  },
  USDJPY: {
    accountId: "TEST_ACC_V2_01",
    canonicalSymbol: "USDJPY",
    brokerSymbol: "USDJPY",
    digits: 3,
    point: 0.001,
    tickSize: 0.001,
    tickValue: 1,
    contractSize: 100000,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    spreadPoints: 18,
    spreadPrice: 0.018,
  },
  NAS100: {
    accountId: "TEST_ACC_V2_01",
    canonicalSymbol: "NAS100",
    brokerSymbol: "NAS100",
    digits: 1,
    point: 0.1,
    tickSize: 0.1,
    tickValue: 1,
    contractSize: 1,
    volumeMin: 0.1,
    volumeMax: 100,
    volumeStep: 0.1,
    spreadPoints: 15,
    spreadPrice: 1.5,
  },
  BTCUSD: {
    accountId: "TEST_ACC_V2_01",
    canonicalSymbol: "BTCUSD",
    brokerSymbol: "BTCUSD",
    digits: 1,
    point: 0.1,
    tickSize: 0.1,
    tickValue: 1,
    contractSize: 1,
    volumeMin: 0.01,
    volumeMax: 50,
    volumeStep: 0.01,
    spreadPoints: 40,
    spreadPrice: 4,
  },
};

/**
 * Tuned settings for deterministic fixture behavior in unit tests.
 * These are not optimized trading parameters and must not be treated as profitability evidence.
 */
export function createEngineRealityStrategySettings(): IfvgStrategySettings {
  const s = createDefaultIfvgStrategySettingsForTests();
  s.atrPeriod = 5;
  s.fvg.fvgMinSizeAtr = 0.001;
  s.fvg.fvgMaxSizeAtr = 50;
  s.ifvg.maxBarsFromFvgToIfvg = 10;
  s.ifvg.ifvgBreakBufferAtr = 0.001;
  s.sweep.reclaimBars = 3;
  return s;
}

function cleanBullishCandles(): Candle[] {
  return [
    c(0, 102.0, 102.6, 101.4, 102.2),
    c(1, 102.2, 102.5, 101.1, 101.5),
    c(2, 101.5, 101.8, 100.2, 100.8),
    c(3, 100.8, 101.0, 99.0, 99.4),
    c(4, 99.4, 100.6, 99.2, 100.2),
    c(5, 100.2, 101.1, 99.9, 100.9),
    c(6, 100.9, 101.8, 100.6, 101.3),
    c(7, 101.3, 101.7, 100.8, 101.0),
    c(8, 101.0, 101.2, 98.7, 99.2),
    c(9, 99.2, 100.9, 99.0, 100.5),
    c(10, 100.5, 100.9, 100.2, 100.7),
    c(11, 100.7, 101.0, 100.4, 100.8),
    c(12, 100.8, 101.0, 100.6, 100.85),
    c(13, 100.85, 100.9, 100.65, 100.75),
    c(14, 100.15, 100.2, 99.7, 99.9),
    c(15, 99.9, 102.5, 99.8, 102.2),
    c(16, 102.2, 102.3, 100.3, 100.9),
    c(17, 100.9, 101.8, 100.7, 101.6),
  ];
}

function nearSweepBullishCandles(): Candle[] {
  const bars = cleanBullishCandles();
  bars[8] = c(8, 101.0, 101.2, 98.82, 99.35);
  bars[9] = c(9, 99.35, 100.0, 99.1, 99.8);
  return bars;
}

function overSweepBreakRiskCandles(): Candle[] {
  const bars = cleanBullishCandles();
  bars[8] = c(8, 101.0, 101.2, 98.5, 98.8);
  bars[9] = c(9, 98.8, 99.2, 98.4, 98.7);
  bars[10] = c(10, 98.7, 99.1, 98.5, 98.8);
  bars[11] = c(11, 98.8, 99.3, 98.6, 98.9);
  return bars;
}

function lateTradeCandles(): Candle[] {
  const bars = cleanBullishCandles();
  bars[16] = c(16, 102.2, 104.8, 102.0, 104.4);
  bars[17] = c(17, 104.4, 105.6, 104.0, 105.2);
  return bars;
}

function bearishMirrorCandles(): Candle[] {
  return [
    c(0, 100.2, 100.6, 99.7, 100.2),
    c(1, 100.2, 100.6, 99.7, 100.2),
    c(2, 100.2, 100.6, 99.7, 100.2),
    c(3, 100.2, 100.6, 99.7, 100.2),
    c(4, 100.2, 100.6, 99.7, 100.2),
    c(5, 100.2, 100.6, 99.7, 100.2),
    c(6, 100.2, 100.6, 99.7, 100.2),
    c(7, 100.2, 100.6, 99.7, 100.2),
    c(8, 100.2, 100.6, 99.7, 100.2),
    c(9, 100.2, 100.6, 99.7, 100.2),
    c(10, 100.2, 100.6, 99.7, 100.2),
    c(11, 100.2, 100.6, 99.7, 100.2),
    c(12, 100.2, 100.35, 100.05, 100.15),
    c(13, 100.15, 100.3, 100.08, 100.12),
    c(14, 101.6, 101.8, 101.45, 101.6),
    c(15, 101.6, 101.7, 99.5, 99.8),
    c(16, 99.8, 100.4, 99.7, 100.1),
    c(17, 100.1, 100.2, 99.0, 99.2),
  ];
}

export function createEngineRealityFixtures(): Record<EngineRealityFixtureId, EngineRealityFixture> {
  return {
    CLEAN_BULLISH_IFVG: {
      fixtureId: "CLEAN_BULLISH_IFVG",
      title: "Clean bullish IFVG with sweep/retest/confirmation",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_CLEAN",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: cleanBullishCandles(),
      sweepProbe: { side: "BUY", swingLevel: 99.0, searchFromIndex: 6, searchToIndex: 12 },
      notes: [
        "Synthetic fixture only, no real market data.",
        "Represents intended clean path: sweep -> IFVG zone -> retest -> confirmation.",
      ],
      intendedOutcome:
        "At least one BUY candidate can appear; trade plan may become TRADE_READY only when account/registry/gates allow.",
    },
    NEAR_SWEEP_BULLISH_IFVG: {
      fixtureId: "NEAR_SWEEP_BULLISH_IFVG",
      title: "Bullish IFVG with near-sweep imperfection",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_NEAR",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: nearSweepBullishCandles(),
      sweepProbe: { side: "BUY", swingLevel: 99.0, searchFromIndex: 6, searchToIndex: 12 },
      notes: [
        "Near-sweep is expected to be tolerated as lower confidence, not auto-invalid.",
        "Current engine may keep this at OBSERVE depending on settings.",
      ],
      intendedOutcome: "NEAR_SWEEP behavior is recognized and scored lower than CONFIRMED_SWEEP.",
    },
    OVER_SWEEP_BREAK_RISK: {
      fixtureId: "OVER_SWEEP_BREAK_RISK",
      title: "Oversweep that fails reclaim and implies break risk",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_BREAKRISK",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: overSweepBreakRiskCandles(),
      sweepProbe: { side: "BUY", swingLevel: 99.0, searchFromIndex: 6, searchToIndex: 12 },
      notes: ["Expected sweep classification: POSSIBLE_BREAK_RISK."],
      intendedOutcome: "Riskier than clean setup; should not be treated as clean confidence.",
    },
    LATE_TRADE_ALREADY_PASSED: {
      fixtureId: "LATE_TRADE_ALREADY_PASSED",
      title: "Late trade characterization (price already moved away)",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_LATE",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: lateTradeCandles(),
      notes: [
        "Characterization fixture for current limitation.",
        "Current engine has no replay lifecycle state for missed/late entries yet.",
      ],
      intendedOutcome: "Should not become immediate TRADE_READY without retest/confirmation evidence.",
    },
    BAD_RR_SETUP: {
      fixtureId: "BAD_RR_SETUP",
      title: "Valid-looking setup but poor R:R threshold",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_BADRR",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: cleanBullishCandles(),
      notes: [
        "Current model uses fixed_R target; R:R failures are threshold/gate driven.",
        "Used to assert no TRADE_READY when minRr exceeds modeled rrTarget.",
      ],
      intendedOutcome: "Trade plan is blocked or non-trade-ready when R:R gate fails.",
    },
    BEARISH_MIRROR_IFVG: {
      fixtureId: "BEARISH_MIRROR_IFVG",
      title: "Bearish mirror IFVG scenario",
      timeframe: "M15",
      strategyId: STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V2_01_SELL",
      canonicalSymbol: "XAUUSD",
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: bearishMirrorCandles(),
      sweepProbe: { side: "SELL", swingLevel: 101.2, searchFromIndex: 12, searchToIndex: 16 },
      notes: ["Sell-side mirror path for direction handling."],
      intendedOutcome: "Detection should support SELL candidate path (or expose a clear gap).",
    },
  };
}

export function createEngineRealityPrecisionProfiles(): SymbolMarketSpec[] {
  return [
    ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
    ENGINE_REALITY_SYMBOL_PROFILES.EURUSD,
    ENGINE_REALITY_SYMBOL_PROFILES.USDJPY,
    ENGINE_REALITY_SYMBOL_PROFILES.NAS100,
    ENGINE_REALITY_SYMBOL_PROFILES.BTCUSD,
  ];
}
