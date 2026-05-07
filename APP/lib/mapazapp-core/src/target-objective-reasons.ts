import type { TargetObjectiveReason, TargetObjectiveReasonCode } from "./target-objective-types";

const MESSAGES: Record<TargetObjectiveReasonCode, string> = {
  OK: "Target objective evaluation OK.",
  MISSING_DIRECTION: "Direction is required.",
  MISSING_ENTRY_PRICE: "Entry price is required.",
  MISSING_STOP_LOSS: "Stop loss price is required.",
  MISSING_SYMBOL_PROFILE: "Symbol profile is required for tick buffers.",
  RISK_DISTANCE_NON_POSITIVE: "Risk distance (entry–stop) must be positive.",
  INVALID_PRICE_GEOMETRY: "Entry, stop, and candidate target do not form coherent geometry.",
  TARGET_WRONG_SIDE_OF_ENTRY: "Target is on the wrong side of entry for the trade direction.",
  REWARD_SHORTER_THAN_RISK: "Target implies reward shorter than risk (TP inside min R:R vs SL).",
  RR_BELOW_MINIMUM: "Reward:risk is below configured minRr.",
  NO_VALID_CANDIDATE: "No candidate satisfied geometry, R:R, and distance rules.",
  INSUFFICIENT_SWING_DATA: "Not enough candles to derive swing-based objective.",
  EXPLICIT_TARGET_MISSING: "Explicit mode requires explicitTargetPrice.",
  CONTEXT_MISALIGNED_SOFT: "HTF context weakly misaligned with objective direction (soft note).",
};

export function targetObjectiveReason(
  code: TargetObjectiveReasonCode,
  detail?: string,
): TargetObjectiveReason {
  const base = MESSAGES[code];
  return { code, message: detail ? `${base} ${detail}`.trim() : base };
}
