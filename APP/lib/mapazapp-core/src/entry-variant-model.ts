/**
 * V2-08 — Entry variant classification (pure core, review-only).
 */

import { calculateATR } from "./atr";
import { entryVariantReason } from "./entry-variant-reasons";
import type {
  EntryVariantClassification,
  EntryVariantEntryStyle,
  EntryVariantInput,
  EntryVariantQuality,
  EntryVariantReason,
  EntryVariantReasonCode,
  EntryVariantResult,
  EntryVariantScoreComponent,
  EntryVariantTimingStatus,
} from "./entry-variant-types";
import type { EntryVariantSettings } from "./entry-variant-settings";
import { slBufferPrice } from "./normalize";
import type { ReplayEntryModel } from "./replay-trade-types";

function clamp0100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function resolveAtr(input: EntryVariantInput, settings: EntryVariantSettings): number {
  if (input.atrPrice != null && Number.isFinite(input.atrPrice) && input.atrPrice > 0) return input.atrPrice;
  const candles = input.recentCandles;
  if (candles && candles.length > 6) {
    const a = calculateATR(candles, 5);
    if (a != null && a > 0) return a;
  }
  return settings.fallbackAtrPrice;
}

function edgeBand(
  settings: EntryVariantSettings,
  atr: number,
  profile: EntryVariantInput["symbolProfile"],
  spreadPrice: number,
): number {
  return slBufferPrice({
    atr,
    slAtrFactor: settings.edgeBandAtrMultiplier,
    spreadPrice,
    slSpreadFactor: settings.edgeBandSpreadMultiplier,
    tickSize: profile.tickSize,
    minSlTicks: settings.edgeBandMinTicks,
  });
}

function inputSpread(input: EntryVariantInput): number {
  if (input.spreadPrice != null && Number.isFinite(input.spreadPrice) && input.spreadPrice >= 0) {
    return input.spreadPrice;
  }
  return input.symbolProfile.spreadPrice;
}

function resolveZone(input: EntryVariantInput): {
  low: number;
  high: number;
  mid: number;
  invalidationPrice: number | null;
} | null {
  const z = input.zoneCandidate;
  const b = input.zoneBounds;
  if (z) {
    return {
      low: z.zoneLow,
      high: z.zoneHigh,
      mid: z.midpoint,
      invalidationPrice: z.invalidationPrice,
    };
  }
  if (b && Number.isFinite(b.zoneLow) && Number.isFinite(b.zoneHigh) && b.zoneHigh > b.zoneLow) {
    return { low: b.zoneLow, high: b.zoneHigh, mid: (b.zoneLow + b.zoneHigh) / 2, invalidationPrice: null };
  }
  return null;
}

/** Position u in [0,1] from zone low to high; BUY-oriented (higher = deeper into zone from below). */
function zonePositionU(touch: number, low: number, high: number): number {
  const w = high - low;
  if (!(w > 0)) return 0.5;
  return (touch - low) / w;
}

function anchorEdgePrice(direction: "BUY" | "SELL", low: number, high: number, settings: EntryVariantSettings): number {
  if (direction === "BUY") return settings.buyEdgeAnchor === "low" ? low : high;
  return settings.sellEdgeAnchor === "high" ? high : low;
}

function replayModelForStyle(style: EntryVariantEntryStyle): ReplayEntryModel {
  switch (style) {
    case "zone_midpoint_touch":
      return "midpoint_touch";
    case "confirmation_close":
      return "confirmation_close";
    case "manual_reference":
      return "manual_reference_price";
    default:
      return "zone_touch";
  }
}

