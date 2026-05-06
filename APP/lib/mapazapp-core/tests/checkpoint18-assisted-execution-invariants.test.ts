import { describe, expect, it } from "vitest";
import {
  assertAssistedExecutionDisabled,
  createAssistedExecutionFixtureBlockedAccountGuard,
  createAssistedExecutionFixtureBlockedMissingConfirmation,
  createAssistedExecutionFixtureBlockedParameterSet,
  createAssistedExecutionFixtureBlockedFutureMt5,
  createAssistedExecutionFixtureValidManualChecklist,
  createAssistedExecutionSafetySnapshot,
  normalizeAssistedExecutionSafetyFlags,
  validateAssistedExecutionIntent,
} from "../src/index";

describe("Checkpoint 18 — assisted execution invariants", () => {
  it("assertAssistedExecutionDisabled passes for valid fixture", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureValidManualChecklist());
    expect(() => assertAssistedExecutionDisabled(r)).not.toThrow();
  });

  it("normalizeAssistedExecutionSafetyFlags always returns disabled literals", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureValidManualChecklist());
    const n = normalizeAssistedExecutionSafetyFlags(r);
    expect(n.executionEnabled).toBe(false);
    expect(n.sendToMt5Enabled).toBe(false);
    expect(n.canAutoExecute).toBe(false);
    expect(n.registryMutationAllowed).toBe(false);
    expect(n.manualReviewRequired).toBe(true);
  });

  it("createAssistedExecutionSafetySnapshot includes CP18 policy codes and summary", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureValidManualChecklist());
    const s = createAssistedExecutionSafetySnapshot(r);
    expect(s.checkpoint).toBe(18);
    expect(s.schema).toBe("MZP_ASSISTED_EXECUTION_SAFETY_SNAPSHOT_V1");
    expect(s.policyReasonCodes).toContain("EXECUTION_DISABLED_BY_CP18");
    expect(s.policyReasonCodes).toContain("MANUAL_ONLY_PHASE");
    expect(s.validationSummary.allowedForManualChecklist).toBe(true);
  });

  it("allowed manual checklist still has execution disabled", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureValidManualChecklist());
    expect(r.allowedForManualChecklist).toBe(true);
    assertAssistedExecutionDisabled(r);
    expect(r.executionEnabled).toBe(false);
    expect(r.canAutoExecute).toBe(false);
  });

  it("FUTURE_SEND_TO_MT5_DISABLED fixture still triggers assert on result (flags never enable)", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedFutureMt5());
    expect(r.allowedForManualChecklist).toBe(false);
    assertAssistedExecutionDisabled(r);
  });

  it("fixture sweep: no result exposes canAutoExecute true or executionEnabled true", () => {
    const fixtures = [
      createAssistedExecutionFixtureValidManualChecklist(),
      createAssistedExecutionFixtureBlockedFutureMt5(),
      createAssistedExecutionFixtureBlockedAccountGuard(),
      createAssistedExecutionFixtureBlockedMissingConfirmation(),
      createAssistedExecutionFixtureBlockedParameterSet(),
    ];
    for (const f of fixtures) {
      const r = validateAssistedExecutionIntent(f);
      assertAssistedExecutionDisabled(r);
      expect(r.canAutoExecute).toBe(false);
      expect(r.registryMutationAllowed).toBe(false);
      expect(r.manualReviewRequired).toBe(true);
    }
  });
});
