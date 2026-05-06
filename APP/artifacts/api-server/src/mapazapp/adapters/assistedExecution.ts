/**
 * Read-only mock assisted execution contract (checkpoints 17–18).
 */
import type { AccountId } from "@workspace/mapazapp-core";
import {
  createAssistedExecutionFixtureBlockedAccountGuard,
  createAssistedExecutionFixtureValidManualChecklist,
  createAssistedExecutionSafetySnapshot,
  normalizeAssistedExecutionSafetyFlags,
  validateAssistedExecutionIntent,
  ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES,
  type AssistedExecutionValidationResult,
} from "@workspace/mapazapp-core";

/** Passed to `okResponse` — root envelope already sets `mockOnly: true`. */
const CP18_ASSISTED_EXECUTION_FLAGS = {
  contractOnly: true as const,
  executionEnabled: false as const,
  sendToMt5Enabled: false as const,
  canAutoExecute: false as const,
  requiresHumanConfirmation: true as const,
  registryMutationAllowed: false as const,
  manualReviewRequired: true as const,
  reviewOnly: true as const,
};

/** @deprecated Use `CP18_ASSISTED_EXECUTION_FLAGS` — kept for internal imports named CP17_FLAGS. */
const CP17_FLAGS = CP18_ASSISTED_EXECUTION_FLAGS;

export function assistedExecutionContractPayload() {
  return {
    checkpoint: 17,
    schema: "MZP_ASSISTED_EXECUTION_CONTRACT_V1",
    description:
      "Contract-only: defines validation gates and human confirmations for a future assisted workflow. No execution, no MT5 commands. CP18 hardens invariants only — execution remains disabled.",
    allowedActionTypes: [
      "REVIEW_ONLY",
      "PREPARE_ORDER_TICKET",
      "MANUAL_EXECUTION_CHECKLIST",
      "FUTURE_SEND_TO_MT5_DISABLED",
    ] as const,
    defaultAction: "REVIEW_ONLY" as const,
    executionEnabled: false,
    sendToMt5Enabled: false,
    canAutoExecute: false,
    requiresHumanConfirmation: true,
    registryMutationAllowed: false,
    manualReviewRequired: true,
  };
}

export function assistedExecutionSafetyPayload() {
  return createAssistedExecutionSafetySnapshot(mockAssistedExecutionValidation());
}

export function assistedExecutionInvariantsPayload() {
  const validation = mockAssistedExecutionValidation();
  return {
    checkpoint: 18 as const,
    schema: "MZP_ASSISTED_EXECUTION_INVARIANTS_V1" as const,
    normalizedFlags: normalizeAssistedExecutionSafetyFlags(validation),
    policyReasonCodes: [...ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES],
    derivedFromMockValidation: true as const,
  };
}

export function mockAssistedExecutionValidation(): AssistedExecutionValidationResult {
  return validateAssistedExecutionIntent(createAssistedExecutionFixtureValidManualChecklist());
}

export function mockAssistedExecutionValidationForAccount(accountId: AccountId): AssistedExecutionValidationResult {
  const base = createAssistedExecutionFixtureValidManualChecklist();
  if (accountId === "ACC_FORWARD_MONITOR_GUARD_BLOCK") {
    return validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedAccountGuard());
  }
  const input = {
    ...base,
    accountId,
    tradeReviewPlan: base.tradeReviewPlan
      ? { ...base.tradeReviewPlan, accountId }
      : null,
    accountGuardResult: { ...base.accountGuardResult, accountId },
    auditId: `ae_api_${accountId}`,
  };
  return validateAssistedExecutionIntent(input);
}

export { CP17_FLAGS, CP18_ASSISTED_EXECUTION_FLAGS };