function classifyDepthStyle(params: {
  direction: "BUY" | "SELL";
  touch: number;
  low: number;
  high: number;
  band: number;
  retested: boolean;
  settings: EntryVariantSettings;
}): { style: EntryVariantEntryStyle; codes: EntryVariantReasonCode[] } {
  const { direction, touch, low, high, band, retested, settings } = params;
  const codes: EntryVariantReasonCode[] = [];

  const uRaw = zonePositionU(touch, low, high);
  /** BUY: low→high penetration; SELL: mirror so “shallow vs deep” is direction-consistent. */
  const u = direction === "BUY" ? uRaw : 1 - uRaw;
  const mid = (low + high) / 2;
  const nearMid = Math.abs(touch - mid) <= band * 1.15;
  const edgePx = anchorEdgePrice(direction, low, high, settings);
  const nearEdge = Math.abs(touch - edgePx) <= band * 1.25;

  if (!retested) {
    if (nearEdge || nearMid) return { style: "no_entry", codes: ["NO_TOUCH_REFERENCE"] };
    return { style: "no_entry", codes };
  }

  /** True when touch hugs the anchor edge (discount/premium) — not “partial penetration” alone. */
  if (nearEdge) {
    return { style: "zone_edge_touch", codes };
  }

  if (nearMid && u >= settings.partialRetestMaxZoneFraction * 0.85 && u <= settings.deepRetestMinZoneFraction * 1.05) {
    return { style: "zone_midpoint_touch", codes };
  }

  if (u <= settings.partialRetestMaxZoneFraction) {
    codes.push("DEPTH_PARTIAL_RETEST");
    return { style: "partial_zone_retest", codes };
  }
  if (u >= settings.deepRetestMinZoneFraction) {
    codes.push("DEPTH_DEEP_RETEST");
    return { style: "deep_zone_retest", codes };
  }
  return { style: "zone_edge_touch", codes };
}

function wrongSide(direction: "BUY" | "SELL", touch: number, low: number, high: number, band: number): boolean {
  if (direction === "BUY") {
    return touch > high + band * 1.5 || touch < low - band * 1.15;
  }
  return touch < low - band * 1.5 || touch > high + band * 1.15;
}

function invalidatedGeometry(
  direction: "BUY" | "SELL",
  touch: number,
  invalidationPrice: number | null,
  currentPrice: number | null | undefined,
): boolean {
  if (invalidationPrice == null || !Number.isFinite(invalidationPrice)) return false;
  const px = currentPrice != null && Number.isFinite(currentPrice) ? currentPrice : touch;
  if (direction === "BUY") return px <= invalidationPrice;
  return px >= invalidationPrice;
}

function resolveTiming(params: {
  direction: "BUY" | "SELL";
  plan: EntryVariantInput["entrySlTpPlan"];
  currentPrice: number | null | undefined;
  settings: EntryVariantSettings;
  zoneExpired: boolean;
  geometryInvalid: boolean;
  retested: boolean;
}): { status: EntryVariantTimingStatus; codes: EntryVariantReasonCode[] } {
  const codes: EntryVariantReasonCode[] = [];
  if (params.geometryInvalid) {
    return { status: "invalidated", codes: ["GEOMETRY_INVALIDATED"] };
  }
  if (params.zoneExpired) {
    codes.push("TIMING_EXPIRED");
    return { status: "expired", codes };
  }

  const entry = params.plan?.entry;
  const sl = params.plan?.stopLoss;
  const tp = params.plan?.takeProfit;
  const cp = params.currentPrice;
  if (
    entry == null ||
    sl == null ||
    tp == null ||
    cp == null ||
    !Number.isFinite(entry) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(tp) ||
    !Number.isFinite(cp)
  ) {
    if (!params.retested) return { status: "early_wait", codes };
    return { status: "unknown", codes };
  }

  const risk =
    params.direction === "BUY" ? Math.abs(entry - sl) : Math.abs(sl - entry);
  if (!(risk > 0)) return { status: "unknown", codes };

  if (params.direction === "BUY") {
    if (cp >= tp - 1e-9) {
      codes.push("TIMING_MISSED_MOVE");
      return { status: "already_missed", codes };
    }
    const towardTp = cp - entry;
    if (towardTp >= params.settings.missedMoveTowardTpR * risk) {
      codes.push("TIMING_MISSED_MOVE");
      return { status: "already_missed", codes };
    }
    if (cp > entry + params.settings.lateChaseBeyondEntryR * risk) {
      codes.push("TIMING_LATE_CHASE");
      return { status: "late_chase", codes };
    }
    if (!params.retested && cp < entry - bandProxy(risk)) return { status: "early_wait", codes };
  } else {
    if (cp <= tp + 1e-9) {
      codes.push("TIMING_MISSED_MOVE");
      return { status: "already_missed", codes };
    }
    const towardTp = entry - cp;
    if (towardTp >= params.settings.missedMoveTowardTpR * risk) {
      codes.push("TIMING_MISSED_MOVE");
      return { status: "already_missed", codes };
    }
    if (cp < entry - params.settings.lateChaseBeyondEntryR * risk) {
      codes.push("TIMING_LATE_CHASE");
      return { status: "late_chase", codes };
    }
    if (!params.retested && cp > entry + bandProxy(risk)) return { status: "early_wait", codes };
  }

  return { status: "valid_now", codes };
}

