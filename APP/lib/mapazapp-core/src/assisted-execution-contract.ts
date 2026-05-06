/**
 * Pure assisted execution intent validation — checkpoint 17 contract only.
 */

import type {
  AssistedExecutionActionType,
  AssistedExecutionAuditRecord,
  AssistedExecutionAuditValidationStatus,
  AssistedExecutionHumanConfirmation,
  AssistedExecutionMode,
  AssistedExecutionPermissionState,
  AssistedExecutionValidationInput,
  AssistedExecutionValidationResult,
} from "./assisted-execution-types";
import { assistedExecutionBlock, assistedExecutionWarn } from "./assisted-execution-reasons";

const CP17_ALLOWED_ACTIONS: ReadonlySet<AssistedExecutionActionType> = new Set([
  "REVIEW_ONLY",
  "PREPARE_ORDER_TICKET",
  "MANUAL_EXECUTION_CHECKLIST",
  "FUTURE_SEND_TO_MT5_DISABLED",
]);

function mergeHumanConfirmations(
  partial: Partial<AssistedExecutionHumanConfirmation>,
): AssistedExecutionHumanConfirmation {
  const base: AssistedExecutionHumanConfirmation = {
    reviewedSetup: false,
    reviewedRisk: false,
    reviewedPropFirmRules: false,
    reviewedNoAutoExecution: false,
    reviewedManualOnly: false,
    reviewedStopLoss: false,
    reviewedPositionSizing: false,
    reviewedNewsRisk: false,
  };
  return { ...base, ...partial };
}

function humanConfirmationsComplete(
  c: AssistedExecutionHumanConfirmation,
  requireAll: boolean,
): boolean {
  if (!requireAll) return true;
  return Object.values(c).every((v) => v === true);
}

function resolveMode(allowed: boolean, action: AssistedExecutionActionType): AssistedExecutionMode {
  if (!allowed) return "live_execution_forbidden";
  switch (action) {
    case "MANUAL_EXECUTION_CHECKLIST":
      return "manual_checklist";
    case "PREPARE_ORDER_TICKET":
      return "assisted_draft_disabled";
    case "FUTURE_SEND_TO_MT5_DISABLED":
      return "live_execution_forbidden";
    default:
      return "review_only";
  }
}

function resolvePermissionState(
  allowed: boolean,
  blockingLen: number,
): AssistedExecutionPermissionState {
  if (blockingLen > 0) return "blocked";
  if (allowed) return "manual_checklist_only";
  return "contract_read_only";
}

function buildAuditRecord(params: {
  input: AssistedExecutionValidationInput;
  validationStatus: AssistedExecutionAuditValidationStatus;
  blockingReasons: AssistedExecutionValidationResult["blockingReasons"];
  warningReasons: AssistedExecutionValidationResult["warningReasons"];
  humanConfirmationsEffective: AssistedExecutionHumanConfirmation;
  requestedAction: AssistedExecutionActionType;
}): AssistedExecutionAuditRecord {
  const plan = params.input.tradeReviewPlan;
  const t = params.input.createdAtUtc ?? "1970-01-01T00:00:00.000Z";
  const auditId =
    params.input.auditId ?? `ae_${params.input.accountId}_${plan?.zoneId ?? "nozone"}_${params.requestedAction}`;
  return {
    auditId,
    createdAtUtc: t,
    accountId: params.input.accountId,
    symbol: plan?.canonicalSymbol ?? "",
    strategyId: plan?.strategyId,
    parameterSetId: plan?.parameterSetId,
    zoneId: plan?.zoneId || undefined,
    tradeReviewStatus: plan?.status ?? "NONE",
    requestedAction: params.requestedAction,
    validationStatus: params.validationStatus,
    blockingReasons: params.blockingReasons,
    warningReasons: params.warningReasons,
    humanConfirmations: params.humanConfirmationsEffective,
    executionEnabled: false,
    canAutoExecute: false,
    notes: params.input.notes,
  };
}

