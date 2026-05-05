import type { AccountId } from "@workspace/mapazapp-core";
import { runCheckpoint12ScannerFixture } from "@workspace/mapazapp-core";
import { getMockSymbolMarketSpec } from "@/services/mockSymbolProfiles";
import type { ScannerSimulationDataSource } from "./scannerSimulationDataSource";

export function createMockScannerSimulationDataSource(): ScannerSimulationDataSource {
  return {
    getLatestSimulation() {
      const accountId = "ACC_THE5ERS_100K_PHASE1_A" as AccountId;
      const spec = getMockSymbolMarketSpec(accountId, "XAUUSD");
      if (!spec) throw new Error("Missing mock XAUUSD profile");
      return runCheckpoint12ScannerFixture({
        runId: "ui_mock_scan_latest",
        accountId,
        symbolProfile: spec,
        scenario: "xau_buy",
      });
    },

    getLatestSimulationForAccount(accountId: AccountId) {
      if (accountId === "ACC_PROPXP_50K_PHASE1") {
        const spec = getMockSymbolMarketSpec(accountId, "EURUSD");
        if (!spec) throw new Error("Missing mock EURUSD profile");
        return runCheckpoint12ScannerFixture({
          runId: "ui_mock_scan_propxp",
          accountId,
          symbolProfile: spec,
          scenario: "eur_flat",
        });
      }
      const spec = getMockSymbolMarketSpec(accountId, "XAUUSD");
      if (!spec) throw new Error("Missing mock XAUUSD profile");
      return runCheckpoint12ScannerFixture({
        runId: "ui_mock_scan_account",
        accountId,
        symbolProfile: spec,
        scenario: "xau_buy",
      });
    },
  };
}
