/**
 * V2-03 — Entry / SL / TP plan builder for replay and review (pure core, no execution).
 */

import { calculateATR } from "./atr";
import { entrySlTpReason } from "./entry-sl-tp-reasons";
import type {
  EntryModelMode,
  EntrySlTpModelInput,
  EntrySlTpModelResult,
  EntrySlTpPricePlan,
  EntrySlTpReason,
  EntrySlTpReasonCode,
  EntrySlTpRiskReward,
  EntrySlTpSettings,
  EntrySlTpTargetQuality,
  StopLossModelMode,
  TakeProfitModelMode,
} from "./entry-sl-tp-types";
import { roundToTickSize, slBufferPrice } from "./normalize";
import type { ReplayEntryModel, ReplayTradeInput } from "./replay-trade-types";
import type { SymbolMarketSpec } from "./symbol-profile";

export function createDefaultEntrySlTpSettingsForTests(): EntrySlTpSettings {
  return {
    minRr: 2,
    minMeaningfulRewardR: 0.25,
    maxEntryChaseR: 0.75,
    atrBufferMultiplier: 0.35,
    spreadMultiplier: 1.25,
    minTicks: 3,
    atrPeriod: 5,
    fallbackAtrPrice: 0.5,
    entryMode: "zone_midpoint",
    slMode: "beyond_zone",
    tpMode: "fixed_r",
    zoneEdgePreference: "low",
    fixedRTarget: 2,
    preferObserveOverBlock: false,
    lateTradePolicy: "blocked",
  };
}

interface ResolvedZone {
  zoneLow: number;
  zoneHigh: number;
  midpoint: number;
  direction: "BUY" | "SELL";
}

function resolveZoneAndDirection(
  input: EntrySlTpModelInput,
): { zone: ResolvedZone; direction: "BUY" | "SELL" } | null {
  const z = input.zoneCandidate;
  const p = input.tradeReviewPlan;
  const dir = input.direction ?? z?.direction ?? p?.direction;
  if (!dir) return null;

  if (z) {
    return {
      zone: { zoneLow: z.zoneLow, zoneHigh: z.zoneHigh, midpoint: z.midpoint, direction: z.direction },
      direction: dir,
    };
  }
  if (p && Number.isFinite(p.entryAreaLow) && Number.isFinite(p.entryAreaHigh)) {
    const mid = (p.entryAreaLow + p.entryAreaHigh) / 2;
    return {
      zone: { zoneLow: p.entryAreaLow, zoneHigh: p.entryAreaHigh, midpoint: mid, direction: p.direction },
      direction: dir,
    };
  }
  return null;
}

function resolveAtr(input: EntrySlTpModelInput, settings: EntrySlTpSettings): number {
  if (input.atr != null && Number.isFinite(input.atr) && input.atr > 0) return input.atr;
  const candles = input.recentCandles;
  if (candles && candles.length > settings.atrPeriod + 1) {
    const a = calculateATR(candles, settings.atrPeriod);
    if (a != null && a > 0) return a;
  }
  return settings.fallbackAtrPrice;
}

function dynamicBuffer(atr: number, profile: SymbolMarketSpec, settings: EntrySlTpSettings): number {
  return slBufferPrice({
    atr,
    slAtrFactor: settings.atrBufferMultiplier,
    spreadPrice: profile.spreadPrice,
    slSpreadFactor: settings.spreadMultiplier,
    tickSize: profile.tickSize,
    minSlTicks: settings.minTicks,
  });
}

function plannedEntry(
  mode: EntryModelMode,
  zone: ResolvedZone,
  direction: "BUY" | "SELL",
  settings: EntrySlTpSettings,
  confirmationClose: number | undefined,
  explicitEntry: number | undefined,
): { price: number | null; reason: "MISSING_CONFIRMATION_CLOSE" | "MISSING_EXPLICIT_ENTRY" | null } {
  if (mode === "zone_midpoint" || mode === "full_zone_touch") {
    return { price: zone.midpoint, reason: null };
  }
  if (mode === "zone_edge") {
    const pref = settings.zoneEdgePreference;
    if (direction === "BUY") {
      return { price: pref === "high" ? zone.zoneHigh : zone.zoneLow, reason: null };
    }
    return { price: pref === "low" ? zone.zoneLow : zone.zoneHigh, reason: null };
  }
  if (mode === "confirmation_close") {
    if (confirmationClose == null || !Number.isFinite(confirmationClose)) {
      return { price: null, reason: "MISSING_CONFIRMATION_CLOSE" };
    }
    return { price: confirmationClose, reason: null };
  }
  if (explicitEntry == null || !Number.isFinite(explicitEntry)) {
    return { price: null, reason: "MISSING_EXPLICIT_ENTRY" };
  }
  return { price: explicitEntry, reason: null };
}

