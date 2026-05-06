/**
 * Read-only mock forward / demo monitor — snapshot evaluation only (checkpoint 16).
 */
import type { AccountId } from "@workspace/mapazapp-core";
import {
  CHECKPOINT12_SCANNER_STRATEGY_ID,
  CHECKPOINT12_XAU_PARAMETER_SET_ID,
  createCheckpoint12ScannerAccountGuardInput,
  createCheckpoint7MockParameterSetRegistry,
  createDefaultStrategyRegistryEvaluationSettings,
  createForwardMonitorFixtureInputBlockedGuard,
  createForwardMonitorFixtureInputBlockedRegistry,
  createForwardMonitorFixtureInputNoCandidates,
  createForwardMonitorFixtureInputPropXpEur,
  createForwardMonitorFixtureInputThe5ersXau,
  evaluateForwardMonitorSnapshot,
  evaluateParameterSetCompatibility,
  runCheckpoint12ScannerFixture,
  type ForwardMonitorResult,
  type ForwardMonitorSession,
} from "@workspace/mapazapp-core";
import { getMockSymbolMarketSpec } from "../lib/mockSymbolProfiles";

const REGISTRY = createCheckpoint7MockParameterSetRegistry();
const REGISTRY_EVAL = createDefaultStrategyRegistryEvaluationSettings();

export function latestForwardMonitor(): ForwardMonitorResult {
  return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputThe5ersXau());
}

export function latestForwardMonitorForAccount(accountId: AccountId): ForwardMonitorResult {
  if (accountId === "ACC_FORWARD_MONITOR_GUARD_BLOCK") {
    return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputBlockedGuard(accountId));
  }
  if (accountId === "ACC_FORWARD_MONITOR_REGISTRY_BLOCK") {
    return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputBlockedRegistry(accountId));
  }
  if (accountId === "ACC_FORWARD_MONITOR_NO_CAND") {
    return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputNoCandidates(accountId));
  }
  if (accountId === "ACC_PROPXP_50K_PHASE1") {
    return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputPropXpEur());
  }
  const spec = getMockSymbolMarketSpec(accountId, "XAUUSD");
  if (!spec) {
    return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputThe5ersXau());
  }
  const scan = runCheckpoint12ScannerFixture({
    runId: `fm_api_scan_${accountId}`,
    accountId,
    symbolProfile: spec,
    scenario: "xau_buy",
  });
  const compat = evaluateParameterSetCompatibility(
    {
      strategyRegistry: REGISTRY,
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      canonicalSymbol: "XAUUSD",
      brokerSymbol: spec.brokerSymbol,
      accountId,
      requestedUsage: "trade_review",
    },
    REGISTRY_EVAL,
  );
  return evaluateForwardMonitorSnapshot({
    monitorRunId: `fm_session_${accountId}`,
    accountId,
    symbols: ["XAUUSD"],
    timeframe: "M15",
    scannerSimulationResults: [scan],
    accountGuardInput: createCheckpoint12ScannerAccountGuardInput(accountId),
    registryCompatibility: compat,
    strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
    parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
    evaluationTimeUtc: scan.run.evaluatedAtIso,
    sourceType: "scanner_simulation_result",
    sourceName: "api_adapter_default_xau",
  });
}

export function listForwardMonitorSessions(): ForwardMonitorSession[] {
  const iso = "2026-05-04T12:00:00.000Z";
  return [
    {
      sessionId: "fm_sess_the5ers",
      accountId: "ACC_THE5ERS_100K_PHASE1_A" as AccountId,
      symbols: ["XAUUSD"],
      timeframe: "M15",
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: CHECKPOINT12_XAU_PARAMETER_SET_ID,
      lastSnapshotIso: iso,
      status: "monitoring",
      sourceType: "scanner_simulation_result",
    },
    {
      sessionId: "fm_sess_propxp",
      accountId: "ACC_PROPXP_50K_PHASE1" as AccountId,
      symbols: ["EURUSD"],
      timeframe: "M15",
      strategyId: CHECKPOINT12_SCANNER_STRATEGY_ID,
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
      lastSnapshotIso: iso,
      status: "no_candidates",
      sourceType: "scanner_simulation_result",
    },
  ];
}
