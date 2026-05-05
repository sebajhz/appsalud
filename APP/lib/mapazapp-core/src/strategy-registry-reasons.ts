import type { ParameterSetBlockReason, ParameterSetWarningReason } from "./strategy-registry-types";

const BLOCK_LABELS: Record<ParameterSetBlockReason, string> = {
  STRATEGY_NOT_FOUND: "Strategy is not registered.",
  STRATEGY_NOT_ACTIVE: "Strategy is not active for new reviews.",
  PARAMETER_SET_NOT_FOUND: "Parameter set is not registered.",
  PARAMETER_SET_DRAFT: "Parameter set is still in draft — not cleared for trade review.",
  PARAMETER_SET_NOT_VALIDATED: "Parameter set is not validated for trade review.",
  PARAMETER_SET_ALERTS_ONLY: "Parameter set is approved for alerts only — not for trade-ready review.",
  PARAMETER_SET_REJECTED: "Parameter set was rejected.",
  PARAMETER_SET_RETIRED: "Parameter set is retired.",
  PARAMETER_SET_SYMBOL_MISMATCH: "Parameter set symbol does not match this zone.",
  PARAMETER_SET_BROKER_SYMBOL_MISMATCH: "Broker symbol does not match the registered parameter set.",
  PARAMETER_SET_ACCOUNT_NOT_ALLOWED: "This account is not on the allowed list for this parameter set.",
  PARAMETER_SET_ACCOUNT_BLOCKED: "This account is explicitly blocked for this parameter set.",
};

const WARN_LABELS: Record<ParameterSetWarningReason, string> = {
  PARAMETER_SET_BROKER_SYMBOL_UNSPECIFIED:
    "Registry lists a broker symbol for this set but none was supplied for comparison — verify mapping.",
  PARAMETER_SET_DEMO_APPROVAL_ONLY: "Parameter set is only demo-approved — not for live trade review.",
  PARAMETER_SET_APPROVED_FOR_TRADE_REVIEW: "Parameter set is approved for trade review for this symbol and account.",
};

export function parameterSetBlockMessage(code: ParameterSetBlockReason): string {
  return BLOCK_LABELS[code] ?? code;
}

export function parameterSetWarningMessage(code: ParameterSetWarningReason): string {
  return WARN_LABELS[code] ?? code;
}
