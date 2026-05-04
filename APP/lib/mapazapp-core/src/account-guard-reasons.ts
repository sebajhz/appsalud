import type { AccountGuardReason, AccountGuardReasonCode, AccountGuardReasonTier } from "./account-guard-types";

const MESSAGES: Record<
  AccountGuardReasonCode,
  { simple: string; technical: string; defaultTier: AccountGuardReasonTier }
> = {
  ACCOUNT_OK: {
    simple: "Account guard passed for trade review eligibility.",
    technical: "No blocking account guard reasons.",
    defaultTier: "warning",
  },
  ACCOUNT_WATCH_ONLY: {
    simple: "Account is in watch-only mode — trade review is disabled.",
    technical: "Operational WATCH_ONLY without allowWatchOnlyReview.",
    defaultTier: "blocking",
  },
  DAILY_DRAWDOWN_BLOCKED: {
    simple: "Daily drawdown guard blocks trade review.",
    technical: "Daily drawdown limit reached or breached.",
    defaultTier: "blocking",
  },
  MAX_DRAWDOWN_BLOCKED: {
    simple: "Maximum drawdown guard blocks trade review.",
    technical: "Max drawdown limit reached or breached.",
    defaultTier: "blocking",
  },
  MAX_TRADES_REACHED: {
    simple: "Maximum trades per day reached — trade review blocked.",
    technical: "maxTradesPerDay exhausted.",
    defaultTier: "blocking",
  },
  NEWS_BLACKOUT_ACTIVE: {
    simple: "News blackout blocks trade review.",
    technical: "NEWS blackout operational flag active.",
    defaultTier: "blocking",
  },
  PROP_FIRM_RULE_BLOCKED: {
    simple: "Prop firm rule snapshot blocks trade review.",
    technical: "propFirmBlocked true.",
    defaultTier: "blocking",
  },
  PSYCHOLOGICAL_LOCK_ACTIVE: {
    simple: "Psychological lock / checklist blocks trade review.",
    technical: "Psychological lock active.",
    defaultTier: "blocking",
  },
  BRIDGE_DISCONNECTED: {
    simple: "Bridge disconnected — trade review blocked by policy.",
    technical: "requireBridgeForReview and bridgeConnected false.",
    defaultTier: "blocking",
  },
  BRIDGE_DISCONNECTED_WARNING: {
    simple: "Bridge appears disconnected — verify connectivity (review-only policy allows continuation).",
    technical: "bridgeConnected false while requireBridgeForReview false.",
    defaultTier: "warning",
  },
  PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT: {
    simple: "No approved parameter set for this symbol and account.",
    technical: "approvedParameterSetForAccount false while required.",
    defaultTier: "blocking",
  },
  ACCOUNT_STATUS_BLOCKED: {
    simple: "Account operational status blocks trade review.",
    technical: "tradingAllowed false or blocking operational status.",
    defaultTier: "blocking",
  },
  MISSING_ACCOUNT_ID: {
    simple: "Account id is missing — cannot evaluate guard.",
    technical: "accountId empty.",
    defaultTier: "blocking",
  },
  MISSING_RISK_SNAPSHOT: {
    simple: "Risk snapshot incomplete or invalid.",
    technical: "Required numeric risk fields missing or non-finite.",
    defaultTier: "blocking",
  },
  MISSING_PROP_RULE_SNAPSHOT: {
    simple: "Prop firm snapshot required but not supplied.",
    technical: "requirePropFirmSnapshot true without prop snapshot.",
    defaultTier: "blocking",
  },
  RISK_REMAINING_LOW_WARNING: {
    simple: "Open risk is high relative to remaining daily loss room.",
    technical: "openRiskAmount vs dailyLossRemainingAmount threshold.",
    defaultTier: "warning",
  },
  DAILY_DRAWDOWN_NEAR_LIMIT_WARNING: {
    simple: "Daily drawdown is close to its limit.",
    technical: "dailyLossUsedPercent >= dailyDrawdownWarningPercent.",
    defaultTier: "warning",
  },
  MAX_DRAWDOWN_NEAR_LIMIT_WARNING: {
    simple: "Maximum drawdown usage is close to its limit.",
    technical: "maxLossUsedPercent >= maxDrawdownWarningPercent.",
    defaultTier: "warning",
  },
  TRADES_REMAINING_LOW_WARNING: {
    simple: "Only one trade slot remains today.",
    technical: "tradesRemainingToday === 1.",
    defaultTier: "warning",
  },
};

export function accountGuardReason(
  code: AccountGuardReasonCode,
  tier?: AccountGuardReasonTier,
  overrides?: { messageSimple?: string; messageTechnical?: string },
): AccountGuardReason {
  const base = MESSAGES[code];
  const t = tier ?? base.defaultTier;
  return {
    code,
    tier: t,
    messageSimple: overrides?.messageSimple ?? base.simple,
    messageTechnical: overrides?.messageTechnical ?? base.technical,
  };
}
