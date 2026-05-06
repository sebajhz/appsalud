/**
 * Assisted execution — **contract and validation only** (checkpoints 17–18).
 * No broker submission, no MT5 commands, no automation.
 */

import type { AccountId, ParameterSetId, StrategyId } from "./ids";
import type { AccountGuardResult } from "./account-guard-types";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanStatus, TradeReviewPlan } from "./trade-plan-types";

/** Policy knobs for `validateAssistedExecutionIntent` — dev/mock defaults in settings module. */
export interface AssistedExecutionSettings {
  requireBacktestEvidenceRecommendation: boolean;
  /** Minimum R:R from trade plan metrics (must have computed metrics). */
  minTradePlanRr: number;
  /** Reject when proposedRiskFractionOfEquity exceeds this (e.g. 0.02 = 2%). */
  maxProposedRiskFractionOfEquity: number;
  confirmationPhraseRequired: boolean;
  expectedConfirmationPhrase: string;
  confirmationTextRequired: string;
  /** When false, explicit newsBlackoutActive blocks even if other paths were loose. */
  allowNewsBlackoutAssistedProgress: boolean;
  /** When true, every flag in AssistedExecutionHumanConfirmation must be true. */
  requireAllHumanConfirmations: boolean;
}

/** Contract-only action kinds. Default in product flows: REVIEW_ONLY. */
export type AssistedExecutionActionType =
  | "REVIEW_ONLY"
  | "PREPARE_ORDER_TICKET"
  | "MANUAL_EXECUTION_CHECKLIST"
  /** Disabled placeholder — must always validate as blocked in CP17. */
  | "FUTURE_SEND_TO_MT5_DISABLED";

/**
 * Product posture for assisted workflows. In CP17 all paths remain non-executing;
 * `live_execution_forbidden` reflects global safety posture.
 */
export type AssistedExecutionMode =
  | "review_only"
  | "manual_checklist"
  | "assisted_draft_disabled"
  | "live_execution_forbidden";

export type AssistedExecutionSafetyStatus = "blocked" | "allowed_for_manual_checklist";

/** Coarse permission bucket for UI / audit. */
export type AssistedExecutionPermissionState =
  | "blocked"
  | "manual_checklist_only"
  | "contract_read_only";

export interface AssistedExecutionBlockingReason {
  code: string;
  messageSimple: string;
  messageTechnical: string;
}

export interface AssistedExecutionWarningReason {
  code: string;
  messageSimple: string;
  messageTechnical: string;
}

/**
 * Human attestation flags for a future gated workflow.
 * CP17 only checks presence — it does not persist or trigger execution.
 */
export interface AssistedExecutionHumanConfirmation {
  reviewedSetup: boolean;
  reviewedRisk: boolean;
  reviewedPropFirmRules: boolean;
  reviewedNoAutoExecution: boolean;
  reviewedManualOnly: boolean;
  reviewedStopLoss: boolean;
  reviewedPositionSizing: boolean;
  reviewedNewsRisk: boolean;
}

export interface AssistedExecutionIntent {
  requestedAction: AssistedExecutionActionType;
  humanConfirmations: Partial<AssistedExecutionHumanConfirmation>;
  /** When settings require phrase match, must equal expected phrase. */
  confirmationPhrase?: string;
  /** Optional dedupe key (e.g. zoneId) — must not collide with active intents. */
  intentDedupeKey?: string;
}

export interface AssistedExecutionRequest extends AssistedExecutionIntent {
  accountId: AccountId;
}

/** Optional forward-monitor cross-check — when present, must still be trade-ready. */
export interface AssistedExecutionForwardMonitorRef {
  zoneId: string;
  reviewStatus: TradePlanStatus;
}

/**
 * Pure validation input — caller supplies snapshots; no I/O.
 */
export interface AssistedExecutionValidationInput {
  settings: AssistedExecutionSettings;
  intent: AssistedExecutionIntent;
  accountId: AccountId;
  tradeReviewPlan: TradeReviewPlan | null;
  accountGuardResult: AccountGuardResult;
  registryCompatibility: ParameterSetCompatibilityResult;
  symbolProfile: SymbolMarketSpec | null;
  /** When settings.requireBacktestEvidenceRecommendation, must be true. */
  backtestEvidenceRecommendationPresent?: boolean;
  forwardMonitorCandidate?: AssistedExecutionForwardMonitorRef;
  existingActiveIntentKeys?: string[];
  /** Proposed risk as fraction of equity (0–1). When set, compared to settings.maxProposedRiskFractionOfEquity. */
  proposedRiskFractionOfEquity?: number;
  /** Explicit operational flags — defense in depth beyond aggregated guard allowTradeReview. */
  newsBlackoutActive?: boolean;
  psychologicalLockActive?: boolean;
  createdAtUtc?: string;
  auditId?: string;
  notes?: string;
}

export interface AssistedExecutionValidationResult {
  safetyStatus: AssistedExecutionSafetyStatus;
  allowedForManualChecklist: boolean;
  blockingReasons: AssistedExecutionBlockingReason[];
  warningReasons: AssistedExecutionWarningReason[];
  executionEnabled: false;
  sendToMt5Enabled: false;
  requiresHumanConfirmation: true;
  /** CP18 — same product rule as `requiresHumanConfirmation`; explicit for API / audit parity with scope freeze. */
  manualReviewRequired: true;
  canAutoExecute: false;
  /** CP18 — Mapazapp never mutates registry from assisted flows in this phase. */
  registryMutationAllowed: false;
  requestedAction: AssistedExecutionActionType;
  resolvedMode: AssistedExecutionMode;
  permissionState: AssistedExecutionPermissionState;
  auditPreview: AssistedExecutionAuditRecord;
  humanConfirmationsEffective: AssistedExecutionHumanConfirmation;
  confirmationTextRequired: string;
}

export type AssistedExecutionAuditValidationStatus = "blocked" | "allowed_for_manual_checklist";

export interface AssistedExecutionAuditRecord {
  auditId: string;
  createdAtUtc: string;
  accountId: AccountId;
  symbol: string;
  strategyId?: StrategyId;
  parameterSetId?: ParameterSetId;
  zoneId?: string;
  tradeReviewStatus: TradePlanStatus | "NONE";
  requestedAction: AssistedExecutionActionType;
  validationStatus: AssistedExecutionAuditValidationStatus;
  blockingReasons: AssistedExecutionBlockingReason[];
  warningReasons: AssistedExecutionWarningReason[];
  humanConfirmations: AssistedExecutionHumanConfirmation;
  executionEnabled: false;
  canAutoExecute: false;
  manualReviewRequired: true;
  registryMutationAllowed: false;
  notes?: string;
}
