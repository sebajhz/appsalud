import type { DecisionReasonCode } from "./decision-model-types";

const MESSAGES: Record<DecisionReasonCode, string> = {
  OK: "OK.",
  SYMBOL_PROFILE_MISSING: "No symbol profile — cannot normalize prices or tolerances.",
  ZONE_MISSING: "No zone candidate — nothing to score.",
  ENTRY_SL_TP_MISSING: "No Entry/SL/TP plan result.",
  ENTRY_SL_TP_INSUFFICIENT: "Entry/SL/TP plan has insufficient data.",
  ENTRY_SL_TP_INVALID: "Entry/SL/TP plan is invalid or blocked for review.",
  RR_BELOW_MINIMUM: "Reward-to-risk is below the configured minimum.",
  SL_TP_GEOMETRY_INVALID: "Stop or take-profit geometry is invalid.",
  TIMING_LOOKAHEAD_UNSAFE: "Candidate timing metadata missing while strict anti-lookahead mode is on.",
  ACCOUNT_GUARD_BLOCKS: "Account or risk guard blocks this decision path.",
  REGISTRY_BLOCKS_TRADE_REVIEW: "Parameter set registry does not allow trade review for this context.",
  ZONE_INVALIDATED: "Zone is structurally invalidated.",
  ZONE_EXPIRED: "Zone has expired.",
  ZONE_USED: "Zone is already marked used.",
  TARGET_ALREADY_PASSED_BLOCKED: "Price has already passed the target — trade treated as blocked.",
  TARGET_TOO_CLOSE_BLOCKED: "Target is too close to current price — blocked.",
  ENTRY_CHASE_BLOCKED: "Entry chase tolerance exceeded — blocked.",
  CONTEXT_PLACEHOLDER_NEUTRAL: "HTF/context score uses neutral placeholder until context engine exists.",
  CONTEXT_INPUT_MISSING: "No explicit context score provided — using placeholder.",
  COMPONENT_INSUFFICIENT_INPUT: "Not enough data to score this component; neutral penalty applied.",
  TOLERANCE_CALIBRATION_INVALID: "Tolerance calibration marks a critical dimension as invalid for this policy.",
  TOLERANCE_CALIBRATION_ADJUSTED: "Soft score component blended with V2-06 tolerance calibration output.",
  CONTEXT_BIAS_HARD_BLOCK: "HTF context / bias policy blocks this path (strict mode).",
  CONTEXT_BIAS_ADJUSTED: "Context quality adjusted from V2-07 HTF bias vs zone direction.",
};

export function decisionModelReason(code: DecisionReasonCode): { code: DecisionReasonCode; message: string } {
  return { code, message: MESSAGES[code] ?? code };
}