export function validateAssistedExecutionIntent(
  input: AssistedExecutionValidationInput,
): AssistedExecutionValidationResult {
  const blocking: AssistedExecutionValidationResult["blockingReasons"] = [];
  const warnings: AssistedExecutionValidationResult["warningReasons"] = [];
  const action = input.intent.requestedAction;
  const settings = input.settings;
  const humanEffective = mergeHumanConfirmations(input.intent.humanConfirmations);

  const pushBlock = (code: string, simple: string, technical?: string) => {
    blocking.push(assistedExecutionBlock(code, simple, technical));
  };

  if (!CP17_ALLOWED_ACTIONS.has(action)) {
    pushBlock(
      "ASSISTED_ACTION_UNKNOWN",
      "This action is outside the checkpoint 17 assisted execution contract.",
      "requestedAction not in CP17_ALLOWED_ACTIONS",
    );
  }

  if (action === "FUTURE_SEND_TO_MT5_DISABLED") {
    pushBlock(
      "ASSISTED_FUTURE_MT5_SEND_DISABLED",
      "Sending orders to MT5 is not implemented and is disabled in this version.",
      "FUTURE_SEND_TO_MT5_DISABLED",
    );
  }

  const plan = input.tradeReviewPlan;
  if (!plan) {
    pushBlock("ASSISTED_TRADE_PLAN_MISSING", "A trade review plan is required.", "tradeReviewPlan null");
  }

  if (plan && plan.status !== "TRADE_READY") {
    pushBlock(
      "ASSISTED_NOT_TRADE_READY",
      "Assisted execution contract requires TRADE_READY review status.",
      `plan.status=${plan.status}`,
    );
  }

  if (plan && plan.status === "TRADE_READY") {
    const hasReviewOnly = plan.reasons.some((r) => r.code === "TRADE_READY_REVIEW_ONLY");
    if (!hasReviewOnly) {
      pushBlock(
        "ASSISTED_NOT_REVIEW_ONLY_SEMANTICS",
        "Trade plan must carry review-only semantics (TRADE_READY_REVIEW_ONLY).",
        "missing TRADE_READY_REVIEW_ONLY reason",
      );
    }
  }

  if (!input.accountGuardResult.allowTradeReview) {
    pushBlock(
      "ASSISTED_ACCOUNT_GUARD_BLOCKS",
      "Account guard does not allow trade review for this account.",
      input.accountGuardResult.technicalSummary,
    );
  }

  if (!input.registryCompatibility.allowTradeReview) {
    pushBlock(
      "ASSISTED_PARAMETER_SET_NOT_APPROVED",
      "Parameter set is not approved for trade review.",
      input.registryCompatibility.technicalSummary,
    );
  }

  if (settings.requireBacktestEvidenceRecommendation && !input.backtestEvidenceRecommendationPresent) {
    pushBlock(
      "ASSISTED_BACKTEST_EVIDENCE_REQUIRED",
      "Backtest evidence recommendation is required before this checklist step.",
      "backtestEvidenceRecommendationPresent false",
    );
  }

  if (input.forwardMonitorCandidate) {
    if (input.forwardMonitorCandidate.reviewStatus !== "TRADE_READY") {
      pushBlock(
        "ASSISTED_FORWARD_MONITOR_STALE",
        "Forward monitor candidate is no longer trade-ready.",
        `forwardMonitorCandidate.reviewStatus=${input.forwardMonitorCandidate.reviewStatus}`,
      );
    }
    if (plan && input.forwardMonitorCandidate.zoneId !== plan.zoneId) {
      pushBlock(
        "ASSISTED_FORWARD_MONITOR_ZONE_MISMATCH",
        "Forward monitor candidate does not match this trade plan zone.",
        "zoneId mismatch",
      );
    }
  }

  if (!input.symbolProfile) {
    pushBlock("ASSISTED_SYMBOL_PROFILE_MISSING", "Symbol profile is required.", "symbolProfile null");
  }

  if (plan) {
    if (
      plan.stopLoss == null ||
      plan.takeProfit == null ||
      !Number.isFinite(plan.stopLoss) ||
      !Number.isFinite(plan.takeProfit)
    ) {
      pushBlock("ASSISTED_SL_TP_MISSING", "Stop loss and take profit must be defined and finite.", "sl/tp");
    }
    if (!plan.metrics || !Number.isFinite(plan.metrics.rr)) {
      pushBlock("ASSISTED_RR_MISSING", "Risk metrics and R:R are required.", "metrics null or rr not finite");
    } else if (plan.metrics.rr < settings.minTradePlanRr) {
      pushBlock(
        "ASSISTED_RR_BELOW_MIN",
        `R:R is below the minimum required (${settings.minTradePlanRr}).`,
        `rr=${plan.metrics.rr}`,
      );
    }
  }

  if (
    input.proposedRiskFractionOfEquity != null &&
    Number.isFinite(input.proposedRiskFractionOfEquity) &&
    input.proposedRiskFractionOfEquity > settings.maxProposedRiskFractionOfEquity
  ) {
    pushBlock(
      "ASSISTED_RISK_EXCEEDS_LIMIT",
      "Proposed risk exceeds the configured limit for assisted review.",
      `proposedRiskFractionOfEquity=${input.proposedRiskFractionOfEquity}`,
    );
  }

  if (input.newsBlackoutActive && !settings.allowNewsBlackoutAssistedProgress) {
    pushBlock(
      "ASSISTED_NEWS_BLACKOUT",
      "News blackout is active — assisted checklist progression is blocked.",
      "newsBlackoutActive",
    );
  }

  if (input.psychologicalLockActive) {
    pushBlock(
      "ASSISTED_PSYCHOLOGICAL_LOCK",
      "Psychological lock is active — assisted checklist progression is blocked.",
      "psychologicalLockActive",
    );
  }

  if (
    input.intent.intentDedupeKey &&
    input.existingActiveIntentKeys?.includes(input.intent.intentDedupeKey)
  ) {
    pushBlock(
      "ASSISTED_DUPLICATE_INTENT",
      "Another active assisted intent exists for this zone or candidate.",
      `intentDedupeKey=${input.intent.intentDedupeKey}`,
    );
  }

  if (!humanConfirmationsComplete(humanEffective, settings.requireAllHumanConfirmations)) {
    pushBlock(
      "ASSISTED_HUMAN_CONFIRMATIONS_INCOMPLETE",
      "All required human confirmations must be checked before progressing.",
      "humanConfirmations",
    );
  }

  if (settings.confirmationPhraseRequired) {
    const got = input.intent.confirmationPhrase?.trim() ?? "";
    if (got !== settings.expectedConfirmationPhrase) {
      pushBlock(
        "ASSISTED_CONFIRMATION_PHRASE_MISMATCH",
        "Confirmation phrase does not match the required text.",
        "confirmationPhrase",
      );
    }
  }

  if (
    input.accountGuardResult.allowTradeReview &&
    input.accountGuardResult.warningReasons.length > 0 &&
    blocking.length === 0
  ) {
    for (const w of input.accountGuardResult.warningReasons) {
      warnings.push(assistedExecutionWarn(w.code, w.messageSimple, w.messageTechnical));
    }
  }

  const allowedForManualChecklist = blocking.length === 0;
  const safetyStatus = allowedForManualChecklist ? "allowed_for_manual_checklist" : "blocked";
  const validationStatus: AssistedExecutionAuditValidationStatus = allowedForManualChecklist
    ? "allowed_for_manual_checklist"
    : "blocked";

  const auditPreview = buildAuditRecord({
    input,
    validationStatus,
    blockingReasons: blocking,
    warningReasons: warnings,
    humanConfirmationsEffective: humanEffective,
    requestedAction: action,
  });

  return {
    safetyStatus,
    allowedForManualChecklist,
    blockingReasons: blocking,
    warningReasons: warnings,
    executionEnabled: false,
    sendToMt5Enabled: false,
    requiresHumanConfirmation: true,
    canAutoExecute: false,
    requestedAction: action,
    resolvedMode: resolveMode(allowedForManualChecklist, action),
    permissionState: resolvePermissionState(allowedForManualChecklist, blocking.length),
    auditPreview,
    humanConfirmationsEffective: humanEffective,
    confirmationTextRequired: settings.confirmationTextRequired,
  };
}
