/**
 * Minimal risk / gate primitives aligned with blueprint hard requirements (subset).
 * Full Risk Guard logic lives in product specs + future backend.
 */

export type NoTradeReasonCode =
  | "MISSING_SYMBOL_PROFILE"
  | "MISSING_APPROVED_PARAMETER_SET"
  | "TRADING_NOT_ALLOWED"
  | "OPERATIONAL_STATUS_BLOCKS_TRADE"
  | "PROP_OR_SPREAD_NEWS_BLOCK"
  | "UNKNOWN";

export interface HardGateSnapshot {
  hasSymbolProfile: boolean;
  hasApprovedParameterSet: boolean;
  tradingAllowed: boolean;
  /** When true, operational status allows considering a trade (caller maps mock enums). */
  operationalAllowsTrade: boolean;
  /** When false, spread/news/drawdown mock flags block (caller-supplied). */
  liquidityAndSessionOk: boolean;
}

export interface HardGateResult {
  ok: boolean;
  reasons: NoTradeReasonCode[];
}

/**
 * Evaluates a conservative AND of documented hard gates (H7/H8-style + trading flags).
 * Extend in future checkpoints; do not infer new rules here.
 */
export function evaluateTradeHardGates(s: HardGateSnapshot): HardGateResult {
  const reasons: NoTradeReasonCode[] = [];
  if (!s.hasSymbolProfile) reasons.push("MISSING_SYMBOL_PROFILE");
  if (!s.hasApprovedParameterSet) reasons.push("MISSING_APPROVED_PARAMETER_SET");
  if (!s.tradingAllowed) reasons.push("TRADING_NOT_ALLOWED");
  if (!s.operationalAllowsTrade) reasons.push("OPERATIONAL_STATUS_BLOCKS_TRADE");
  if (!s.liquidityAndSessionOk) reasons.push("PROP_OR_SPREAD_NEWS_BLOCK");
  return { ok: reasons.length === 0, reasons };
}
