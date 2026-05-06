import { roundToTickSize } from "./normalize";
import { replayTradeReason } from "./replay-trade-reasons";
import type {
  ReplayPathAssumption,
  ReplayTradeEvent,
  ReplayTradeInput,
  ReplayTradeReasonCode,
  ReplayTradeResult,
  ReplayTradeSettings,
  ReplayTradeStatus,
} from "./replay-trade-types";

interface ResolvedReplay {
  direction: "BUY" | "SELL";
  entryPrice: number;
  entryAreaLow: number | null;
  entryAreaHigh: number | null;
  stopLoss: number;
  takeProfit: number;
}

function baseResult(status: ReplayTradeStatus, code: ReplayTradeReasonCode): ReplayTradeResult {
  return {
    status,
    reason: replayTradeReason(code),
    direction: null,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    entryTimeUtc: null,
    exitTimeUtc: null,
    resultR: 0,
    maeR: 0,
    mfeR: 0,
    metrics: null,
    events: [],
  };
}

function resolveInput(input: ReplayTradeInput): ResolvedReplay | null {
  const plan = input.tradePlan;
  const direction = input.direction ?? plan?.direction;
  if (!direction) return null;

  const entryPrice = input.entryPrice ?? plan?.referenceEntryPrice;
  const stopLoss = input.stopLoss ?? plan?.stopLoss ?? null;
  const takeProfit = input.takeProfit ?? plan?.takeProfit ?? null;
  const entryAreaLow = input.entryAreaLow ?? plan?.entryAreaLow ?? null;
  const entryAreaHigh = input.entryAreaHigh ?? plan?.entryAreaHigh ?? null;

  if (entryPrice == null || stopLoss == null || takeProfit == null) return null;
  return { direction, entryPrice, stopLoss, takeProfit, entryAreaLow, entryAreaHigh };
}

function isEntryTriggered(
  direction: "BUY" | "SELL",
  entryPrice: number,
  entryAreaLow: number | null,
  entryAreaHigh: number | null,
  candle: ReplayTradeInput["candles"][number],
  model: ReplayTradeInput["entryModel"],
): boolean {
  if (model === "zone_touch") {
    if (entryAreaLow == null || entryAreaHigh == null) return false;
    return candle.low <= entryAreaHigh && candle.high >= entryAreaLow;
  }

  if (model === "confirmation_close") {
    return direction === "BUY" ? candle.close >= entryPrice : candle.close <= entryPrice;
  }

  return candle.low <= entryPrice && candle.high >= entryPrice;
}

function expirationHit(params: {
  candleIndex: number;
  candleTime: number;
  expiresAfterBars?: number;
  expiresAtUtc?: number;
}): boolean {
  const byBars =
    params.expiresAfterBars != null &&
    params.expiresAfterBars >= 0 &&
    params.candleIndex >= params.expiresAfterBars;
  const byTime = params.expiresAtUtc != null && params.candleTime >= params.expiresAtUtc;
  return byBars || byTime;
}

function sameCandleOutcome(
  direction: "BUY" | "SELL",
  assumption: ReplayPathAssumption,
): "stop_loss" | "take_profit" | "ambiguous_same_candle" {
  if (assumption === "conservative_sl_first") return "stop_loss";
  if (assumption === "optimistic_tp_first") return "take_profit";
  if (assumption === "ambiguous") return "ambiguous_same_candle";
  if (assumption === "open_high_low_close") return direction === "BUY" ? "take_profit" : "stop_loss";
  return direction === "BUY" ? "stop_loss" : "take_profit";
}

