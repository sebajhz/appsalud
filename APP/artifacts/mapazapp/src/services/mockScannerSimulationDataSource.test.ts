import { describe, expect, it } from "vitest";
import type { AccountId } from "@workspace/mapazapp-core";
import { createMockScannerSimulationDataSource } from "./mockScannerSimulationDataSource";
import { scannerSimulationSimpleHeadline } from "./scannerSimulationUi";

describe("mockScannerSimulationDataSource", () => {
  it("returns latest simulation with fixture flags", () => {
    const ds = createMockScannerSimulationDataSource();
    const r = ds.getLatestSimulation();
    expect(r.mockOnly).toBe(true);
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.simulatedScanner).toBe(true);
    expect(r.run.accountId).toBe("ACC_THE5ERS_100K_PHASE1_A");
  });

  it("scopes PropXP account to EUR flat scenario", () => {
    const ds = createMockScannerSimulationDataSource();
    const r = ds.getLatestSimulationForAccount("ACC_PROPXP_50K_PHASE1" as AccountId);
    expect(r.run.canonicalSymbol).toBe("EURUSD");
    expect(r.status).toBe("no_candidates");
  });
});

describe("scannerSimulationUi", () => {
  it("maps no_candidates to simple copy", () => {
    const ds = createMockScannerSimulationDataSource();
    const r = ds.getLatestSimulationForAccount("ACC_PROPXP_50K_PHASE1" as AccountId);
    expect(scannerSimulationSimpleHeadline(r)).toContain("no candidates");
  });
});
