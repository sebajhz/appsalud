/**
 * V2-09 — Target / liquidity objective model (pure core, review-only).
 */

import { detectSwings } from "./swing-detector";
import { targetObjectiveReason } from "./target-objective-reasons";
import type {
  TargetObjectiveCandidate,
  TargetObjectiveClassification,
  TargetObjectiveInput,
  TargetObjectiveMode,
  TargetObjectiveQuality,
  TargetObjectiveReason,
  TargetObjectiveReasonCode,
  TargetObjectiveReplayHint,
  TargetObjectiveResult,
  TargetObjectiveSource,
} from "./target-objective-types";
import { roundToTickSize } from "./normalize";

function riskDist(direction: "BUY" | "SELL", entry: number, sl: number): number {
  return direction === "BUY" ? entry - sl : sl - entry;
}

function rewardDist(direction: "BUY" | "SELL", entry: number, tp: number): number {
  return direction === "BUY" ? tp - entry : entry - tp;
}

function correctSide(direction: "BUY" | "SELL", entry: number, tp: number): boolean {
  return rewardDist(direction, entry, tp) > 0;
}

function deriveSwingLevels(
  input: TargetObjectiveInput,
): { swingHigh: number | null; swingLow: number | null; reason: TargetObjectiveReasonCode | null } {
  const candles = input.recentCandles;
  const s = input.settings;
  if (!candles || candles.length < s.swingLeftBars + s.swingRightBars + 1) {
    return { swingHigh: null, swingLow: null, reason: "INSUFFICIENT_SWING_DATA" };
  }
  const swings = detectSwings(candles, { swingLeftBars: s.swingLeftBars, swingRightBars: s.swingRightBars });
  let lastHigh: number | null = null;
  let lastLow: number | null = null;
  for (const sw of swings) {
    if (sw.type === "HIGH") lastHigh = sw.price;
    if (sw.type === "LOW") lastLow = sw.price;
  }
  return { swingHigh: lastHigh, swingLow: lastLow, reason: null };
}

function previousHighLowPrice(
  direction: "BUY" | "SELL",
  entry: number,
  input: TargetObjectiveInput,
  swingHigh: number | null,
  swingLow: number | null,
): { price: number | null; source: TargetObjectiveSource } {
  if (direction === "BUY") {
    const h = input.structureHigh ?? swingHigh;
    if (h != null && Number.isFinite(h) && h > entry) return { price: h, source: input.structureHigh != null ? "structure_level" : "swing_high" };
    return { price: null, source: "swing_high" };
  }
  const l = input.structureLow ?? swingLow;
  if (l != null && Number.isFinite(l) && l < entry) return { price: l, source: input.structureLow != null ? "structure_level" : "swing_low" };
  return { price: null, source: "swing_low" };
}

function rangeExtremePrice(
  direction: "BUY" | "SELL",
  entry: number,
  input: TargetObjectiveInput,
): { price: number | null; source: TargetObjectiveSource } {
  if (direction === "BUY") {
    const h = input.rangeHigh;
    if (h != null && Number.isFinite(h) && h > entry) return { price: h, source: "range_high" };
  } else {
    const l = input.rangeLow;
    if (l != null && Number.isFinite(l) && l < entry) return { price: l, source: "range_low" };
  }
  return { price: null, source: direction === "BUY" ? "range_high" : "range_low" };
}

function opposingPrice(
  direction: "BUY" | "SELL",
  entry: number,
  p: number | undefined,
): { price: number | null; source: TargetObjectiveSource } {
  if (p == null || !Number.isFinite(p)) return { price: null, source: "opposing_liquidity" };
  if (!correctSide(direction, entry, p)) return { price: null, source: "opposing_liquidity" };
  return { price: p, source: "opposing_liquidity" };
}

function classifyVsCurrent(
  direction: "BUY" | "SELL",
  entry: number,
  tp: number,
  risk: number,
  current: number | undefined,
  tick: number,
  bufferTicks: number,
  tooCloseR: number,
): TargetObjectiveClassification {
  if (current == null || !Number.isFinite(current)) return "acceptable_target";
  const buf = bufferTicks * tick;
  const reward = rewardDist(direction, entry, tp);
  if (direction === "BUY") {
    if (current >= tp - buf) return "already_reached";
    if (tp - current < tooCloseR * risk) return "too_close";
  } else {
    if (current <= tp + buf) return "already_reached";
    if (current - tp < tooCloseR * risk) return "too_close";
  }
  if (!(reward > 0)) return "invalid_target";
  return "acceptable_target";
}

function classifyDistance(
  base: TargetObjectiveClassification,
  reward: number,
  atr: number,
  farMult: number,
): TargetObjectiveClassification {
  if (base === "already_reached" || base === "too_close" || base === "invalid_target") return base;
  if (atr > 0 && reward > farMult * atr) return "too_far";
  return base;
}

