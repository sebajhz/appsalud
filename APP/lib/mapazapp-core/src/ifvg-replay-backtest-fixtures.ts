import type { Candle } from "./candle";
import {
  createEngineRealityFixtures,
  createEngineRealityStrategySettings,
  ENGINE_REALITY_SYMBOL_PROFILES,
} from "./engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "./entry-sl-tp-model";
import type { IfvgReplayBacktestInput } from "./ifvg-replay-backtest-types";
import { createDefaultIfvgReplayBacktestSettings } from "./ifvg-replay-backtest";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import { createDefaultTradePlanEvaluationSettingsForTests } from "./trade-plan-settings";

export type IfvgReplayBacktestFixtureId =
  | "CLEAN_ONE_TP"
  | "LOSS_AFTER_CONFIRM"
  | "NO_CANDIDATE_FLAT"
  | "INSUFFICIENT_BARS"
  | "MIXED_MANY_CANDIDATES";

const BASE = Date.UTC(2026, 0, 4, 0, 0, 0);
const STEP = 15 * 60 * 1000;

function candle(i: number, o: number, h: number, l: number, c: number): Candle {
  return { time: BASE + i * STEP, open: o, high: h, low: l, close: c, isClosed: true };
}

/** Registry snapshot that allows trade review in fixtures (synthetic). */
export function createIfvgReplayRegistryCompatibilityApproved(): ParameterSetCompatibilityResult {
  return {
    compatible: true,
    allowObserve: true,
    allowAlert: true,
    allowTradeReview: true,
    status: "approved_for_trade_review",
    approvalLevel: "trade_review",
    blockingReasons: [],
    warningReasons: [],
    parameterSet: null,
    strategy: null,
    simpleSummary: "fixture approved_for_trade_review",
    technicalSummary: "IFVG_REPLAY_FIXTURE",
  };
}

export function createIfvgReplayTradePlanSettingsForBacktest() {
  return {
    ...createDefaultTradePlanEvaluationSettingsForTests(),
    testOrDevMode: false,
    requireApprovedParameterSet: true,
    requireAccountIdForGuard: true,
    minScoreTrade: 70,
    allowNearSweepTradeReady: false,
  };
}

export function createIfvgReplayEntrySlTpSettingsForBacktest() {
  const s = createDefaultEntrySlTpSettingsForTests();
  s.minRr = 1.5;
  s.entryMode = "confirmation_close";
  s.slMode = "beyond_zone";
  s.tpMode = "fixed_r";
  s.fixedRTarget = 2;
  return s;
}

/** Keeps detection/retest/confirmation path intact; appends bearish leg so replay can hit SL after entry. */
function cleanBullishLossAppendCandles(): Candle[] {
  const fx = createEngineRealityFixtures().CLEAN_BULLISH_IFVG;
  const base = [...fx.candles];
  let i = base.length;
  base.push(candle(i, 100.05, 100.15, 99.85, 100.0));
  i++;
  base.push(candle(i, 100.0, 100.05, 96.5, 96.9));
  i++;
  base.push(candle(i, 96.9, 97.2, 94.5, 94.8));
  i++;
  base.push(candle(i, 94.8, 95.0, 93.2, 93.5));
  return base;
}

function flatNoFvgCandles(): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < 40; i++) {
    out.push(candle(i, 100, 100.01, 99.99, 100));
  }
  return out;
}

export function createIfvgReplayBacktestFixtures(): Record<IfvgReplayBacktestFixtureId, IfvgReplayBacktestInput> {
  const er = createEngineRealityFixtures();
  const clean = er.CLEAN_BULLISH_IFVG;
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createIfvgReplayTradePlanSettingsForBacktest();
  const entrySlTpSettings = createIfvgReplayEntrySlTpSettingsForBacktest();
  const registry = createIfvgReplayRegistryCompatibilityApproved();
  const backtestSettings = createDefaultIfvgReplayBacktestSettings();

  const baseInput = (partial: Partial<IfvgReplayBacktestInput>): IfvgReplayBacktestInput => ({
    candles: clean.candles,
    symbolProfile: clean.symbolProfile,
    strategySettings,
    tradePlanSettings,
    entrySlTpSettings,
    registryCompatibility: registry,
    strategyId: clean.strategyId,
    parameterSetId: clean.parameterSetId,
    accountId: clean.symbolProfile.accountId,
    canonicalSymbol: clean.canonicalSymbol,
    brokerSymbol: clean.symbolProfile.brokerSymbol,
    timeframe: clean.timeframe,
    evaluationMode: "synthetic_fixture",
    sourceName: "ifvg-replay-backtest-fixtures",
    backtestSettings: { ...backtestSettings, sweepLow: 98.7 },
    accountGuardInput: {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
      accountId: clean.symbolProfile.accountId,
    },
    syntheticRunId: "RUN_IFVG_REPLAY_V204",
    ...partial,
  });

  return {
    CLEAN_ONE_TP: baseInput({}),
    LOSS_AFTER_CONFIRM: baseInput({
      candles: cleanBullishLossAppendCandles(),
      parameterSetId: "MZP_IFVG_XAUUSD_V2_04_LOSS" as never,
      replaySettings: { pathAssumption: "conservative_sl_first" },
    }),
    NO_CANDIDATE_FLAT: baseInput({
      candles: flatNoFvgCandles(),
      parameterSetId: "MZP_IFVG_XAUUSD_V2_04_FLAT" as never,
    }),
    INSUFFICIENT_BARS: baseInput({
      candles: [candle(0, 1, 1, 1, 1), candle(1, 1, 1, 1, 1)],
      parameterSetId: "MZP_IFVG_XAUUSD_V2_04_SHORT" as never,
    }),
    MIXED_MANY_CANDIDATES: baseInput({
      backtestSettings: { ...backtestSettings, maxCandidates: 5, sweepLow: 98.7 },
      parameterSetId: "MZP_IFVG_XAUUSD_V2_04_MIX" as never,
    }),
  };
}
