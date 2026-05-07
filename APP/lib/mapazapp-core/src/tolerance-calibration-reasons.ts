import type { ToleranceReasonCode } from "./tolerance-calibration-types";

const MESSAGES: Record<ToleranceReasonCode, string> = {
  OK: "Within calibrated tolerance.",
  MEASUREMENT_OMITTED: "No measurement supplied for this dimension — neutral band only.",
  WITHIN_DYNAMIC_BAND: "Distance inside dynamic max(ATR, spread, tick) band.",
  NEAR_EDGE_OF_BAND: "Near outer edge of tolerance band.",
  EXCEEDS_BAND_SOFT: "Exceeds band — soft degradation of quality.",
  EXCEEDS_BAND_HARD: "Far outside band — invalid or break-risk posture.",
  BREAK_RISK_DEPTH: "Sweep depth consistent with structural break risk.",
  ENTRY_CHASE_TOO_LATE: "Price has chased too far toward TP in R units.",
  SPREAD_EXPENSIVE_VS_ATR: "Spread large relative to ATR — execution cost stress.",
  ZONE_TOUCH_COMPENSATION: "Imperfect retest geometry compensated by zone touch context.",
  INSUFFICIENT_ATR: "ATR missing or non-positive — cannot normalize.",
  INSUFFICIENT_SYMBOL_SPEC: "Symbol profile missing tick/spread — cannot calibrate.",
};

export function toleranceCalibrationReason(code: ToleranceReasonCode): {
  code: ToleranceReasonCode;
  message: string;
} {
  return { code, message: MESSAGES[code] ?? code };
}
