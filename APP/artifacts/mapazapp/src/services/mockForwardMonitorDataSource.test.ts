import { describe, expect, it } from "vitest";
import { createMockForwardMonitorDataSource } from "./mockForwardMonitorDataSource";

describe("mockForwardMonitorDataSource", () => {
  it("returns latest forward monitor for default account", () => {
    const ds = createMockForwardMonitorDataSource();
    const r = ds.getLatestForwardMonitorForAccount("ACC_THE5ERS_100K_PHASE1_A");
    expect(r.mockOnly).toBe(true);
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.accountId).toBe("ACC_THE5ERS_100K_PHASE1_A");
  });
});
