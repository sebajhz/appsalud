import type { Candle } from "./candle";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradeReviewPlan } from "./trade-plan-types";

export type ReplayTradeStatus =
  | "not_triggered"
  | "triggered"
  | "take_profit"
  | "stop_loss"
  | "expired"
  | "missed"
  | "invalidated"
  | "ambiguous_same_candle"
  | "insufficient_data";

export type ReplayEntryModel =
  | "zone_touch"
  | "midpoint_touch"
  | "confirmation_close"
  | "manual_reference_price";

export type ReplayExitModel = "fixed_r" | "explicit_tp_sl";

export type ReplayPathAssumption =
  | "conservative_sl_first"
  | "optimistic_tp_first"
  | "open_high_low_close"
  | "open_low_high_close"
  | "ambiguous";

export type ReplayTradeReasonCode =
  | "OK"
  | "MISSING_DIRECTION"
  | "MISSING_ENTRY"
  | "MISSING_ENTRY_AREA"
  | "MISSING_STOP_LOSS"
  | "MISSING_TAKE_PROFIT"
  | "MISSING_SYMBOL_PROFILE"
  | "MISSING_CANDLES"
  | "INSUFFICIENT_CANDLES"
  | "INVALID_RISK_DISTANCE"
  | "INVALID_TP_DISTANCE"
  | "RR_BELOW_MINIMUM"
  | "ENTRY_TRIGGERED"
  | "EXIT_TAKE_PROFIT"
  | "EXIT_STOP_LOSS"
  | "EXIT_EXPIRED"
  | "MISSED_BEFORE_ENTRY"
  | "AMBIGUOUS_SAME_CANDLE";

export interface ReplayTradeReason {
  code: ReplayTradeReasonCode;
  message: string;
}

export interface ReplayTradeSettings {
  minRr?: number;
  missedIfMovesTowardTargetR?: number;
  pathAssumption?: ReplayPathAssumption;
  expiresAfterBars?: number;
  expiresAtUtc?: number;
  resultRForExpired?: number;
  resultRForMissed?: number;
  resultRForNotTriggered?: number;
}

export interface ReplayTradeEvent {
  type:
    | "simulation_started"
    | "entry_triggered"
    | "missed_before_entry"
    | "expired_before_entry"
    | "take_profit_hit"
    | "stop_loss_hit"
    | "ambiguous_same_candle"
    | "simulation_finished";
  atUtc?: number;
  candleIndex?: number;
  status: ReplayTradeStatus;
  detail?: string;
}

export interface ReplayTradeMetrics {
  riskDistance: number;
  rewardDistance: number;
  rr: number;
  maxAdverseExcursionR: number;
  maxFavorableExcursionR: number;
  barsHeld: number;
}

export interface ReplayTradeInput {
  tradePlan?: TradeReviewPlan;
  direction?: "BUY" | "SELL";
  entryPrice?: number;
  entryAreaLow?: number;
  entryAreaHigh?: number;
  stopLoss?: number;
  takeProfit?: number;
  candles: Candle[];
  symbolProfile: SymbolMarketSpec | null;
  entryModel: ReplayEntryModel;
  exitModel: ReplayExitModel;
  settings?: ReplayTradeSettings;
  planCreatedAtUtc?: number;
  expiresAfterBars?: number;
  expiresAtUtc?: number;
  currentTimeUtc?: number;
}

export interface ReplayTradeResult {
  status: ReplayTradeStatus;
  reason: ReplayTradeReason;
  direction: "BUY" | "SELL" | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryTimeUtc: number | null;
  exitTimeUtc: number | null;
  resultR: number;
  maeR: number;
  mfeR: number;
  metrics: ReplayTradeMetrics | null;
  events: ReplayTradeEvent[];
}