function bandProxy(risk: number): number {
  return risk * 0.08;
}

function toleranceAcceptsImperfect(input: EntryVariantInput): boolean {
  const tol = input.toleranceCalibrationResult;
  if (!tol) return false;
  const r = tol.byDimension.retest_depth;
  if (!r || r.reasonCodes.includes("MEASUREMENT_OMITTED")) return false;
  return r.quality === "acceptable" || r.quality === "weak_but_usable" || r.quality === "ideal";
}

function spreadElevated(input: EntryVariantInput, settings: EntryVariantSettings, atr: number): boolean {
  if (!(atr > 0)) return false;
  return inputSpread(input) / atr >= settings.elevatedSpreadToAtrRatio;
}

function buildComponents(params: {
  depthStyle: EntryVariantEntryStyle;
  retested: boolean;
  confirmation: EntryVariantInput["confirmationResult"];
  timing: EntryVariantTimingStatus;
  wrongSide: boolean;
  geomInvalid: boolean;
  spreadHigh: boolean;
  tolAccept: boolean;
}): EntryVariantScoreComponent[] {
  let depthScore = 40;
  if (!params.retested) depthScore = 22;
  else if (params.depthStyle === "zone_edge_touch") depthScore = 92;
  else if (params.depthStyle === "zone_midpoint_touch") depthScore = 88;
  else if (params.depthStyle === "partial_zone_retest") depthScore = 58;
  else if (params.depthStyle === "deep_zone_retest") depthScore = 72;
  else if (params.depthStyle === "confirmation_close") depthScore = 86;
  else if (params.depthStyle === "manual_reference") depthScore = 70;
  else depthScore = 30;

  let confScore = 28;
  const c = params.confirmation;
  if (c?.confirmed && c.quality === "CLEAR") confScore = 100;
  else if (c?.confirmed && c.quality === "MARGINAL") confScore = 66;
  else if (c?.confirmed) confScore = 50;
  else if (c) confScore = 24;

  let timeScore = 55;
  switch (params.timing) {
    case "valid_now":
      timeScore = 90;
      break;
    case "early_wait":
      timeScore = 62;
      break;
    case "late_chase":
      timeScore = 38;
      break;
    case "already_missed":
      timeScore = 12;
      break;
    case "expired":
      timeScore = 15;
      break;
    case "invalidated":
      timeScore = 5;
      break;
    default:
      timeScore = 48;
  }

  let geomScore = 85;
  if (params.geomInvalid || params.wrongSide) geomScore = 8;

  let spreadScore = 78;
  if (params.spreadHigh) spreadScore = 55;

  const wDepth = 0.28;
  const wConf = 0.26;
  const wTime = 0.26;
  const wGeom = 0.14;
  const wSp = 0.06;

  return [
    {
      id: "retestDepth",
      score: depthScore,
      weight: wDepth,
      note: `Depth style ${params.depthStyle}.`,
    },
    {
      id: "confirmation",
      score: confScore,
      weight: wConf,
      note: c?.confirmed ? `Confirmation ${c.quality}.` : "No confirmation.",
    },
    {
      id: "timing",
      score: timeScore,
      weight: wTime,
      note: `Timing ${params.timing}.`,
    },
    {
      id: "geometry",
      score: geomScore,
      weight: wGeom,
      note: params.geomInvalid || params.wrongSide ? "Geometry invalid or wrong side." : "Geometry coherent.",
    },
    {
      id: "spreadRegime",
      score: spreadScore,
      weight: wSp,
      note: params.spreadHigh ? "Spread elevated vs ATR." : "Spread regime neutral.",
    },
  ];
}