export function simulateReplayTrade(input: ReplayTradeInput): ReplayTradeResult {
  const settings: ReplayTradeSettings = {
    minRr: 0.1,
    missedIfMovesTowardTargetR: 1,
    pathAssumption: "conservative_sl_first",
    resultRForExpired: 0,
    resultRForMissed: 0,
    resultRForNotTriggered: 0,
    ...input.settings,
    expiresAfterBars: input.settings?.expiresAfterBars ?? input.expiresAfterBars,
    expiresAtUtc: input.settings?.expiresAtUtc ?? input.expiresAtUtc,
  };
  const out = baseResult("not_triggered", "OK");
  const events: ReplayTradeEvent[] = [{ type: "simulation_started", status: "not_triggered" }];

  if (!input.symbolProfile) return { ...baseResult("insufficient_data", "MISSING_SYMBOL_PROFILE"), events };
  if (!input.candles) return { ...baseResult("insufficient_data", "MISSING_CANDLES"), events };
  if (input.candles.length === 0) return { ...baseResult("insufficient_data", "INSUFFICIENT_CANDLES"), events };

  const resolved = resolveInput(input);
  if (!resolved) {
    return { ...baseResult("invalidated", "MISSING_ENTRY"), events };
  }
  if (input.entryModel === "zone_touch" && (resolved.entryAreaLow == null || resolved.entryAreaHigh == null)) {
    return { ...baseResult("invalidated", "MISSING_ENTRY_AREA"), events };
  }

  const tick = input.symbolProfile.tickSize;
  const entryPrice = roundToTickSize(resolved.entryPrice, tick, "nearest");
  const stopLoss = roundToTickSize(resolved.stopLoss, tick, "nearest");
  const takeProfit = roundToTickSize(resolved.takeProfit, tick, "nearest");
  const riskDistance = Math.abs(entryPrice - stopLoss);
  if (!(riskDistance > 0)) return { ...baseResult("invalidated", "INVALID_RISK_DISTANCE"), events };

  const rewardDistance =
    resolved.direction === "BUY" ? takeProfit - entryPrice : entryPrice - takeProfit;
  if (!(rewardDistance > 0)) return { ...baseResult("invalidated", "INVALID_TP_DISTANCE"), events };
  const rr = rewardDistance / riskDistance;
  if (rr < (settings.minRr ?? 0)) return { ...baseResult("invalidated", "RR_BELOW_MINIMUM"), events };

  let status: ReplayTradeStatus = "not_triggered";
  let reasonCode: ReplayTradeReasonCode = "OK";
  let entryTimeUtc: number | null = null;
  let exitTimeUtc: number | null = null;
  let barsHeld = 0;
  let maxAdverse = 0;
  let maxFavorable = 0;

  for (let i = 0; i < input.candles.length; i++) {
    const candle = input.candles[i]!;
    if (status === "not_triggered") {
      const exp = expirationHit({
        candleIndex: i,
        candleTime: candle.time,
        expiresAfterBars: settings.expiresAfterBars,
        expiresAtUtc: settings.expiresAtUtc,
      });
      if (exp) {
        status = "expired";
        reasonCode = "EXIT_EXPIRED";
        events.push({
          type: "expired_before_entry",
          atUtc: candle.time,
          candleIndex: i,
          status,
        });
        break;
      }
    }

    let entryHit = false;
    if (status === "not_triggered") {
      entryHit = isEntryTriggered(
        resolved.direction,
        entryPrice,
        resolved.entryAreaLow,
        resolved.entryAreaHigh,
        candle,
        input.entryModel,
      );
      if (entryHit) {
        status = "triggered";
        reasonCode = "ENTRY_TRIGGERED";
        entryTimeUtc = candle.time;
        events.push({
          type: "entry_triggered",
          atUtc: candle.time,
          candleIndex: i,
          status,
        });
      }
    }

    if (status === "not_triggered" && !entryHit) {
      const favorableBeforeEntry =
        resolved.direction === "BUY" ? candle.high - entryPrice : entryPrice - candle.low;
      const favorableRBeforeEntry = favorableBeforeEntry / riskDistance;
      const missedThreshold = settings.missedIfMovesTowardTargetR;
      if (missedThreshold != null && favorableRBeforeEntry >= missedThreshold) {
        status = "missed";
        reasonCode = "MISSED_BEFORE_ENTRY";
        events.push({
          type: "missed_before_entry",
          atUtc: candle.time,
          candleIndex: i,
          status,
        });
        break;
      }
      continue;
    }

    if (status === "triggered") {
      barsHeld += 1;
      const adverseNow =
        resolved.direction === "BUY" ? Math.max(0, entryPrice - candle.low) : Math.max(0, candle.high - entryPrice);
      const favorableNow =
        resolved.direction === "BUY" ? Math.max(0, candle.high - entryPrice) : Math.max(0, entryPrice - candle.low);
      maxAdverse = Math.max(maxAdverse, adverseNow / riskDistance);
      maxFavorable = Math.max(maxFavorable, favorableNow / riskDistance);

      const slHit = resolved.direction === "BUY" ? candle.low <= stopLoss : candle.high >= stopLoss;
      const tpHit = resolved.direction === "BUY" ? candle.high >= takeProfit : candle.low <= takeProfit;
      if (!slHit && !tpHit) continue;

      if (slHit && tpHit) {
        const outcome = sameCandleOutcome(resolved.direction, settings.pathAssumption ?? "conservative_sl_first");
        status = outcome;
        reasonCode = outcome === "take_profit" ? "EXIT_TAKE_PROFIT" : outcome === "stop_loss" ? "EXIT_STOP_LOSS" : "AMBIGUOUS_SAME_CANDLE";
        events.push({
          type: outcome === "ambiguous_same_candle" ? "ambiguous_same_candle" : outcome === "take_profit" ? "take_profit_hit" : "stop_loss_hit",
          atUtc: candle.time,
          candleIndex: i,
          status,
        });
      } else if (tpHit) {
        status = "take_profit";
        reasonCode = "EXIT_TAKE_PROFIT";
        events.push({ type: "take_profit_hit", atUtc: candle.time, candleIndex: i, status });
      } else {
        status = "stop_loss";
        reasonCode = "EXIT_STOP_LOSS";
        events.push({ type: "stop_loss_hit", atUtc: candle.time, candleIndex: i, status });
      }
      exitTimeUtc = candle.time;
      break;
    }
  }

  let resultR = settings.resultRForNotTriggered ?? 0;
  if (status === "take_profit") resultR = rr;
  if (status === "stop_loss") resultR = -1;
  if (status === "expired") resultR = settings.resultRForExpired ?? 0;
  if (status === "missed") resultR = settings.resultRForMissed ?? 0;
  if (status === "ambiguous_same_candle") resultR = 0;

  events.push({ type: "simulation_finished", status, atUtc: exitTimeUtc ?? input.currentTimeUtc });
  const metrics = {
    riskDistance,
    rewardDistance,
    rr,
    maxAdverseExcursionR: maxAdverse,
    maxFavorableExcursionR: maxFavorable,
    barsHeld,
  };

  return {
    ...out,
    status,
    reason: replayTradeReason(reasonCode),
    direction: resolved.direction,
    entryPrice,
    stopLoss,
    takeProfit,
    entryTimeUtc,
    exitTimeUtc,
    resultR,
    maeR: maxAdverse,
    mfeR: maxFavorable,
    metrics,
    events,
  };
}
