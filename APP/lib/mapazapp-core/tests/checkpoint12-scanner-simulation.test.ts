import { describe, expect, it } from "vitest";
import {
  accountGuardResultToTradePlanAccountGuardInput,
  createCheckpoint7MockParameterSetRegistry,
  createDefaultIfvgStrategySettingsForTests,
  createDefaultTradePlanEvaluationSettingsForTests,
  evaluateAccountGuard,
  runScannerSimulation,
  runScannerSimulationFromBridgeCandlesCsv,
} from "../src/index";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";
import {
  CHECKPOINT12_EUR_PARAMETER_SET_ALERTS,
  CHECKPOINT12_MALFORMED_BRIDGE_CANDLES_CSV,
  CHECKPOINT12_SCANNER_STRATEGY_ID,
  CHECKPOINT12_XAU_PARAMETER_SET_ID,
  buildMinimalBridgeCandlesCsvFromCandles,
  createCheckpoint12EurUsdNoPatternCandles,
  createCheckpoint12ScannerAccountGuardInput,
  createCheckpoint12XauUsdBuyScenarioCandles,
} from "../src/scanner-fixtures";
import { createDefaultAccountGuardSettingsForTests } from "../src/account-guard-settings";
import { createDefaultScannerTradePlanSettings } from "../src/scanner-settings";

const registry = createCheckpoint7MockParameterSetRegistry();

function xauSpec(accountId: string) {
  return { ...V1_TEST_SYMBOL_PROFILES.XAUUSD, accountId };
}

function eurSpec(accountId: string) {
  return { ...V1_TEST_SYMBOL_PROFILES.EURUSD, accountId };
}

function xauStrategySettings() {
  const settings = createDefaultIfvgStrategySettingsForTests();
  settings.atrPeriod = 5;
  settings.fvg.fvgMinSizeAtr = 0.001;
  settings.fvg.fvgMaxSizeAtr = 50;
  settings.ifvg.maxBarsFromFvgToIfvg = 10;
  settings.ifvg.ifvgBreakBufferAtr = 0.001;
  return settings;
}

describe("Checkpoint 12 — A. Scanner simulation success", () => {
  it("synthetic XAUUSD fixture returns completed or completed_with warnings and candidates with trade review plans", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const candles = createCheckpoint12XauUsdBuyScenarioCandles();
    const r = runScannerSimulation({
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      candles,
      symbolProfile: xauSpec(accountId),
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      strategyRegistry: registry,
      tradePlanSettings: createDefaultScannerTradePlanSettings(),
      sourceType: "manual_candles_fixture",
      sourceName: "cp12_xau_buy_synthetic",
    });
    expect(r.ok).toBe(true);
    expect(["completed", "completed_with_warnings"]).toContain(r.status);
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0]!.tradeReviewEvaluation.plan).toBeDefined();
    expect(r.candidates[0]!.tradeReviewEvaluation.plan.zoneId).toBeTruthy();
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.mockOnly).toBe(true);
    expect(r.simulatedScanner).toBe(true);
  });
});

describe("Checkpoint 12 — B. No candidate path", () => {
  it("flat EURUSD-style fixture yields no_candidates", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const candles = createCheckpoint12EurUsdNoPatternCandles();
    const r = runScannerSimulation({
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_EUR_PARAMETER_SET_ALERTS,
      canonicalSymbol: "EURUSD",
      timeframe: "M15",
      candles,
      symbolProfile: eurSpec(accountId),
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      strategyRegistry: registry,
      tradePlanSettings: createDefaultTradePlanEvaluationSettingsForTests(),
      sourceType: "manual_candles_fixture",
    });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("no_candidates");
    expect(r.candidates).toHaveLength(0);
  });
});

describe("Checkpoint 12 — C. Bridge CSV adapter", () => {
  it("valid bridge candles CSV converts to candles and runs simulation", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const csv = buildMinimalBridgeCandlesCsvFromCandles(
      createCheckpoint12XauUsdBuyScenarioCandles(),
      "XAUUSD",
    );
    const r = runScannerSimulationFromBridgeCandlesCsv({
      csvText: csv,
      symbolProfile: xauSpec(accountId),
      marketSnapshotRow: null,
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      tradePlanSettings: createDefaultScannerTradePlanSettings(),
      strategyRegistry: registry,
      sourceName: "csv_fixture",
    });
    expect(r.bridgeImportOk).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("invalid CSV returns failed with import errors", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const r = runScannerSimulationFromBridgeCandlesCsv({
      csvText: CHECKPOINT12_MALFORMED_BRIDGE_CANDLES_CSV,
      symbolProfile: xauSpec(accountId),
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      tradePlanSettings: createDefaultTradePlanEvaluationSettingsForTests(),
      strategyRegistry: registry,
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("failed");
    expect(r.bridgeImportOk).toBe(false);
    expect(r.bridgeErrors.length).toBeGreaterThan(0);
  });
});

describe("Checkpoint 12 — D. Guard / registry integration", () => {
  it("alerts-only parameter set prevents TRADE_READY", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const candles = createCheckpoint12XauUsdBuyScenarioCandles();
    const r = runScannerSimulation({
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_EUR_PARAMETER_SET_ALERTS,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      candles,
      symbolProfile: xauSpec(accountId),
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      strategyRegistry: registry,
      tradePlanSettings: { ...createDefaultTradePlanEvaluationSettingsForTests(), minScoreTrade: 40 },
      sourceType: "manual_candles_fixture",
    });
    expect(r.registryCompatibility.allowTradeReview).toBe(false);
    for (const c of r.candidates) {
      expect(c.tradeReviewEvaluation.plan.status).not.toBe("TRADE_READY");
    }
  });

  it("blocked account guard prevents TRADE_READY", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const candles = createCheckpoint12XauUsdBuyScenarioCandles();
    const guardIn = createCheckpoint12ScannerAccountGuardInput(accountId);
    const blocked = evaluateAccountGuard(
      { ...guardIn, operationalStatus: "BLOCKED_DAILY_DRAWDOWN" },
      createDefaultAccountGuardSettingsForTests(),
    );
    const r = runScannerSimulation({
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      candles,
      symbolProfile: xauSpec(accountId),
      strategySettings: xauStrategySettings(),
      accountGuardInput: guardIn,
      accountGuardResult: blocked,
      strategyRegistry: registry,
      tradePlanSettings: { ...createDefaultTradePlanEvaluationSettingsForTests(), minScoreTrade: 40 },
      sourceType: "manual_candles_fixture",
    });
    const tradeGuard = accountGuardResultToTradePlanAccountGuardInput(guardIn, blocked);
    expect(tradeGuard.allowTradeReview).toBe(false);
    for (const c of r.candidates) {
      expect(c.tradeReviewEvaluation.plan.status).not.toBe("TRADE_READY");
    }
  });
});

describe("Checkpoint 12 — E. No execution semantics", () => {
  it("scanner result flags reviewOnly and executionEnabled", () => {
    const accountId = "ACC_THE5ERS_100K_PHASE1_A";
    const r = runScannerSimulation({
      accountId,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      timeframe: "M15",
      candles: createCheckpoint12XauUsdBuyScenarioCandles(),
      symbolProfile: xauSpec(accountId),
      strategySettings: xauStrategySettings(),
      accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
      strategyRegistry: registry,
      tradePlanSettings: createDefaultTradePlanEvaluationSettingsForTests(),
      sourceType: "manual_candles_fixture",
    });
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
  });
});