function mergeClassification(params: {
  timing: EntryVariantTimingStatus;
  depthStyle: EntryVariantEntryStyle;
  retested: boolean;
  confirmation: EntryVariantInput["confirmationResult"];
  wrongSide: boolean;
  geomInvalid: boolean;
  zoneExpired: boolean;
  tolAccept: boolean;
  spreadHigh: boolean;
}): { classification: EntryVariantClassification; quality: EntryVariantQuality } {
  if (params.geomInvalid || params.wrongSide) {
    return { classification: "invalid_entry", quality: "invalid" };
  }
  if (params.timing === "invalidated") {
    return { classification: "invalid_entry", quality: "invalid" };
  }
  if (params.timing === "already_missed") {
    return { classification: "missed_entry", quality: "poor" };
  }
  if (params.timing === "expired") {
    return { classification: "missed_entry", quality: "poor" };
  }
  if (params.timing === "late_chase") {
    return { classification: "late_entry", quality: "weak" };
  }

  const confOk = params.confirmation?.confirmed === true;
  const confClear = params.confirmation?.quality === "CLEAR";

  if (params.timing === "early_wait" && !params.retested) {
    return { classification: "weak_observe_entry", quality: "weak" };
  }

  if (!params.retested) {
    return { classification: "weak_observe_entry", quality: "weak" };
  }

  if (!confOk && params.depthStyle !== "confirmation_close") {
    return { classification: "weak_observe_entry", quality: "weak" };
  }

  if (params.depthStyle === "partial_zone_retest") {
    if (params.tolAccept || (params.spreadHigh && confOk)) {
      return { classification: "accepted_entry", quality: "acceptable" };
    }
    return { classification: "weak_observe_entry", quality: "weak" };
  }

  if (params.depthStyle === "deep_zone_retest" && confOk) {
    return { classification: "accepted_entry", quality: "acceptable" };
  }

  if (confClear && (params.depthStyle === "zone_edge_touch" || params.depthStyle === "zone_midpoint_touch")) {
    return { classification: "ideal_entry", quality: "ideal" };
  }

  if (confOk && (params.depthStyle === "zone_edge_touch" || params.depthStyle === "zone_midpoint_touch")) {
    return { classification: "accepted_entry", quality: "acceptable" };
  }

  if (params.depthStyle === "confirmation_close" && confOk) {
    return { classification: "ideal_entry", quality: "ideal" };
  }

  return { classification: "accepted_entry", quality: "acceptable" };
}

