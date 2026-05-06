/**
 * CP18 — assisted execution safety invariants (assert / normalize / snapshot only).
 * These helpers never enable execution; they verify, normalize, or describe disabled posture.
 */

import type { AssistedExecutionValidationResult } from "./assisted-execution-types";

/** Static policy tags for documentation, API snapshots, and audits — not alternate blocking codes. */
export const ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES = [
  "EXECUTION_DISABLED_BY_CP18",
  "SEND_TO_MT5_DISABLED_BY_CP18",
  "POST_EXECUTION_FORBIDDEN",
  "REGISTRY_MUTATION_FORBIDDEN",
  "MANUAL_ONLY_PHASE",
] as const;

export type AssistedExecutionCp18PolicyReasonCode =
  (typeof ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES)[number];

/** Enforced safety flags for mock API and UI — literals only. */
export interface AssistedExecutionSafetyFlagsNormalized {
  executionEnabled: false;
  sendToMt5Enabled: false;
  canAutoExecute: false;
  registryMutationAllowed: false;
  manualReviewRequired: true;
}

export interface AssistedExecutionSafetySnapshot {
  checkpoint: 18;
  schema: "MZP_ASSISTED_EXECUTION_SAFETY_SNAPSHOT_V1";
  normalizedFlags: AssistedExecutionSafetyFlagsNormalized;
  policyReasonCodes: readonly AssistedExecutionCp18PolicyReasonCode[];
  validationSummary: {
    safetyStatus: AssistedExecutionValidationResult["safetyStatus"];
    allowedForManualChecklist: boolean;
    requestedAction: AssistedExecutionValidationResult["requestedAction"];
  };
}

export function assertAssistedExecutionDisabled(result: AssistedExecutionValidationResult): void {
  if (result.executionEnabled !== false) {
    throw new Error("assertAssistedExecutionDisabled: executionEnabled must be false");
  }
  if (result.sendToMt5Enabled !== false) {
    throw new Error("assertAssistedExecutionDisabled: sendToMt5Enabled must be false");
  }
  if (result.canAutoExecute !== false) {
    throw new Error("assertAssistedExecutionDisabled: canAutoExecute must be false");
  }
  if (result.registryMutationAllowed !== false) {
    throw new Error("assertAssistedExecutionDisabled: registryMutationAllowed must be false");
  }
  if (result.manualReviewRequired !== true) {
    throw new Error("assertAssistedExecutionDisabled: manualReviewRequired must be true");
  }
  if (result.auditPreview.executionEnabled !== false || result.auditPreview.canAutoExecute !== false) {
    throw new Error("assertAssistedExecutionDisabled: auditPreview execution flags invalid");
  }
  if (result.auditPreview.registryMutationAllowed !== false || result.auditPreview.manualReviewRequired !== true) {
    throw new Error("assertAssistedExecutionDisabled: auditPreview CP18 flags invalid");
  }
}

/**
 * Returns the CP18-enforced flag bundle. Callers may ignore `result` fields for outbound API
 * envelopes and use this shape alone — execution stays disabled by construction.
 */
export function normalizeAssistedExecutionSafetyFlags(
  _result: AssistedExecutionValidationResult,
): AssistedExecutionSafetyFlagsNormalized {
  return {
    executionEnabled: false,
    sendToMt5Enabled: false,
    canAutoExecute: false,
    registryMutationAllowed: false,
    manualReviewRequired: true,
  };
}

export function createAssistedExecutionSafetySnapshot(
  result: AssistedExecutionValidationResult,
): AssistedExecutionSafetySnapshot {
  assertAssistedExecutionDisabled(result);
  return {
    checkpoint: 18,
    schema: "MZP_ASSISTED_EXECUTION_SAFETY_SNAPSHOT_V1",
    normalizedFlags: normalizeAssistedExecutionSafetyFlags(result),
    policyReasonCodes: [...ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES],
    validationSummary: {
      safetyStatus: result.safetyStatus,
      allowedForManualChecklist: result.allowedForManualChecklist,
      requestedAction: result.requestedAction,
    },
  };
}
