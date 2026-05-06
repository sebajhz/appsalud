/**
 * Read-only mock assisted execution contract (checkpoint 17).
 */
import type { AccountId } from "@workspace/mapazapp-core";
import {
  createAssistedExecutionFixtureBlockedAccountGuard,
  createAssistedExecutionFixtureValidManualChecklist,
  validateAssistedExecutionIntent,
  type AssistedExecutionValidationResult,
} from "@workspace/mapazapp-core";

/** Passed to `okResponse` — root envelope already sets `mockOnly: true`. */
const CP17_FLAGS = {
  contractOnly: true as const,
  executionEnabled: false as const,
  sendToMt5Enabled: false as const,
  canAutoExecute: false as const,
  requiresHumanConfirmation: true as const,
  reviewOnly: true as const,
};

export function assistedExecutionContractPayload() {
  return {
    checkpoint: 17,
    schema: "MZP_ASSISTED_EXECUTION_CONTRACT_V1",
    description:
      "Contract-only: defines validation gates and human confirmations for a future assisted workflow. No execution, no MT5 commands.",
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

export { CP17_FLAGS };