function plannedSl(
  mode: StopLossModelMode,
  direction: "BUY" | "SELL",
  entry: number,
  zone: ResolvedZone,
  tick: number,
  buf: number,
  input: EntrySlTpModelInput,
  explicitSl: number | undefined,
): { raw: number | null; code: EntrySlTpReasonCode | null } {
  if (mode === "explicit") {
    if (explicitSl == null || !Number.isFinite(explicitSl)) return { raw: null, code: "MISSING_EXPLICIT_SL" };
    return { raw: explicitSl, code: null };
  }
  if (mode === "atr_buffered") {
    if (direction === "BUY") return { raw: entry - buf, code: null };
    return { raw: entry + buf, code: null };
  }
  if (mode === "beyond_zone") {
    if (direction === "BUY") return { raw: zone.zoneLow - buf, code: null };
    return { raw: zone.zoneHigh + buf, code: null };
  }
  if (mode === "beyond_sweep") {
    if (direction === "BUY") {
      const s = input.sweepLow;
      if (s == null || !Number.isFinite(s)) return { raw: null, code: "MISSING_SWEEP_BOUNDS" };
      return { raw: s - buf, code: null };
    }
    const s = input.sweepHigh;
    if (s == null || !Number.isFinite(s)) return { raw: null, code: "MISSING_SWEEP_BOUNDS" };
    return { raw: s + buf, code: null };
  }
  if (mode === "beyond_structure") {
    if (direction === "BUY") {
      const s = input.structureLow;
      if (s == null || !Number.isFinite(s)) return { raw: null, code: "MISSING_STRUCTURE_BOUNDS" };
      return { raw: s - buf, code: null };
    }
    const s = input.structureHigh;
    if (s == null || !Number.isFinite(s)) return { raw: null, code: "MISSING_STRUCTURE_BOUNDS" };
    return { raw: s + buf, code: null };
  }
  return { raw: null, code: "MISSING_ATR_CONTEXT" };
}

function plannedTp(
  mode: TakeProfitModelMode,
  direction: "BUY" | "SELL",
  entry: number,
  risk: number,
  settings: EntrySlTpSettings,
  input: EntrySlTpModelInput,
  explicitTp: number | undefined,
): { raw: number | null; code: EntrySlTpReasonCode | null } {
  if (mode === "explicit") {
    if (explicitTp == null || !Number.isFinite(explicitTp)) return { raw: null, code: "MISSING_EXPLICIT_TP" };
    return { raw: explicitTp, code: null };
  }
  if (mode === "fixed_r") {
    const r = settings.fixedRTarget;
    if (direction === "BUY") return { raw: entry + risk * r, code: null };
    return { raw: entry - risk * r, code: null };
  }
  if (mode === "previous_high_low") {
    if (direction === "BUY") {
      const h = input.structureHigh;
      if (h == null || !Number.isFinite(h)) return { raw: null, code: "MISSING_STRUCTURE_BOUNDS" };
      return { raw: h, code: null };
    }
    const l = input.structureLow;
    if (l == null || !Number.isFinite(l)) return { raw: null, code: "MISSING_STRUCTURE_BOUNDS" };
    return { raw: l, code: null };
  }
  if (mode === "opposing_liquidity") {
    const p = input.opposingLiquidityPrice;
    if (p == null || !Number.isFinite(p)) return { raw: null, code: "MISSING_OPPOSING_LIQUIDITY" };
    return { raw: p, code: null };
  }
  if (mode === "hybrid_fixed_r_or_liquidity") {
    const liq = input.opposingLiquidityPrice;
    if (liq == null || !Number.isFinite(liq)) return { raw: null, code: "MISSING_OPPOSING_LIQUIDITY" };
    const fixed =
      direction === "BUY" ? entry + risk * settings.fixedRTarget : entry - risk * settings.fixedRTarget;
    const candidates = [fixed, liq];
    const valid: number[] = [];
    for (const tp of candidates) {
      const reward = direction === "BUY" ? tp - entry : entry - tp;
      if (!(reward > 0)) continue;
      const rr = reward / risk;
      if (rr < settings.minRr) continue;
      if (reward < settings.minMeaningfulRewardR * risk) continue;
      valid.push(tp);
    }
    if (valid.length === 0) return { raw: null, code: "HYBRID_NO_VALID_TARGET" };
    if (direction === "BUY") return { raw: Math.max(...valid), code: null };
    return { raw: Math.min(...valid), code: null };
  }
  return { raw: null, code: "MISSING_EXPLICIT_TP" };
}

