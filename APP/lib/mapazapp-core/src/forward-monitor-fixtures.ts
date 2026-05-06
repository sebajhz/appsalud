/**
 * Fictional forward-monitor snapshot inputs — not broker exports, not live MT5.
 */

import type { AccountId, CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import type { SymbolMarketSpec } from "./symbol-profile";
import { createCheckpoint7MockParameterSetRegistry } from "./strategy-registry-fixtures";
import { evaluateParameterSetCompatibility } from "./strategy-registry-evaluator";
import { createDefaultStrategyRegistryEvaluationSettings } from "./strategy-registry-settings";
import {
  CHECKPOINT12_SCANNER_STRATEGY_ID,
  CHECKPOINT12_XAU_PARAMETER_SET_ID,
  createCheckpoint12ScannerAccountGuardInput,
  runCheckpoint12ScannerFixture,
} from "./scanner-fixtures";
import type { ForwardMonitorInput } from "./forward-monitor-types";
import type { AccountGuardResult } from "./account-guard-types";
import { accountGuardReason } from "./account-guard-reasons";

const REGISTRY = createCheckpoint7MockParameterSetRegistry();
const REGISTRY_EVAL = createDefaultStrategyRegistryEvaluationSettings();

function fictionalXauProfile(accountId: AccountId): SymbolMarketSpec {
  return {
    accountId,
    canonicalSymbol: "XAUUSD",
    /** Align with `createCheckpoint7MockParameterSetRegistry` XAU row for `trade_review` compatibility. */
    brokerSymbol: "XAUUSD",
    digits: 2,
    point: 0.01,
    tickSize: 0.01,
    tickValue: 1.0,
    contractSize: 100,
    volumeMin: 0.01,
    volumeMax: 50,
    volumeStep: 0.01,
    spreadPoints: 25,
    spreadPrice: 0.25,
  };
}

function fictionalEurProfile(accountId: AccountId): SymbolMarketSpec {
  return {
    accountId,
    canonicalSymbol: "EURUSD",
    brokerSymbol: "EURUSD",
    digits: 5,
    point: 0.00001,
    tickSize: 0.00001,
    tickValue: 1.0,
    contractSize: 100_000,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    spreadPoints: 12,
    spreadPrice: 0.00012,
  };
}

function registryForSession(
  accountId: AccountId,
  strategyId: StrategyId,
  parameterSetId: ParameterSetId,
  symbol: CanonicalSymbol,
  brokerSymbol: string,
) {
  return evaluateParameterSetCompatibility(
    {
      strategyRegistry: REGISTRY,
      strategyId,
      parameterSetId,
      canonicalSymbol: symbol,
      brokerSymbol,
      accountId,
      requestedUsage: "trade_review",
    },
    REGISTRY_EVAL,
  );
}

/** Match checkpoint-12 scanner fixture clock so zone lifetimes are not accidentally expired. */
const EVAL_ISO = "2026-05-04T12:00:00.000Z";

/** The5ers-style account with XAU scanner path (may reach TRADE_READY or WAIT_CONFIRMATION in mock). */
export function createForwardMonitorFixtureInputThe5ersXau(): ForwardMonitorInput {
  const accountId = "ACC_THE5ERS_100K_PHASE1_A" as AccountId;
  const spec = fictionalXauProfile(accountId);
  const scan = runCheckpoint12ScannerFixture({
    runId: "fm_fixture_the5ers_xau",
    accountId,
    symbolProfile: spec,
    scenario: "xau_buy",
    evaluatedAtIso: EVAL_ISO,
  });
  return {
    monitorRunId: "fm_session_the5ers_xau",
    accountId,
    symbols: ["XAUUSD"],
    timeframe: "M15",
    scannerSimulationResults: [scan],
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
    registryCompatibility: registryForSession(
      accountId,
      CHECKPOINT12_SCANNER_STRATEGY_ID,
      CHECKPOINT12_XAU_PARAMETER_SET_ID,
      "XAUUSD",
      spec.brokerSymbol,
    ),
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
    evaluationTimeUtc: EVAL_ISO,
    sourceType: "scanner_simulation_result",
    sourceName: "cp16_fixture_the5ers_xau",
  };
}

/** PropXP-style EUR path — flat candles → typically no IFVG candidates; registry may be alerts-only for EUR set. */
export function createForwardMonitorFixtureInputPropXpEur(): ForwardMonitorInput {
  const accountId = "ACC_PROPXP_50K_PHASE1" as AccountId;
  const spec = fictionalEurProfile(accountId);
  const scan = runCheckpoint12ScannerFixture({
    runId: "fm_fixture_propxp_eur",
    accountId,
    symbolProfile: spec,
    scenario: "eur_flat",
    evaluatedAtIso: EVAL_ISO,
  });
  const parameterSetId = scan.run.parameterSetId as ParameterSetId;
  return {
    monitorRunId: "fm_session_propxp_eur",
    accountId,
    symbols: ["EURUSD"],
    timeframe: "M15",
    scannerSimulationResults: [scan],
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
    registryCompatibility: registryForSession(
      accountId,
      scan.run.strategyId as StrategyId,
      parameterSetId,
      "EURUSD",
      spec.brokerSymbol,
    ),
    strategyId: scan.run.strategyId as StrategyId,
    parameterSetId,
    evaluationTimeUtc: EVAL_ISO,
    sourceType: "scanner_simulation_result",
    sourceName: "cp16_fixture_propxp_eur",
  };
}

/** Guard explicitly blocks trade review (fictional snapshot). */
export function createForwardMonitorFixtureInputBlockedGuard(accountId: AccountId = "ACC_FORWARD_MONITOR_GUARD_BLOCK" as AccountId): ForwardMonitorInput {
  const spec = fictionalXauProfile(accountId);
  const scan = runCheckpoint12ScannerFixture({
    runId: "fm_fixture_blocked_guard_scan",
    accountId,
    symbolProfile: spec,
    scenario: "xau_buy",
    evaluatedAtIso: EVAL_ISO,
  });
  const blockedGuard: AccountGuardResult = {
    accountId,
    status: "BLOCKED_MAX_TRADES",
    allowTradeReview: false,
    blockingReasons: [accountGuardReason("MAX_TRADES_REACHED", "blocking")],
    warningReasons: [],
    simpleSummary: "Max daily trades reached (fixture).",
    technicalSummary: "BLOCKED_MAX_TRADES",
    metrics: null,
  };
  return {
    accountId,
    symbols: ["XAUUSD"],
    timeframe: "M15",
    scannerSimulationResults: [scan],
    accountGuardResult: blockedGuard,
    registryCompatibility: registryForSession(
      accountId,
      CHECKPOINT12_SCANNER_STRATEGY_ID,
      CHECKPOINT12_XAU_PARAMETER_SET_ID,
      "XAUUSD",
      spec.brokerSymbol,
    ),
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
    evaluationTimeUtc: EVAL_ISO,
    sourceType: "mock_snapshot",
    sourceName: "cp16_fixture_guard_blocked",
  };
}

/** Registry / parameter-set gate blocks trade-review usage for the session (intentional mismatch for gate demo). */
export function createForwardMonitorFixtureInputBlockedRegistry(
  accountId: AccountId = "ACC_THE5ERS_100K_PHASE1_A" as AccountId,
): ForwardMonitorInput {
  const spec = fictionalXauProfile(accountId);
  const scan = runCheckpoint12ScannerFixture({
    runId: "fm_fixture_registry_blocked_scan",
    accountId,
    symbolProfile: spec,
    scenario: "xau_buy",
    evaluatedAtIso: EVAL_ISO,
  });
  const blockedRegistry = evaluateParameterSetCompatibility(
    {
      strategyRegistry: REGISTRY,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
      canonicalSymbol: "XAUUSD",
      brokerSymbol: spec.brokerSymbol,
      accountId,
      requestedUsage: "trade_review",
    },
    REGISTRY_EVAL,
  );
  return {
    accountId,
    symbols: ["XAUUSD"],
    timeframe: "M15",
    scannerSimulationResults: [scan],
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
    registryCompatibility: blockedRegistry,
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001" as ParameterSetId,
    evaluationTimeUtc: EVAL_ISO,
    sourceType: "mock_snapshot",
    sourceName: "cp16_fixture_registry_blocked",
  };
}

/** Empty scanner list — observational no-candidate snapshot. */
export function createForwardMonitorFixtureInputNoCandidates(accountId: AccountId = "ACC_THE5ERS_100K_PHASE1_A" as AccountId): ForwardMonitorInput {
  const spec = fictionalXauProfile(accountId);
  return {
    accountId,
    symbols: ["XAUUSD"],
    timeframe: "M15",
    scannerSimulationResults: [],
    candleSnapshotSummaries: [{ symbol: "XAUUSD", barCount: 0 }],
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
    registryCompatibility: registryForSession(
      accountId,
      CHECKPOINT12_SCANNER_STRATEGY_ID,
      CHECKPOINT12_XAU_PARAMETER_SET_ID,
      "XAUUSD",
      spec.brokerSymbol,
    ),
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
    evaluationTimeUtc: EVAL_ISO,
    sourceType: "mock_snapshot",
    sourceName: "cp16_fixture_no_candidates",
  };
}
