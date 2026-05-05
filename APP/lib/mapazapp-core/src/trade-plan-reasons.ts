import type { TradePlanReason } from "./trade-plan-types";
import type { ParameterSetBlockReason } from "./strategy-registry-types";

/** Stable machine-facing codes for UI / logs / future i18n. */
export type TradePlanReasonCode =
  | "ZONE_VALID"
  | "NO_ZONE"
  | "WAITING_FOR_RETEST"
  | "WAITING_FOR_CONFIRMATION"
  | "ZONE_INVALIDATED"
  | "ZONE_EXPIRED"
  | "ZONE_USED"
  | "MISSING_SYMBOL_PROFILE"
  | "MISSING_ATR_FOR_PLAN"
  | "RR_BELOW_MINIMUM"
  | "SPREAD_TOO_HIGH"
  | "SPREAD_NOT_ALLOWED"
  | "ACCOUNT_BLOCKED_DAILY_DRAWDOWN"
  | "ACCOUNT_BLOCKED_MAX_DRAWDOWN"
  | "ACCOUNT_MAX_TRADES"
  | "ACCOUNT_NEWS_BLACKOUT"
  | "ACCOUNT_PROP_BLOCKED"
  | "ACCOUNT_PSYCHOLOGICAL_LOCK"
  | "ACCOUNT_REVIEW_DISABLED"
  | "ACCOUNT_ID_REQUIRED"
  | "OPERATIONAL_STATUS_BLOCKS"
  | "PARAMETER_SET_NOT_APPROVED"
  | "SL_DISTANCE_TOO_WIDE"
  | "SCORE_BELOW_MINIMUM"
  | "NEAR_SWEEP_NOT_TRADE_READY"
  | "TRADE_READY_REVIEW_ONLY"
  | "REFERENCE_ENTRY_FALLBACK_MIDPOINT"
  | "STRATEGY_NOT_FOUND"
  | "STRATEGY_NOT_ACTIVE"
  | "PARAMETER_SET_NOT_FOUND"
  | "PARAMETER_SET_DRAFT"
  | "PARAMETER_SET_NOT_VALIDATED"
  | "PARAMETER_SET_ALERTS_ONLY"
  | "PARAMETER_SET_REJECTED"
  | "PARAMETER_SET_RETIRED"
  | "PARAMETER_SET_SYMBOL_MISMATCH"
  | "PARAMETER_SET_BROKER_SYMBOL_MISMATCH"
  | "PARAMETER_SET_ACCOUNT_NOT_ALLOWED"
  | "PARAMETER_SET_ACCOUNT_BLOCKED";

const MESSAGES: Record<TradePlanReasonCode, string> = {
  ZONE_VALID: "Zone geometry is valid for review.",
  NO_ZONE: "No active zone candidate — nothing to review.",
  WAITING_FOR_RETEST: "Zone exists but price has not retested it yet.",
  WAITING_FOR_CONFIRMATION: "Retest happened but confirmation is missing.",
  ZONE_INVALIDATED: "Invalidation level has been breached.",
  ZONE_EXPIRED: "Zone has expired by time or bar rules.",
  ZONE_USED: "This zone has already been consumed in the lifecycle.",
  MISSING_SYMBOL_PROFILE: "Symbol market profile is missing.",
  MISSING_ATR_FOR_PLAN: "ATR for confirmation timeframe is unavailable — cannot size SL buffer.",
  RR_BELOW_MINIMUM: "Reward-to-risk is below the configured minimum.",
  SPREAD_TOO_HIGH: "Spread exceeds the allowed ceiling for review.",
  SPREAD_NOT_ALLOWED: "Spread filter blocks this symbol for review.",
  ACCOUNT_BLOCKED_DAILY_DRAWDOWN: "Setup is blocked by daily drawdown rules.",
  ACCOUNT_BLOCKED_MAX_DRAWDOWN: "Setup is blocked by maximum drawdown rules.",
  ACCOUNT_MAX_TRADES: "Maximum trades per day has been reached.",
  ACCOUNT_NEWS_BLACKOUT: "News blackout is active.",
  ACCOUNT_PROP_BLOCKED: "Prop firm rules block new reviews.",
  ACCOUNT_PSYCHOLOGICAL_LOCK: "Psychological lock / checklist blocks review.",
  ACCOUNT_REVIEW_DISABLED: "Trade review is disabled for this account.",
  ACCOUNT_ID_REQUIRED: "Account id is required when account guard is enforced.",
  OPERATIONAL_STATUS_BLOCKS: "Operational status does not allow trade review.",
  PARAMETER_SET_NOT_APPROVED: "No approved parameter set for this symbol and account.",
  SL_DISTANCE_TOO_WIDE: "Stop distance is too wide versus ATR limits.",
  SCORE_BELOW_MINIMUM: "Score is below the minimum for trade-ready classification.",
  NEAR_SWEEP_NOT_TRADE_READY: "Only a near sweep is present; trade-ready requires a confirmed sweep unless explicitly allowed.",
  TRADE_READY_REVIEW_ONLY: "Setup passes gates for human review only — not an order or execution signal.",
  REFERENCE_ENTRY_FALLBACK_MIDPOINT: "Confirmation close was unavailable; midpoint is used as reference entry.",
  STRATEGY_NOT_FOUND: "Strategy is not registered for this zone.",
  STRATEGY_NOT_ACTIVE: "Strategy is paused, retired, or draft — not active for trade review.",
  PARAMETER_SET_NOT_FOUND: "Parameter set is not registered.",
  PARAMETER_SET_DRAFT: "Parameter set is draft — not cleared for trade-ready review.",
  PARAMETER_SET_NOT_VALIDATED: "Parameter set is not approved for trade review (tested/validated/demo only).",
  PARAMETER_SET_ALERTS_ONLY: "Parameter set is approved for alerts only — not for trade-ready review.",
  PARAMETER_SET_REJECTED: "Parameter set was rejected in the registry.",
  PARAMETER_SET_RETIRED: "Parameter set is retired.",
  PARAMETER_SET_SYMBOL_MISMATCH: "Parameter set symbol does not match this zone.",
  PARAMETER_SET_BROKER_SYMBOL_MISMATCH: "Broker symbol does not match the registered parameter set.",
  PARAMETER_SET_ACCOUNT_NOT_ALLOWED: "This account is not allowed to use this parameter set.",
  PARAMETER_SET_ACCOUNT_BLOCKED: "This account is explicitly blocked for this parameter set.",
};

export function tradePlanReason(code: TradePlanReasonCode, overrideSimple?: string): TradePlanReason {
  return {
    code,
    messageSimple: overrideSimple ?? MESSAGES[code],
  };
}

export function tradePlanReasonFromRegistryBlock(block: ParameterSetBlockReason): TradePlanReason {
  return tradePlanReason(block as TradePlanReasonCode);
}

/** When `APPROVED_PARAMETER_SET_REQUIRED` fires, surface registry block codes when present. */
export function tradePlanReasonsForParameterSetHardGate(registryCompatibility?: {
  blockingReasons: ParameterSetBlockReason[];
}): TradePlanReason[] {
  const br = registryCompatibility?.blockingReasons;
  if (br && br.length > 0) {
    return br.map((b) => tradePlanReasonFromRegistryBlock(b));
  }
  return [tradePlanReason("PARAMETER_SET_NOT_APPROVED")];
}