function riskReward(
  direction: "BUY" | "SELL",
  entry: number,
  sl: number,
  tp: number,
): EntrySlTpRiskReward | null {
  const risk = direction === "BUY" ? entry - sl : sl - entry;
  const reward = direction === "BUY" ? tp - entry : entry - tp;
  if (!(risk > 0) || !(reward > 0)) return null;
  return { riskDistance: risk, rewardDistance: reward, rr: reward / risk };
}

function targetQuality(rr: number, minRr: number): EntrySlTpTargetQuality {
  if (!(rr > 0)) return "invalid";
  if (rr >= minRr * 1.25) return "strong";
  if (rr >= minRr) return "acceptable";
  if (rr >= minRr * 0.85) return "marginal";
  return "invalid";
}

function toReplayEntryModel(mode: EntryModelMode): ReplayEntryModel {
  if (mode === "confirmation_close") return "confirmation_close";
  if (mode === "manual_reference") return "manual_reference_price";
  return "zone_touch";
}

function buildReplayPreview(
  input: EntrySlTpModelInput,
  plan: EntrySlTpPricePlan,
  direction: "BUY" | "SELL",
  settings: EntrySlTpSettings,
): ReplayTradeInput {
  return {
    direction,
    entryPrice: plan.entry,
    entryAreaLow: plan.entryAreaLow,
    entryAreaHigh: plan.entryAreaHigh,
    stopLoss: plan.stopLoss,
    takeProfit: plan.takeProfit,
    symbolProfile: input.symbolProfile!,
    candles: input.recentCandles ?? [],
    entryModel: toReplayEntryModel(settings.entryMode),
    exitModel: "explicit_tp_sl",
    settings: { minRr: settings.minRr },
  };
}

