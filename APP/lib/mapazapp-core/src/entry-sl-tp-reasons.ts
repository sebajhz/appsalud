import type { EntrySlTpReason, EntrySlTpReasonCode } from "./entry-sl-tp-types";

const MESSAGES: Record<EntrySlTpReasonCode, string> = {
  OK: "Plan OK.",
  MISSING_SYMBOL_PROFILE: "Symbol profile is required for tick-normalized prices.",
  MISSING_ZONE_OR_PLAN: "Provide zoneCandidate and/or tradeReviewPlan with entry bounds.",
  MISSING_DIRECTION: "Trade direction could not be resolved.",
  MISSING_ATR_CONTEXT: "ATR is required for this SL/TP mode or buffer; supply atr or recentCandles.",
  MISSING_CONFIRMATION_CLOSE: "confirmation_close mode needs confirmationClose.",
  MISSING_EXPLICIT_ENTRY: "manual_reference mode needs explicitEntry.",
  MISSING_EXPLICIT_SL: "explicit SL mode needs explicitSl.",
  MISSING_EXPLICIT_TP: "explicit TP mode needs explicitTp.",
  MISSING_SWEEP_BOUNDS: "beyond_sweep SL needs sweepLow/sweepHigh (side-appropriate).",
  MISSING_STRUCTURE_BOUNDS: "beyond_structure SL or previous_high_low TP needs structure levels.",
  MISSING_OPPOSING_LIQUIDITY: "opposing_liquidity / hybrid needs opposingLiquidityPrice.",
  INVALID_PRICE_GEOMETRY: "Entry, SL, and TP do not form a coherent long/short.",
  RISK_DISTANCE_NON_POSITIVE: "Risk distance must be positive.",
  REWARD_DISTANCE_NON_POSITIVE: "Reward distance must be positive.",
  RR_BELOW_MINIMUM: "Reward:risk is below minRr.",
  REWARD_SHORTER_THAN_RISK: "Reward distance is shorter than risk (TP too close vs SL).",
  TARGET_TOO_CLOSE_TO_PRICE: "Target is too close to current price to be meaningful (v1).",
  TRADE_ALREADY_PAST_TARGET: "Price already at or beyond TP vs direction (v1).",
  ENTRY_CHASE_EXCEEDED: "Price moved too far beyond planned entry before retest (v1 chase rule).",
  HYBRID_NO_VALID_TARGET: "Hybrid TP could not satisfy min R and meaningful distance.",
  ENTRY_VARIANT_REPLAY_MODEL_MISMATCH: "Entry variant suggests a different replay entry model than configured entryMode.",
  ENTRY_VARIANT_LATE_TIMING_NOTE: "Entry variant timing suggests late chase vs planned entry (review-only note).",
  TARGET_OBJECTIVE_WEAK_QUALITY: "Target / liquidity objective classified as weak (V2-09 review note).",
  TARGET_OBJECTIVE_TOO_CLOSE_NOTE: "Target objective too close to current price (V2-09).",
  TARGET_OBJECTIVE_ALREADY_REACHED_NOTE: "Target objective appears already reached vs current (V2-09).",
  TARGET_OBJECTIVE_TOO_FAR_NOTE: "Target objective flagged as distant vs ATR (V2-09).",
};

export function entrySlTpReason(code: EntrySlTpReasonCode, detail?: string): EntrySlTpReason {
  const base = MESSAGES[code];
  return { code, message: detail ? `${base} ${detail}`.trim() : base };
}