function contextPenalty(
  direction: "BUY" | "SELL",
  bias: TargetObjectiveInput["contextBiasResult"],
): number {
  if (!bias) return 0;
  if (direction === "BUY" && bias.preferredDirection === "sell_only") return -12;
  if (direction === "SELL" && bias.preferredDirection === "buy_only") return -12;
  if (bias.preferredDirection === "no_trade") return -8;
  if (
    (direction === "BUY" && bias.preferredDirection === "buy_only") ||
    (direction === "SELL" && bias.preferredDirection === "sell_only")
  ) {
    return 6;
  }
  return 0;
}

function buildCandidate(
  input: TargetObjectiveInput,
  direction: "BUY" | "SELL",
  entry: number,
  sl: number,
  risk: number,
  tpRaw: number,
  mode: TargetObjectiveMode,
  source: TargetObjectiveSource,
  atr: number,
  spread: number,
): TargetObjectiveCandidate | null {
  const settings = input.settings;
  const tick = input.symbolProfile!.tickSize;
  const tp = roundToTickSize(tpRaw, tick, "nearest");
  if (!correctSide(direction, entry, tp)) return null;
  const reward = rewardDist(direction, entry, tp);
  if (!(reward > 0)) return null;
  if (reward < risk && !settings.allowRewardShorterThanRisk) {
    return {
      price: tp,
      mode,
      source,
      rewardDistance: reward,
      riskDistance: risk,
      rr: reward / risk,
      score: 0,
      classification: "invalid_target",
      reasonCodes: ["REWARD_SHORTER_THAN_RISK"],
    };
  }
  const rr = reward / risk;
  let cls = classifyVsCurrent(
    direction,
    entry,
    tp,
    risk,
    input.currentPrice,
    tick,
    settings.bufferTicksForAlreadyReached,
    settings.tooCloseToTargetR,
  );
  cls = classifyDistance(cls, reward, atr, settings.targetTooFarAtrMultiple);
  if (rr < settings.minRr) cls = cls === "already_reached" || cls === "too_close" ? cls : "weak_target";

  const codes: TargetObjectiveReasonCode[] = [];
  if (rr < settings.minRr) codes.push("RR_BELOW_MINIMUM");

  let score = 50;
  score += Math.min(35, Math.max(0, (rr - settings.minRr) * 12));
  if (rr >= settings.recommendedMinRr) score += 10;
  if (cls === "too_far") score -= 25;
  if (cls === "too_close") score -= 30;
  if (cls === "already_reached") score -= 45;
  if (atr > 0) {
    const spreadPenalty = Math.min(15, (spread / atr) * 40);
    score -= spreadPenalty;
  }
  score += contextPenalty(direction, input.contextBiasResult ?? null);
  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    price: tp,
    mode,
    source,
    rewardDistance: reward,
    riskDistance: risk,
    rr,
    score,
    classification: cls,
    reasonCodes: codes.length ? codes : ["OK"],
  };
}

function filterSelectable(c: TargetObjectiveCandidate, settings: TargetObjectiveInput["settings"]): boolean {
  if (c.classification === "invalid_target") return false;
  if (c.rewardDistance < c.riskDistance && !settings.allowRewardShorterThanRisk) return false;
  if (c.rr < settings.minRr) return false;
  if (c.rewardDistance < settings.minMeaningfulRewardR * c.riskDistance) return false;
  if (c.classification === "too_far") return false;
  /** `already_reached` / `too_close` are retained for review classification (V2-09). */
  return true;
}

function pickBest(cands: TargetObjectiveCandidate[], settings: TargetObjectiveInput["settings"]): TargetObjectiveCandidate | null {
  const valid = cands.filter((c) => filterSelectable(c, settings));
  if (!valid.length) return null;
  valid.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rr !== a.rr) return b.rr - a.rr;
    return a.price - b.price;
  });

  const fixed = valid.find((c) => c.source === "fixed_r");
  const liq = valid.find((c) => c.source === "opposing_liquidity" || c.source === "range_high" || c.source === "range_low");
  const struct = valid.find((c) => c.source === "structure_level" || c.source === "swing_high" || c.source === "swing_low");

  if (settings.mode === "hybrid_best_available" && settings.preferLiquidityWhenBeatsFixedR) {
    const prefer = liq ?? struct;
    if (prefer && fixed && prefer.rr >= fixed.rr && prefer.rr >= settings.minRr) return prefer;
    if (prefer && !fixed) return prefer;
  }
  return valid[0] ?? null;
}