export function buildEntrySlTpPlan(input: EntrySlTpModelInput): EntrySlTpModelResult {
  const settings = input.settings;
  const blocking: EntrySlTpReason[] = [];
  const warnings: EntrySlTpReason[] = [];

  const baseFailure = (status: EntrySlTpModelResult["status"]): EntrySlTpModelResult => ({
    status,
    pricePlan: null,
    rr: null,
    targetQuality: "invalid",
    replayInputPreview: null,
    blockingReasons: blocking,
    warningReasons: warnings,
    canReplay: false,
    reviewOnly: true,
  });

  if (!input.symbolProfile) {
    blocking.push(entrySlTpReason("MISSING_SYMBOL_PROFILE"));
    return { ...baseFailure("insufficient_data"), blockingReasons: blocking };
  }

  const zd = resolveZoneAndDirection(input);
  if (!zd) {
    blocking.push(entrySlTpReason("MISSING_ZONE_OR_PLAN"));
    return { ...baseFailure("insufficient_data"), blockingReasons: blocking };
  }
  const { zone, direction } = zd;

  const profile = input.symbolProfile;
  const tick = profile.tickSize;
  const atr = resolveAtr(input, settings);
  const buf = dynamicBuffer(atr, profile, settings);

  const entryRes = plannedEntry(
    settings.entryMode,
    zone,
    direction,
    settings,
    input.confirmationClose,
    input.explicitEntry,
  );
  if (entryRes.reason) {
    blocking.push(entrySlTpReason(entryRes.reason));
    return { ...baseFailure("invalid"), blockingReasons: blocking };
  }
  const entryRaw = entryRes.price!;

  const slRes = plannedSl(settings.slMode, direction, entryRaw, zone, tick, buf, input, input.explicitSl);
  if (slRes.code) {
    blocking.push(entrySlTpReason(slRes.code));
    return { ...baseFailure("invalid"), blockingReasons: blocking };
  }

  const slRounded =
    direction === "BUY"
      ? roundToTickSize(slRes.raw!, tick, "down")
      : roundToTickSize(slRes.raw!, tick, "up");
  const entry = roundToTickSize(entryRaw, tick, "nearest");

  const risk = direction === "BUY" ? entry - slRounded : slRounded - entry;
  if (!(risk > 0)) {
    blocking.push(entrySlTpReason("RISK_DISTANCE_NON_POSITIVE"));
    return { ...baseFailure("invalid"), blockingReasons: blocking };
  }

  const tpRes = plannedTp(settings.tpMode, direction, entry, risk, settings, input, input.explicitTp);
  if (tpRes.code) {
    blocking.push(entrySlTpReason(tpRes.code));
    return { ...baseFailure("invalid"), blockingReasons: blocking };
  }

  const tpRounded = roundToTickSize(tpRes.raw!, tick, "nearest");

  const rrInfo = riskReward(direction, entry, slRounded, tpRounded);
  if (!rrInfo) {
    blocking.push(entrySlTpReason("INVALID_PRICE_GEOMETRY"));
    return { ...baseFailure("invalid"), blockingReasons: blocking };
  }

  if (rrInfo.rewardDistance < rrInfo.riskDistance) {
    blocking.push(entrySlTpReason("REWARD_SHORTER_THAN_RISK"));
    const decision = settings.preferObserveOverBlock ? "observe_only" : "blocked";
    return {
      status: decision,
      pricePlan: {
        entry,
        stopLoss: slRounded,
        takeProfit: tpRounded,
        entryAreaLow: zone.zoneLow,
        entryAreaHigh: zone.zoneHigh,
        bufferPrice: buf,
      },
      rr: rrInfo,
      targetQuality: "invalid",
      replayInputPreview: null,
      blockingReasons: blocking,
      warningReasons: warnings,
      canReplay: false,
      reviewOnly: true,
    };
  }

  if (rrInfo.rr < settings.minRr) {
    blocking.push(entrySlTpReason("RR_BELOW_MINIMUM"));
    const decision = settings.preferObserveOverBlock ? "observe_only" : "blocked";
    return {
      status: decision,
      pricePlan: {
        entry,
        stopLoss: slRounded,
        takeProfit: tpRounded,
        entryAreaLow: zone.zoneLow,
        entryAreaHigh: zone.zoneHigh,
        bufferPrice: buf,
      },
      rr: rrInfo,
      targetQuality: targetQuality(rrInfo.rr, settings.minRr),
      replayInputPreview: null,
      blockingReasons: blocking,
      warningReasons: warnings,
      canReplay: false,
      reviewOnly: true,
    };
  }

  const tq = targetQuality(rrInfo.rr, settings.minRr);
  const pricePlan: EntrySlTpPricePlan = {
    entry,
    stopLoss: slRounded,
    takeProfit: tpRounded,
    entryAreaLow: zone.zoneLow,
    entryAreaHigh: zone.zoneHigh,
    bufferPrice: buf,
  };

  let status: EntrySlTpModelResult["status"] = "ready";
  const cp = input.currentPrice;
  if (cp != null && Number.isFinite(cp)) {
    const { riskDistance } = rrInfo;
    const pushTimingFailure = (code: EntrySlTpReasonCode): EntrySlTpModelResult["status"] => {
      const r = entrySlTpReason(code);
      if (settings.lateTradePolicy === "observe_only") {
        warnings.push(r);
        return "observe_only";
      }
      blocking.push(r);
      return "blocked";
    };
    if (direction === "BUY") {
      if (cp >= tpRounded) status = pushTimingFailure("TRADE_ALREADY_PAST_TARGET");
      else if (tpRounded - cp < settings.minMeaningfulRewardR * riskDistance) {
        status = pushTimingFailure("TARGET_TOO_CLOSE_TO_PRICE");
      } else if (cp > entry + settings.maxEntryChaseR * riskDistance) {
        status = pushTimingFailure("ENTRY_CHASE_EXCEEDED");
      }
    } else if (cp <= tpRounded) status = pushTimingFailure("TRADE_ALREADY_PAST_TARGET");
    else if (cp - tpRounded < settings.minMeaningfulRewardR * riskDistance) {
      status = pushTimingFailure("TARGET_TOO_CLOSE_TO_PRICE");
    } else if (cp < entry - settings.maxEntryChaseR * riskDistance) {
      status = pushTimingFailure("ENTRY_CHASE_EXCEEDED");
    }
  }

  const replayInputPreview = buildReplayPreview(input, pricePlan, direction, settings);
  const canReplay = status !== "blocked" && status !== "invalid" && status !== "insufficient_data";

  return {
    status,
    pricePlan,
    rr: rrInfo,
    targetQuality: tq,
    replayInputPreview,
    blockingReasons: blocking,
    warningReasons: warnings,
    canReplay,
    reviewOnly: true,
  };
}
