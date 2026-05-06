import { describe, expect, it } from "vitest";
import {
  createAssistedExecutionFixtureBlockedAccountGuard,
  createAssistedExecutionFixtureBlockedFutureMt5,
  createAssistedExecutionFixtureBlockedMissingConfirmation,
  createAssistedExecutionFixtureBlockedParameterSet,
  createAssistedExecutionFixtureValidManualChecklist,
  createDefaultAssistedExecutionSettingsForTests,
  validateAssistedExecutionIntent,
} from "../src/index";

describe("Checkpoint 17 — assisted execution contract", () => {
  it("valid TRADE_READY + all confirmations => allowed for manual checklist; never enables execution", () => {
    const input = createAssistedExecutionFixtureValidManualChecklist();
    const r = validateAssistedExecutionIntent(input);
    expect(r.allowedForManualChecklist).toBe(true);
    expect(r.safetyStatus).toBe("allowed_for_manual_checklist");
    expect(r.executionEnabled).toBe(false);
    expect(r.sendToMt5Enabled).toBe(false);
    expect(r.canAutoExecute).toBe(false);
    expect(r.requiresHumanConfirmation).toBe(true);
    expect(r.manualReviewRequired).toBe(true);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.auditPreview.executionEnabled).toBe(false);
    expect(r.auditPreview.canAutoExecute).toBe(false);
    expect(r.auditPreview.manualReviewRequired).toBe(true);
    expect(r.auditPreview.registryMutationAllowed).toBe(false);
    expect(r.auditPreview.validationStatus).toBe("allowed_for_manual_checklist");
  });

  it("non-TRADE_READY plan blocks", () => {
    const input = createAssistedExecutionFixtureValidManualChecklist();
    const plan = input.tradeReviewPlan!;
    const r = validateAssistedExecutionIntent({
      ...input,
      tradeReviewPlan: { ...plan, status: "OBSERVE" },
    });
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_NOT_TRADE_READY")).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.canAutoExecute).toBe(false);
  });

  it("account guard blocked blocks", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedAccountGuard());
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_ACCOUNT_GUARD_BLOCKS")).toBe(true);
    expect(r.executionEnabled).toBe(false);
  });

  it("parameter set not approved for trade review blocks", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedParameterSet());
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_PARAMETER_SET_NOT_APPROVED")).toBe(true);
  });

  it("missing confirmations block", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedMissingConfirmation());
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_HUMAN_CONFIRMATIONS_INCOMPLETE")).toBe(true);
  });

  it("FUTURE_SEND_TO_MT5_DISABLED action blocks", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedFutureMt5());
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_FUTURE_MT5_SEND_DISABLED")).toBe(true);
  });

  it("unknown action blocks", () => {
    const input = createAssistedExecutionFixtureValidManualChecklist();
    const r = validateAssistedExecutionIntent({
      ...input,
      intent: { ...input.intent, requestedAction: "SEND_ORDER" as typeof input.intent.requestedAction },
    });
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_ACTION_UNKNOWN")).toBe(true);
  });

  it("duplicate intent key blocks", () => {
    const input = createAssistedExecutionFixtureValidManualChecklist();
    const r = validateAssistedExecutionIntent({
      ...input,
      existingActiveIntentKeys: ["CP17_FIXTURE_ZONE_XAU_1"],
    });
    expect(r.allowedForManualChecklist).toBe(false);
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_DUPLICATE_INTENT")).toBe(true);
  });

  it("required backtest evidence missing blocks when setting on", () => {
    const input = createAssistedExecutionFixtureValidManualChecklist();
    const r = validateAssistedExecutionIntent({
      ...input,
      settings: { ...input.settings, requireBacktestEvidenceRecommendation: true },
      backtestEvidenceRecommendationPresent: false,
    });
    expect(r.blockingReasons.some((b) => b.code === "ASSISTED_BACKTEST_EVIDENCE_REQUIRED")).toBe(true);
  });

  it("result never has executionEnabled or canAutoExecute true (fixture sweep)", () => {
    const fixtures = [
      createAssistedExecutionFixtureValidManualChecklist(),
      createAssistedExecutionFixtureBlockedAccountGuard(),
      createAssistedExecutionFixtureBlockedParameterSet(),
      createAssistedExecutionFixtureBlockedMissingConfirmation(),
      createAssistedExecutionFixtureBlockedFutureMt5(),
    ];
    for (const f of fixtures) {
      const r = validateAssistedExecutionIntent(f);
      expect(r.executionEnabled).toBe(false);
      expect(r.canAutoExecute).toBe(false);
      expect(r.sendToMt5Enabled).toBe(false);
      expect(r.registryMutationAllowed).toBe(false);
      expect(r.manualReviewRequired).toBe(true);
    }
  });

  it("default settings phrase matches fixture", () => {
    const s = createDefaultAssistedExecutionSettingsForTests();
    expect(s.confirmationTextRequired).toBe(s.expectedConfirmationPhrase);
  });
});