export function evaluateEntryVariant(input: EntryVariantInput): EntryVariantResult {
  const settings = input.settings;
  const reasons: EntryVariantReason[] = [];
  const reasonCodes: EntryVariantReasonCode[] = [];
  const explain: string[] = [];

  const zone = resolveZone(input);
  if (!zone) {
    const code: EntryVariantReasonCode = "INSUFFICIENT_ZONE_INPUT";
    reasons.push(entryVariantReason(code));
    return {
      classification: "invalid_entry",
      quality: "invalid",
      qualityScore: 0,
      timingStatus: "unknown",
      preferredEntryStyle: "no_entry",
      replayEntryModel: "zone_touch",
      reasonCodes: [code],
      reasons,
      components: [],
      explainability: ["Missing zone — cannot classify entry variant."],
      reviewOnly: true,
    };
  }

  const { low, high, mid, invalidationPrice } = zone;
  const direction = input.direction;
  const atr = resolveAtr(input, settings);
  const bandRaw = edgeBand(settings, atr, input.symbolProfile, inputSpread(input));
  const band = Math.min(bandRaw, atr * settings.classificationBandMaxAtrMultiple);
  const retested = input.retestResult?.retested === true;
  const touchRaw =
    input.retestResult?.touchPrice != null && Number.isFinite(input.retestResult.touchPrice)
      ? input.retestResult.touchPrice
      : input.currentPrice != null && Number.isFinite(input.currentPrice)
        ? input.currentPrice
        : mid;

  const depth = classifyDepthStyle({
    direction,
    touch: touchRaw,
    low,
    high,
    band,
    retested,
    settings,
  });

  let preferredStyle = depth.style;
  if (
    settings.treatClearConfirmationAsConfirmationCloseStyle &&
    input.confirmationResult?.confirmed === true &&
    input.confirmationResult.quality === "CLEAR"
  ) {
    preferredStyle = "confirmation_close";
  }

  const ws = wrongSide(direction, touchRaw, low, high, band);
  const geomInvalid =
    input.zoneInvalidated === true ||
    invalidatedGeometry(direction, touchRaw, invalidationPrice, input.currentPrice);

  const timing = resolveTiming({
    direction,
    plan: input.entrySlTpPlan ?? null,
    currentPrice: input.currentPrice,
    settings,
    zoneExpired: input.zoneExpired === true,
    geometryInvalid: geomInvalid,
    retested,
  });

  for (const c of depth.codes) {
    if (c !== "NO_TOUCH_REFERENCE" || !retested) {
      if (!reasonCodes.includes(c)) reasonCodes.push(c);
    }
  }
  for (const c of timing.codes) {
    if (!reasonCodes.includes(c)) reasonCodes.push(c);
  }

  const tolAccept = toleranceAcceptsImperfect(input);
  const spreadHigh = spreadElevated(input, settings, atr);

  if (ws) {
    reasonCodes.push("GEOMETRY_WRONG_SIDE");
    reasons.push(entryVariantReason("GEOMETRY_WRONG_SIDE"));
  }
  if (tolAccept) {
    reasonCodes.push("TOLERANCE_SUPPORTS_ACCEPTED");
    reasons.push(entryVariantReason("TOLERANCE_SUPPORTS_ACCEPTED"));
    explain.push("Tolerance retest_depth supports accepting imperfect entry.");
  }
  const { classification, quality } = mergeClassification({
    timing: timing.status,
    depthStyle: preferredStyle,
    retested,
    confirmation: input.confirmationResult,
    wrongSide: ws,
    geomInvalid,
    zoneExpired: input.zoneExpired === true,
    tolAccept,
    spreadHigh,
  });

  if (
    spreadHigh &&
    classification !== "invalid_entry" &&
    classification !== "missed_entry" &&
    input.confirmationResult?.confirmed === true
  ) {
    reasonCodes.push("HIGH_SPREAD_IMPERFECT_ACCEPTED");
    reasons.push(entryVariantReason("HIGH_SPREAD_IMPERFECT_ACCEPTED"));
    explain.push("Spread elevated — acceptance is technical only, not execution advice.");
  }

  const components = buildComponents({
    depthStyle: preferredStyle,
    retested,
    confirmation: input.confirmationResult,
    timing: timing.status,
    wrongSide: ws,
    geomInvalid,
    spreadHigh,
    tolAccept,
  });

  let weighted = 0;
  let wsum = 0;
  for (const c of components) {
    weighted += c.score * c.weight;
    wsum += c.weight;
  }
  const qualityScore = wsum > 0 ? clamp0100(weighted / wsum) : 0;

  if (
    classification !== "invalid_entry" &&
    classification !== "missed_entry" &&
    !reasonCodes.includes("OK")
  ) {
    reasonCodes.push("OK");
  }
  explain.push(
    `Classification ${classification}; timing ${timing.status}; style ${preferredStyle}; touch reference ${touchRaw.toFixed(5)}.`,
  );

  return {
    classification,
    quality,
    qualityScore,
    timingStatus: timing.status,
    preferredEntryStyle: preferredStyle,
    replayEntryModel: replayModelForStyle(preferredStyle),
    reasonCodes,
    reasons,
    components,
    explainability: explain,
    reviewOnly: true,
  };
}
