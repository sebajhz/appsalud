import { describe, expect, it } from "vitest";
import { createMockAssistedExecutionDataSource } from "./mockAssistedExecutionDataSource";

describe("mockAssistedExecutionDataSource", () => {
  it("returns validation result with execution never enabled", () => {
    const ds = createMockAssistedExecutionDataSource();
    const r = ds.getMockAssistedExecutionValidation("ACC_THE5ERS_100K_PHASE1_A");
    expect(r.executionEnabled).toBe(false);
    expect(r.sendToMt5Enabled).toBe(false);
    expect(r.canAutoExecute).toBe(false);
    expect(r.auditPreview.executionEnabled).toBe(false);
  });

  it("guard-block account yields blocked validation", () => {
    const ds = createMockAssistedExecutionDataSource();
    const r = ds.getMockAssistedExecutionValidation("ACC_FORWARD_MONITOR_GUARD_BLOCK");
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_ACCOUNT_GUARD_BLOCKS")).toBe(true);
  });
});
