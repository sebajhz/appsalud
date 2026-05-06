import { describe, expect, it } from "vitest";
import {
  assistedExecutionContractExplanation,
  assistedExecutionCopyImpliesLiveExecution,
  assistedExecutionDisabledBannerTitle,
  assistedExecutionManualReviewBanner,
  assistedExecutionNoOrderDisclaimer,
  assistedExecutionSafetyChecklistLines,
  assistedExecutionSafetyHeadline,
} from "./assistedExecutionUi";
import type { AssistedExecutionValidationResult } from "@workspace/mapazapp-core";

function minimalResult(partial: Partial<AssistedExecutionValidationResult>): AssistedExecutionValidationResult {
  return {
    safetyStatus: "blocked",
    allowedForManualChecklist: false,
    blockingReasons: [],
    warningReasons: [],
    executionEnabled: false,
    sendToMt5Enabled: false,
    requiresHumanConfirmation: true,
    manualReviewRequired: true,
    registryMutationAllowed: false,
    canAutoExecute: false,
    requestedAction: "REVIEW_ONLY",
    resolvedMode: "review_only",
    permissionState: "blocked",
    auditPreview: {
      auditId: "t",
      createdAtUtc: "2026-05-05T00:00:00.000Z",
      accountId: "ACC_T",
      symbol: "XAUUSD",
      tradeReviewStatus: "TRADE_READY",
      requestedAction: "REVIEW_ONLY",
      validationStatus: "blocked",
      blockingReasons: [],
      warningReasons: [],
      humanConfirmations: {
        reviewedSetup: false,
        reviewedRisk: false,
        reviewedPropFirmRules: false,
        reviewedNoAutoExecution: false,
        reviewedManualOnly: false,
        reviewedStopLoss: false,
        reviewedPositionSizing: false,
        reviewedNewsRisk: false,
      },
      executionEnabled: false,
      canAutoExecute: false,
      manualReviewRequired: true,
      registryMutationAllowed: false,
    },
    humanConfirmationsEffective: {
      reviewedSetup: false,
      reviewedRisk: false,
      reviewedPropFirmRules: false,
      reviewedNoAutoExecution: false,
      reviewedManualOnly: false,
      reviewedStopLoss: false,
      reviewedPositionSizing: false,
      reviewedNewsRisk: false,
    },
    confirmationTextRequired: "I understand this is manual review only",
    ...partial,
  };
}

describe("assistedExecutionUi", () => {
  it("banner and contract copy emphasize manual review without live execution CTAs", () => {
    expect(assistedExecutionManualReviewBanner()).toMatch(/manual review/i);
    expect(assistedExecutionManualReviewBanner()).toMatch(/disabled/i);
    expect(assistedExecutionDisabledBannerTitle()).toMatch(/execution disabled/i);
    expect(assistedExecutionDisabledBannerTitle()).toMatch(/contract only/i);
    expect(assistedExecutionNoOrderDisclaimer().toLowerCase()).toContain("no order");
    expect(assistedExecutionContractExplanation()).toMatch(/future/i);
    expect(assistedExecutionCopyImpliesLiveExecution(assistedExecutionManualReviewBanner())).toBe(false);
    expect(assistedExecutionCopyImpliesLiveExecution(assistedExecutionContractExplanation())).toBe(false);
    expect(assistedExecutionCopyImpliesLiveExecution(assistedExecutionDisabledBannerTitle())).toBe(false);
    for (const line of assistedExecutionSafetyChecklistLines()) {
      expect(assistedExecutionCopyImpliesLiveExecution(line)).toBe(false);
    }
  });

  it("copy guard flags obvious live execution phrases", () => {
    expect(assistedExecutionCopyImpliesLiveExecution("Place order now")).toBe(true);
    expect(assistedExecutionCopyImpliesLiveExecution("Start bot trading")).toBe(true);
  });

  it("safety headline distinguishes allowed checklist vs blocked", () => {
    const allowed = minimalResult({
      allowedForManualChecklist: true,
      safetyStatus: "allowed_for_manual_checklist",
      permissionState: "manual_checklist_only",
    });
    const blocked = minimalResult({ allowedForManualChecklist: false, safetyStatus: "blocked" });
    expect(assistedExecutionSafetyHeadline(allowed)).toMatch(/manual checklist/i);
    expect(assistedExecutionSafetyHeadline(blocked)).toMatch(/blocked/i);
  });
});