function finalClassification(
  selected: TargetObjectiveCandidate,
  settings: TargetObjectiveInput["settings"],
): TargetObjectiveClassification {
  const { rr, classification: cls } = selected;
  if (cls === "insufficient_data" || cls === "invalid_target") return cls;
  if (!(rr > 0)) return "invalid_target";
  if (cls === "too_close" || cls === "already_reached") return cls;
  if (cls === "too_far") return cls;
  if (rr >= settings.recommendedMinRr) return "ideal_target";
  if (rr >= settings.minRr) return "acceptable_target";
  return "weak_target";
}

function qualityFrom(rr: number | null, cls: TargetObjectiveClassification): TargetObjectiveQuality {
  if (cls === "invalid_target" || cls === "insufficient_data") return "invalid";
  if (cls === "already_reached" || cls === "too_far") return "poor";
  if (cls === "too_close") return "poor";
  if (cls === "weak_target") return "weak";
  if (cls === "ideal_target") return "ideal";
  if (cls === "acceptable_target") return "acceptable";
  return "acceptable";
}

function qualityScoreFrom(rr: number | null, cls: TargetObjectiveClassification, base: number): number {
  let q = base;
  if (rr != null) q = Math.round((q + Math.min(100, rr * 25)) / 2);
  if (cls === "ideal_target") q = Math.min(100, q + 8);
  if (cls === "weak_target") q = Math.max(0, q - 12);
  if (cls === "too_close" || cls === "already_reached") q = Math.max(0, q - 35);
  if (cls === "too_far") q = Math.max(0, q - 20);
  if (cls === "invalid_target") q = Math.min(q, 15);
  return Math.round(Math.min(100, Math.max(0, q)));
}

function replayHintFrom(
  mode: TargetObjectiveMode,
  source: TargetObjectiveSource,
): TargetObjectiveReplayHint {
  if (source === "opposing_liquidity" || source === "range_high" || source === "range_low") {
    return { focus: "liquidity_objective", notes: "Objective anchored on liquidity / range (review-only)." };
  }
  if (source === "structure_level" || source === "swing_high" || source === "swing_low") {
    return { focus: "structure_objective", notes: "Objective anchored on structure / swing (review-only)." };
  }
  if (source === "explicit_price") {
    return { focus: "explicit_objective", notes: "Explicit target price (review-only)." };
  }
  if (mode === "hybrid_best_available" || source === "hybrid_selection") {
    return { focus: "liquidity_objective", notes: "Hybrid selection among fixed R and liquidity-style levels (review-only)." };
  }
  return { focus: "fixed_r_objective", notes: "Fixed-R style objective (review-only)." };
}

