import type { AccountId, ScannerSimulationResult } from "@workspace/mapazapp-core";

export interface ScannerSimulationDataSource {
  getLatestSimulation(): ScannerSimulationResult;
  getLatestSimulationForAccount(accountId: AccountId): ScannerSimulationResult;
}
