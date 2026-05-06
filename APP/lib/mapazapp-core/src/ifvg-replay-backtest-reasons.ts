import type { IfvgReplayBacktestReason, IfvgReplayBacktestReasonCode } from "./ifvg-replay-backtest-types";

const MESSAGES: Record<IfvgReplayBacktestReasonCode, string> = {
  OK: "OK.",
  INSUFFICIENT_CANDLES: "Not enough candles for ATR/detection/replay.",
  MISSING_SYMBOL_PROFILE: "symbolProfile is required.",
  MISSING_STRATEGY_SETTINGS: "strategySettings is required.",
  DETECTION_FAILED: "IFVG detection did not complete normally.",
  CANDIDATE_INDEX_UNAVAILABLE: "Could not infer FVG center bar index from sourceIfvgId; replay slice may be lookahead-prone (V2-04 first pass).",
  NO_RETEST_CONFIRM_PATH: "No retest+confirmation path found forward from candidate bar.",
  PIPELINE_INTERNAL: "Internal pipeline error.",
  DETECTION_ASSUMPTION: "Detection / pipeline assumption note.",
};

export function ifvgReplayBacktestReason(
  code: IfvgReplayBacktestReasonCode,
  detail?: string,
): IfvgReplayBacktestReason {
  const base = MESSAGES[code];
  return { code, message: detail ? `${base} ${detail}`.trim() : base };
}
