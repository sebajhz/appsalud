/**
 * **Fictional / test-only** candle series and CSV snippets for checkpoint 12 scanner simulation.
 * Not broker data, not live MT5 exports, not performance truth.
 */

import type { Candle } from "./candle";
import type { AccountGuardInput } from "./account-guard-types";
import type { SymbolMarketSpec } from "./symbol-profile";
import {
  CHECKPOINT7_MOCK_STRATEGY_ID,
  createCheckpoint7MockParameterSetRegistry,
} from "./strategy-registry-fixtures";
import { createDefaultIfvgStrategySettingsForTests } from "./strategy-settings";
import { createDefaultScannerTradePlanSettings } from "./scanner-settings";
import { runScannerSimulation } from "./scanner-simulation";
import type { ScannerSimulationResult } from "./scanner-types";

export const CHECKPOINT12_SCANNER_STRATEGY_ID = CHECKPOINT7_MOCK_STRATEGY_ID;
export const CHECKPOINT12_XAU_PARAMETER_SET_ID = "MZP_IFVG_XAUUSD_V1_SET_003" as const;
export const CHECKPOINT12_EUR_PARAMETER_SET_ALERTS = "MZP_IFVG_EURUSD_V1_SET_001" as const;

function bar(t: number, o: number, h: number, l: number, cl: number): Candle {
  return { time: t * 60_000, open: o, high: h, low: l, close: cl, isClosed: true };
}

/** Synthetic XAUUSD-scale series that exercises IFVG → BUY zone candidate path (checkpoint 2 style). */
export function createCheckpoint12XauUsdBuyScenarioCandles(): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < 12; i++) {
    candles.push(bar(i, 100, 100.6, 99.7, 100.2));
  }
  candles.push(bar(12, 100.2, 100.6, 100, 100.35));
  candles.push(bar(13, 100.35, 100.55, 100.1, 100.4));
  candles.push(bar(14, 100.4, 99.6, 99.2, 99.4));
  candles.push(bar(15, 99.4, 106, 99.2, 105.5));
  return candles;
}

/** Doji-style synthetic path (no range) — intended to yield zero FVG/IFVG zone candidates. */
export function createCheckpoint12EurUsdNoPatternCandles(): Candle[] {
  const out: Candle[] = [];
  const p = 1.085;
  for (let t = 0; t < 50; t++) {
    out.push(bar(t, p, p, p, p));
  }
  return out;
}

/** Minimal valid `AccountGuardInput` for scanner tests (not broker truth). */
export function createCheckpoint12ScannerAccountGuardInput(accountId: string): AccountGuardInput {
  return {
    accountId,
    operationalStatus: "TRADING_ALLOWED",
    tradingAllowed: true,
    risk: {
      balance: 100_000,
      equity: 100_000,
      dailyStartBalance: 100_000,
      dailyStartEquity: 100_000,
      dailyLossLimitAmount: 4000,
      dailyLossUsedAmount: 100,
      dailyLossRemainingAmount: 3900,
      maxLossLimitAmount: 8000,
      maxLossUsedAmount: 500,
      maxLossRemainingAmount: 7500,
      riskPerTradePercent: 1,
      tradesTakenToday: 0,
      maxTradesPerDay: 5,
    },
    approvedParameterSetForAccount: true,
    bridgeConnected: true,
    spreadAllowed: true,
  };
}

/** BridgeEA candles CSV with invalid header — parser must fail (`BRIDGE_CSV_MISSING_COLUMN` or similar). */
export const CHECKPOINT12_MALFORMED_BRIDGE_CANDLES_CSV = `foo,bar,baz
1,2,3`;

/** Minimal valid candles CSV header + one row (MZP_BRIDGE_V1 contract). */
const checkpoint12Registry = createCheckpoint7MockParameterSetRegistry();

function checkpoint12IfvgSettings() {
  const settings = createDefaultIfvgStrategySettingsForTests();
  settings.atrPeriod = 5;
  settings.fvg.fvgMinSizeAtr = 0.001;
  settings.fvg.fvgMaxSizeAtr = 50;
  settings.ifvg.maxBarsFromFvgToIfvg = 10;
  settings.ifvg.ifvgBreakBufferAtr = 0.001;
  return settings;
}

/**
 * Single entry point for dashboard + mock HTTP adapter — same fixture path, caller supplies `SymbolMarketSpec`.
 */
export function runCheckpoint12ScannerFixture(params: {
  runId?: string;
  accountId: string;
  symbolProfile: SymbolMarketSpec;
  scenario: "xau_buy" | "eur_flat";
  evaluatedAtIso?: string;
}): ScannerSimulationResult {
  const isXau = params.scenario === "xau_buy";
  return runScannerSimulation({
    runId: params.runId,
    accountId: params.accountId,
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: isXau ? CHECKPOINT12_XAU_PARAMETER_SET_ID : CHECKPOINT12_EUR_PARAMETER_SET_ALERTS,
    canonicalSymbol: isXau ? "XAUUSD" : "EURUSD",
    timeframe: "M15",
    candles: isXau ? createCheckpoint12XauUsdBuyScenarioCandles() : createCheckpoint12EurUsdNoPatternCandles(),
    symbolProfile: params.symbolProfile,
    strategySettings: checkpoint12IfvgSettings(),
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(params.accountId),
    strategyRegistry: checkpoint12Registry,
    tradePlanSettings: createDefaultScannerTradePlanSettings(),
    sourceType: "manual_candles_fixture",
    sourceName: isXau ? "checkpoint12_fixture_xau_buy" : "checkpoint12_fixture_eur_flat",
    currentEvaluationTime: params.evaluatedAtIso ?? "2026-05-04T12:00:00.000Z",
  });
}

export function buildMinimalBridgeCandlesCsvFromCandles(rows: Candle[], symbol: string): string {
  const header =
    "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source";
  const lines = [header];
  let seq = 0;
  for (const c of rows) {
    const iso = new Date(c.time).toISOString();
    const tv = c.tickVolume ?? 1;
    const sp = c.spreadPoints ?? 10;
    lines.push(
      `MZP_BRIDGE_V1,EXP_CP12,2026-05-04T12:00:00Z,TERM_CP12,100200300,${symbol},M15,${iso},${c.open},${c.high},${c.low},${c.close},${tv},${sp},0,${c.isClosed !== false},SCANNER_FIXTURE`,
    );
    seq++;
  }
  return lines.join("\n");
}
