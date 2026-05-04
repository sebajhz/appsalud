/**
 * SL / TP / entry band for **review** (blueprint §14). `liquidity_target` / `hybrid` are not computed here.
 */

import { roundToTickSize, slBufferPrice } from "./normalize";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanEvaluationSettings, TradePlanReferenceEntryMode } from "./trade-plan-settings";
import type { ZoneCandidate } from "./zone-candidate";

export interface TradePlanPriceModelInput {
  zone: ZoneCandidate;
  symbolProfile: SymbolMarketSpec;
  confirmationAtr: number;
  spreadPrice: number;
  settings: TradePlanEvaluationSettings;
  sweepLow?: number;
  sweepHigh?: number;
  confirmationClose?: number | null;
}

export interface TradePlanPriceModel {
  slBufferPrice: number;
  stopLoss: number;
  takeProfit: number;
  referenceEntryPrice: number;
  entryAreaLow: number;
  entryAreaHigh: number;
}

/**
 * BUY: `sl = min(zoneLow, sweepLow ?? zoneLow) - slBuffer` (if no sweep, sweep leg equals zoneLow — same min).
 * SELL: symmetric with max(zoneHigh, sweepHigh ?? zoneHigh).
 */
export function computeTradePlanPrices(input: TradePlanPriceModelInput): TradePlanPriceModel {
  const { zone, symbolProfile, settings } = input;
  const tick = symbolProfile.tickSize;
  const buf = slBufferPrice({
    atr: input.confirmationAtr,
    slAtrFactor: settings.slAtrFactor,
    spreadPrice: input.spreadPrice,
    slSpreadFactor: settings.slSpreadFactor,
    tickSize: tick,
    minSlTicks: settings.minSlTicks,
  });

  const entryAreaLow = zone.zoneLow;
  const entryAreaHigh = zone.zoneHigh;

  let slRaw: number;
  let referenceEntryPrice: number;

  if (zone.direction === "BUY") {
    const structural = Math.min(zone.zoneLow, input.sweepLow ?? zone.zoneLow);
    slRaw = structural - buf;
    referenceEntryPrice = resolveReferenceEntry(
      settings.referenceEntryMode,
      input.confirmationClose,
      zone.midpoint,
    );
    const sl = roundToTickSize(slRaw, tick, "down");
    const risk = referenceEntryPrice - sl;
    const tpRaw = referenceEntryPrice + risk * settings.rrTarget;
    const tp = roundToTickSize(tpRaw, tick, "nearest");
    return {
      slBufferPrice: buf,
      stopLoss: sl,
      takeProfit: tp,
      referenceEntryPrice: roundToTickSize(referenceEntryPrice, tick, "nearest"),
      entryAreaLow,
      entryAreaHigh,
    };
  }

  const structural = Math.max(zone.zoneHigh, input.sweepHigh ?? zone.zoneHigh);
  slRaw = structural + buf;
  referenceEntryPrice = resolveReferenceEntry(
    settings.referenceEntryMode,
    input.confirmationClose,
    zone.midpoint,
  );
  const sl = roundToTickSize(slRaw, tick, "up");
  const risk = sl - referenceEntryPrice;
  const tpRaw = referenceEntryPrice - risk * settings.rrTarget;
  const tp = roundToTickSize(tpRaw, tick, "nearest");
  return {
    slBufferPrice: buf,
    stopLoss: sl,
    takeProfit: tp,
    referenceEntryPrice: roundToTickSize(referenceEntryPrice, tick, "nearest"),
    entryAreaLow,
    entryAreaHigh,
  };
}

function resolveReferenceEntry(
  mode: TradePlanReferenceEntryMode,
  confirmationClose: number | null | undefined,
  midpoint: number,
): number {
  if (mode === "CONFIRMATION_CLOSE" && confirmationClose != null && Number.isFinite(confirmationClose)) {
    return confirmationClose;
  }
  return midpoint;
}

export interface TradePlanMetricsInput {
  symbolProfile: SymbolMarketSpec;
  direction: ZoneCandidate["direction"];
  referenceEntryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export interface TradePlanMetricsResult {
  riskPrice: number;
  rewardPrice: number;
  rr: number;
  slDistancePrice: number;
  slDistancePoints: number;
  slDistanceTicks: number;
}

export function computeTradePlanRiskMetrics(input: TradePlanMetricsInput): TradePlanMetricsResult {
  const { symbolProfile, direction, referenceEntryPrice, stopLoss, takeProfit } = input;
  const slDist =
    direction === "BUY" ? referenceEntryPrice - stopLoss : stopLoss - referenceEntryPrice;
  const reward =
    direction === "BUY" ? takeProfit - referenceEntryPrice : referenceEntryPrice - takeProfit;
  const riskPrice = Math.max(0, slDist);
  const rewardPrice = Math.max(0, reward);
  const rr = riskPrice > 0 ? rewardPrice / riskPrice : 0;
  const point = symbolProfile.point > 0 ? symbolProfile.point : symbolProfile.tickSize;
  return {
    riskPrice,
    rewardPrice,
    rr,
    slDistancePrice: riskPrice,
    slDistancePoints: riskPrice / point,
    slDistanceTicks: riskPrice / symbolProfile.tickSize,
  };
}
