/**
 * Read-only mock scanner simulation payloads — pure core + in-memory fixtures (checkpoint 12).
 */
import type { AccountId } from "@workspace/mapazapp-core";
import { runCheckpoint12ScannerFixture, type ScannerSimulationResult } from "@workspace/mapazapp-core";
import { getMockSymbolMarketSpec } from "../lib/mockSymbolProfiles";

export function listScannerSimulations(): ScannerSimulationResult[] {
  return [simulationForThe5ers(), simulationForPropXp()];
}

export function latestScannerSimulation(): ScannerSimulationResult {
  return simulationForThe5ers();
}

export function latestScannerSimulationForAccount(accountId: AccountId): ScannerSimulationResult {
  if (accountId === "ACC_PROPXP_50K_PHASE1") return simulationForPropXp();
  return simulationForThe5ers();
}

function simulationForThe5ers(): ScannerSimulationResult {
  const accountId = "ACC_THE5ERS_100K_PHASE1_A" as AccountId;
  const spec = getMockSymbolMarketSpec(accountId, "XAUUSD");
  if (!spec) throw new Error("mock XAUUSD profile missing");
  return runCheckpoint12ScannerFixture({
    runId: "mock_scan_the5ers_xau_fixture",
    accountId,
    symbolProfile: spec,
    scenario: "xau_buy",
  });
}

function simulationForPropXp(): ScannerSimulationResult {
  const accountId = "ACC_PROPXP_50K_PHASE1" as AccountId;
  const spec = getMockSymbolMarketSpec(accountId, "EURUSD");
  if (!spec) throw new Error("mock EURUSD profile missing");
  return runCheckpoint12ScannerFixture({
    runId: "mock_scan_propxp_eur_fixture",
    accountId,
    symbolProfile: spec,
    scenario: "eur_flat",
  });
}
