import type { AssistedExecutionValidationResult } from "@workspace/mapazapp-core";

/** Simple-view banner lines — contract only; no order placement wording. */
export function assistedExecutionManualReviewBanner(): string {
  return "Execution is disabled in this version. Manual review only — no broker submission.";
}

export function assistedExecutionContractExplanation(): string {
  return "This page defines what must be checked before any future assisted execution workflow. No live execution path exists.";
}

export function assistedExecutionSafetyHeadline(result: AssistedExecutionValidationResult): string {
  if (result.allowedForManualChecklist) {
    return "Allowed for manual checklist only — still no automation or MT5 send.";
  }
  return "Blocked — assisted checklist cannot proceed until gates and confirmations pass.";
}

export function assistedExecutionTechnicalSummary(result: AssistedExecutionValidationResult): string {
  return [
    `safetyStatus=${result.safetyStatus}`,
    `permissionState=${result.permissionState}`,
    `resolvedMode=${result.resolvedMode}`,
    `requestedAction=${result.requestedAction}`,
    `executionEnabled=${result.executionEnabled}`,
    `sendToMt5Enabled=${result.sendToMt5Enabled}`,
    `canAutoExecute=${result.canAutoExecute}`,
  ].join(" · ");
}

/**
 * Guard for copy audits: public dashboard strings must not imply live order placement.
 * Returns true if `text` contains discouraged execution CTA patterns (case-insensitive).
 */
export function assistedExecutionCopyImpliesLiveExecution(text: string): boolean {
  const t = text.toLowerCase();
  const bad = [
    "place order",
    "place a trade",
    "send order",
    "submit order",
    "execute trade",
    "execute now",
    "start bot",
    "auto execute",
    "one-click trade",
  ];
  return bad.some((b) => t.includes(b));
}
