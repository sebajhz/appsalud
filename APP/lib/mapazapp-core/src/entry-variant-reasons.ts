import type { EntryVariantReason, EntryVariantReasonCode } from "./entry-variant-types";

const MESSAGES: Record<EntryVariantReasonCode, string> = {
  OK: "Entry variant evaluation complete.",
  INSUFFICIENT_ZONE_INPUT: "Zone bounds or zone candidate required to classify entry style.",
  NO_TOUCH_REFERENCE: "No retest touch or current price — depth uses midpoint heuristic only.",
  RETEST_MISSING_FOR_IDEAL: "Ideal entry path expects a detected retest.",
  CONFIRMATION_MISSING_OR_WEAK: "Confirmation missing or below clear threshold.",
  DEPTH_PARTIAL_RETEST: "Price touched only a shallow portion of the zone (partial retest).",
  DEPTH_DEEP_RETEST: "Price penetrated deeply into the zone vs midpoint (deep retest).",
  TIMING_LATE_CHASE: "Current price suggests chasing beyond planned entry tolerance.",
  TIMING_MISSED_MOVE: "Price moved toward target before a workable entry (missed).",
  TIMING_EXPIRED: "Setup treated as expired for this evaluation.",
  GEOMETRY_INVALIDATED: "Invalidation level crossed — entry geometry invalid.",
  GEOMETRY_WRONG_SIDE: "Reference price on the wrong side of the zone for direction.",
  HIGH_SPREAD_IMPERFECT_ACCEPTED: "Elevated spread — imperfect entry still within acceptance policy.",
  TOLERANCE_SUPPORTS_ACCEPTED: "Tolerance matrix supports accepting imperfect depth.",
};

export function entryVariantReason(code: EntryVariantReasonCode, detail?: string): EntryVariantReason {
  const base = MESSAGES[code];
  return { code, message: detail ? `${base} ${detail}`.trim() : base };
}