export function evaluateTargetObjective(input: TargetObjectiveInput): TargetObjectiveResult {
  const empty = (blocking: TargetObjectiveReason[], warnings: TargetObjectiveReason[]): TargetObjectiveResult => ({
    selectedTargetPrice: null,
    selectedMode: input.settings.mode,
    selectedSource: "hybrid_selection",
    rr: null,
    classification: "insufficient_data",
    qualityScore: 0,
    quality: "invalid",
    candidates: [],
    blockingReasons: blocking,
    warningReasons: warnings,
    replayHint: null,
    reviewOnly: true,
  });

  if (!input.symbolProfile) {
    return empty([targetObjectiveReason("MISSING_SYMBOL_PROFILE")], []);
  }
  if (!input.direction) {
    return empty([targetObjectiveReason("MISSING_DIRECTION")], []);
  }
  if (!Number.isFinite(input.entryPrice)) {
    return empty([targetObjectiveReason("MISSING_ENTRY_PRICE")], []);
  }
  if (!Number.isFinite(input.stopLossPrice)) {
    return empty([targetObjectiveReason("MISSING_STOP_LOSS")], []);
  }

  const direction = input.direction;
  const entry = input.entryPrice;
  const sl = input.stopLossPrice;
  const risk = riskDist(direction, entry, sl);
  if (!(risk > 0)) {
    return empty([targetObjectiveReason("RISK_DISTANCE_NON_POSITIVE")], []);
  }

  const profile = input.symbolProfile;
  const atr =
    input.atrPrice != null && Number.isFinite(input.atrPrice) && input.atrPrice > 0
      ? input.atrPrice
      : profile.tickSize * 100;
  const spread = input.spreadPrice ?? profile.spreadPrice;
  const settings = input.settings;

  if (settings.mode === "explicit") {
    if (input.explicitTargetPrice == null || !Number.isFinite(input.explicitTargetPrice)) {
      return empty([targetObjectiveReason("EXPLICIT_TARGET_MISSING")], []);
    }
  }

  const { swingHigh, swingLow, reason: swingReason } = deriveSwingLevels(input);

  const candidates: TargetObjectiveCandidate[] = [];

  const fixedTp = direction === "BUY" ? entry + risk * settings.fixedRTarget : entry - risk * settings.fixedRTarget;
  const fixedCand = buildCandidate(
    input,
    direction,
    entry,
    sl,
    risk,
    fixedTp,
    "fixed_r",
    "fixed_r",
    atr,
    spread,
  );
  if (fixedCand) candidates.push(fixedCand);

  const phl = previousHighLowPrice(direction, entry, input, swingHigh, swingLow);
  if (phl.price != null) {
    const src: TargetObjectiveSource =
      phl.source === "structure_level"
        ? "structure_level"
        : direction === "BUY"
          ? "swing_high"
          : "swing_low";
    const modeTag: TargetObjectiveMode = phl.source === "structure_level" ? "structure_level" : "previous_high_low";
    const c = buildCandidate(input, direction, entry, sl, risk, phl.price, modeTag, src, atr, spread);
    if (c) candidates.push(c);
  }

  const rng = rangeExtremePrice(direction, entry, input);
  if (rng.price != null) {
    const c = buildCandidate(input, direction, entry, sl, risk, rng.price, "range_extreme", rng.source, atr, spread);
    if (c) candidates.push(c);
  }

  const opp = opposingPrice(direction, entry, input.opposingLiquidityPrice);
  if (opp.price != null) {
    const c = buildCandidate(
      input,
      direction,
      entry,
      sl,
      risk,
      opp.price,
      "opposing_liquidity",
      "opposing_liquidity",
      atr,
      spread,
    );
    if (c) candidates.push(c);
  }

  if (input.explicitTargetPrice != null && Number.isFinite(input.explicitTargetPrice)) {
    const c = buildCandidate(
      input,
      direction,
      entry,
      sl,
      risk,
      input.explicitTargetPrice,
      "explicit",
      "explicit_price",
      atr,
      spread,
    );
    if (c) candidates.push(c);
  }

  let selected: TargetObjectiveCandidate | null = null;

  if (settings.mode === "fixed_r") {
    selected = fixedCand && filterSelectable(fixedCand, settings) ? fixedCand : null;
  } else if (settings.mode === "explicit") {
    const ex = candidates.find((c) => c.mode === "explicit");
    selected = ex && filterSelectable(ex, settings) ? ex : null;
  } else if (settings.mode === "opposing_liquidity") {
    const o = candidates.find((c) => c.mode === "opposing_liquidity");
    selected = o && filterSelectable(o, settings) ? o : null;
  } else if (settings.mode === "range_extreme") {
    const r = candidates.find((c) => c.mode === "range_extreme");
    selected = r && filterSelectable(r, settings) ? r : null;
  } else if (settings.mode === "structure_level" || settings.mode === "previous_high_low") {
    const p =
      candidates.find((c) => c.mode === "structure_level") ??
      candidates.find((c) => c.mode === "previous_high_low");
    selected = p && filterSelectable(p, settings) ? p : null;
  } else if (settings.mode === "hybrid_best_available") {
    selected = pickBest(candidates, settings);
    if (selected) {
      selected = { ...selected, source: "hybrid_selection", mode: "hybrid_best_available" };
    }
    if (!selected) {
      const fixedFallback = fixedCand && filterSelectable(fixedCand, settings) ? fixedCand : null;
      selected = fixedFallback;
    }
  }

  if (!selected) {
    const warnings: TargetObjectiveReason[] = [];
    if (settings.mode === "previous_high_low" && swingReason && !phl.price) {
      warnings.push(targetObjectiveReason("INSUFFICIENT_SWING_DATA"));
    }
    if (input.contextBiasResult && contextPenalty(direction, input.contextBiasResult) < 0) {
      warnings.push(targetObjectiveReason("CONTEXT_MISALIGNED_SOFT"));
    }
    return {
      selectedTargetPrice: null,
      selectedMode: settings.mode,
      selectedSource: "hybrid_selection",
      rr: null,
      classification: "invalid_target",
      qualityScore: 0,
      quality: "invalid",
      candidates,
      blockingReasons: [targetObjectiveReason("NO_VALID_CANDIDATE")],
      warningReasons: warnings,
      replayHint: null,
      reviewOnly: true,
    };
  }

  const cls = finalClassification(selected, settings);
  const qScore = qualityScoreFrom(selected.rr, cls, selected.score);
  const qual = qualityFrom(selected.rr, cls);

  const warnings: TargetObjectiveReason[] = [];
  if (input.contextBiasResult && contextPenalty(direction, input.contextBiasResult) < 0) {
    warnings.push(targetObjectiveReason("CONTEXT_MISALIGNED_SOFT"));
  }

  return {
    selectedTargetPrice: selected.price,
    selectedMode: selected.mode,
    selectedSource: selected.source,
    rr: selected.rr,
    classification: cls,
    qualityScore: qScore,
    quality: qual,
    candidates,
    blockingReasons: [],
    warningReasons: warnings,
    replayHint: replayHintFrom(selected.mode, selected.source),
    reviewOnly: true,
  };
}
