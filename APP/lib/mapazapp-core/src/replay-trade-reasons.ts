import type { ReplayTradeReason, ReplayTradeReasonCode } from "./replay-trade-types";

const REPLAY_REASON_MESSAGES: Record<ReplayTradeReasonCode, string> = {
  OK: "Replay simulation completed.",
  MISSING_DIRECTION: "Replay input is missing trade direction.",
  MISSING_ENTRY: "Replay input is missing reference entry price.",
  MISSING_ENTRY_AREA: "Replay input is missing entry area for zone_touch model.",
  MISSING_STOP_LOSS: "Replay input is missing stop loss.",
  MISSING_TAKE_PROFIT: "Replay input is missing take profit.",
  MISSING_SYMBOL_PROFILE: "Replay input is missing symbol profile.",
  MISSING_CANDLES: "Replay input is missing candles.",
  INSUFFICIENT_CANDLES: "Replay input has insufficient candle data.",
  INVALID_RISK_DISTANCE: "Invalid risk distance between entry and stop loss.",
  INVALID_TP_DISTANCE: "Take profit is invalid for the trade direction.",
  RR_BELOW_MINIMUM: "R:R is below minimum replay threshold.",
  ENTRY_TRIGGERED: "Entry was triggered during candle replay.",
  EXIT_TAKE_PROFIT: "Take profit was reached during replay.",
  EXIT_STOP_LOSS: "Stop loss was reached during replay.",
  EXIT_EXPIRED: "Trade expired before entry trigger.",
  MISSED_BEFORE_ENTRY: "Trade was marked missed before entry trigger.",
  AMBIGUOUS_SAME_CANDLE: "SL and TP were both touched in the same candle.",
};

export function replayTradeReason(code: ReplayTradeReasonCode): ReplayTradeReason {
  return {
    code,
    message: REPLAY_REASON_MESSAGES[code],
  };
}
