import type { SymbolMarketSpec } from "./symbol-profile";
import type {
  ToleranceCalibrationInput,
  ToleranceCalibrationResult,
  ToleranceDimension,
  ToleranceDimensionMeasurement,
  ToleranceDimensionMeasurements,
  ToleranceDimensionResult,
  ToleranceNormalizedValue,
  TolerancePriceBand,
  ToleranceQualityClassification,
  ToleranceReasonCode,
  ToleranceSpreadRegime,
  ToleranceVolatilityRegime,
} from "./tolerance-calibration-types";
import type { ToleranceCalibrationSettings, ToleranceDimensionFactors } from "./tolerance-calibration-settings";

export const ALL_TOLERANCE_DIMENSIONS: readonly ToleranceDimension[] = [
  "liquidity_sweep",
  "near_sweep",
  "over_sweep_break_risk",
  "retest_depth",
  "zone_padding",
  "entry_chase",
  "spread_cost",
  "sl_buffer",
  "confirmation_wick",
  "target_distance",
] as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function dynamicTolerancePrice(params: {
  atr: number;
  spreadPrice: number;
  tickSize: number;
  factors: ToleranceDimensionFactors;
}): { tolerance: number; components: TolerancePriceBand["components"] } {
  const atrPart = params.atr * params.factors.atrMultiplier;
  const spreadPart = params.spreadPrice * params.factors.spreadMultiplier;
  const tickPart = params.tickSize * params.factors.minTicks;
  const tolerance = Math.max(atrPart, spreadPart, tickPart);
  return { tolerance, components: { atrPart, spreadPart, tickPart } };
}

function normalizedTriple(
  raw: number,
  atr: number,
  spreadPrice: number,
  tickSize: number,
): ToleranceNormalizedValue {
  return {
    normalizedByAtr: atr > 0 ? raw / atr : null,
    normalizedBySpread: spreadPrice > 0 ? raw / spreadPrice : null,
    normalizedByTick: tickSize > 0 ? raw / tickSize : null,
  };
}

function classifyQuality(ratio: number, q: ToleranceCalibrationSettings["qualityRatios"]): ToleranceQualityClassification {
  if (ratio <= q.idealMax) return "ideal";
  if (ratio <= q.acceptableMax) return "acceptable";
  if (ratio <= q.weakMax) return "weak_but_usable";
  if (ratio <= q.observeMax) return "observe_only";
  return "invalid";
}

function scoreFromRatio(ratio: number, q: ToleranceCalibrationSettings["qualityRatios"]): number {
  if (ratio <= q.idealMax) return 100;
  if (ratio <= q.acceptableMax) {
    const t = (ratio - q.idealMax) / Math.max(1e-9, q.acceptableMax - q.idealMax);
    return Math.round(100 - t * 18);
  }
  if (ratio <= q.weakMax) {
    const t = (ratio - q.acceptableMax) / Math.max(1e-9, q.weakMax - q.acceptableMax);
    return Math.round(82 - t * 22);
  }
  if (ratio <= q.observeMax) {
    const t = (ratio - q.weakMax) / Math.max(1e-9, q.observeMax - q.weakMax);
    return Math.round(60 - t * 35);
  }
  const over = ratio - q.observeMax;
  return Math.round(clamp(25 - over * 40, 0, 25));
}

function classifySpreadRegime(
  spreadPrice: number,
  atr: number,
  th: ToleranceCalibrationSettings["spreadRegime"],
): ToleranceSpreadRegime {
  if (!(atr > 0) || !(spreadPrice >= 0)) return "expensive_spread";
  const r = spreadPrice / atr;
  if (r <= th.normalMaxRatio) return "normal_spread";
  if (r <= th.elevatedMaxRatio) return "elevated_spread";
  return "expensive_spread";
}

function classifyVolatilityRegime(
  atr: number,
  ref: number,
  th: ToleranceCalibrationSettings["volatilityRegime"],
): ToleranceVolatilityRegime {
  if (!(ref > 0) || !(atr > 0)) return "normal_volatility";
  const rel = atr / ref;
  if (rel <= th.lowFactor) return "low_volatility";
  if (rel >= th.extremeFactor) return "extreme_volatility";
  if (rel >= th.highFactor) return "high_volatility";
  return "normal_volatility";
}

function mkOmitted(
  dimension: ToleranceDimension,
  atr: number,
  spreadPrice: number,
  tickSize: number,
  factors: ToleranceDimensionFactors,
): ToleranceDimensionResult {
  const { tolerance, components } = dynamicTolerancePrice({ atr, spreadPrice, tickSize, factors });
  return {
    dimension,
    rawScalarDescription: "omitted",
    rawDistancePrice: null,
    rawChaseTowardTpR: null,
    normalized: { normalizedByAtr: null, normalizedBySpread: null, normalizedByTick: null },
    tolerancePrice: tolerance,
    band: { halfWidthPrice: tolerance, components },
    quality: "ideal",
    score: 100,
    reasonCodes: ["MEASUREMENT_OMITTED"],
    explanation: "No measurement supplied — tolerance band computed for reference only.",
  };
}

function evaluatePriceDistanceDimension(params: {
  dimension: ToleranceDimension;
  rawDistancePrice: number;
  settings: ToleranceCalibrationSettings;
  atr: number;
  spreadPrice: number;
  tickSize: number;
  extraReasons?: ToleranceReasonCode[];
  /** Optional boost to tolerance band (price add). */
  toleranceAddPrice?: number;
  /** Optional one-sided note */
  rawDescription?: string;
}): ToleranceDimensionResult {
  const factors = params.settings.dimensionFactors[params.dimension];
  const { tolerance, components } = dynamicTolerancePrice({
    atr: params.atr,
    spreadPrice: params.spreadPrice,
    tickSize: params.tickSize,
    factors,
  });
  const tol = tolerance + (params.toleranceAddPrice ?? 0);
  const raw = Math.max(0, params.rawDistancePrice);
  const ratio = tol > 0 ? raw / tol : 0;
  const quality = classifyQuality(ratio, params.settings.qualityRatios);
  const score = scoreFromRatio(ratio, params.settings.qualityRatios);
  const reasons: ToleranceReasonCode[] = [...(params.extraReasons ?? [])];
  if (quality === "ideal" || quality === "acceptable") reasons.push("WITHIN_DYNAMIC_BAND");
  else if (quality === "weak_but_usable") reasons.push("NEAR_EDGE_OF_BAND", "EXCEEDS_BAND_SOFT");
  else if (quality === "observe_only") reasons.push("EXCEEDS_BAND_SOFT");
  else reasons.push("EXCEEDS_BAND_HARD");
  if (params.dimension === "over_sweep_break_risk" && quality !== "ideal" && quality !== "acceptable") {
    reasons.push("BREAK_RISK_DEPTH");
  }
  const explanation = `${params.dimension}: raw=${raw.toExponential(4)} vs tol=${tol.toExponential(4)} (${quality}).`;
  return {
    dimension: params.dimension,
    rawScalarDescription: params.rawDescription ?? "rawDistancePrice",
    rawDistancePrice: raw,
    rawChaseTowardTpR: null,
    normalized: normalizedTriple(raw, params.atr, params.spreadPrice, params.tickSize),
    tolerancePrice: tol,
    band: { halfWidthPrice: tol, components },
    quality,
    score,
    reasonCodes: reasons,
    explanation,
  };
}

function evaluateRetestDepth(
  m: { rawDistancePrice: number; zoneTouchOccurred?: boolean },
  ctx: { atr: number; spreadPrice: number; tickSize: number; settings: ToleranceCalibrationSettings },
): ToleranceDimensionResult {
  const bonus = m.zoneTouchOccurred ? ctx.settings.retestZoneTouchAtrBonus * ctx.atr : 0;
  const base = evaluatePriceDistanceDimension({
    dimension: "retest_depth",
    rawDistancePrice: m.rawDistancePrice,
    settings: ctx.settings,
    atr: ctx.atr,
    spreadPrice: ctx.spreadPrice,
    tickSize: ctx.tickSize,
    toleranceAddPrice: bonus,
    rawDescription: "midpoint_miss",
    extraReasons: m.zoneTouchOccurred ? ["ZONE_TOUCH_COMPENSATION"] : [],
  });
  if (m.zoneTouchOccurred && base.quality !== "invalid") {
    return {
      ...base,
      score: Math.min(100, base.score + 8),
      quality: base.quality === "observe_only" ? "weak_but_usable" : base.quality,
      explanation: `${base.explanation} Zone touch compensation applied.`,
    };
  }
  return base;
}

function evaluateSpreadCost(
  m: { spreadToAtrRatio?: number } | undefined,
  ctx: { atr: number; spreadPrice: number; tickSize: number; settings: ToleranceCalibrationSettings },
): ToleranceDimensionResult {
  const ratio = m?.spreadToAtrRatio ?? (ctx.atr > 0 ? ctx.spreadPrice / ctx.atr : Number.POSITIVE_INFINITY);
  const th = ctx.settings.spreadRegime;
  const normal = th.normalMaxRatio;
  const elevated = th.elevatedMaxRatio;
  const excess = Math.max(0, ratio - normal);
  const tolAsRatio = Math.max(1e-9, elevated - normal);
  const ratioScore = excess / tolAsRatio;
  const quality = classifyQuality(ratioScore, ctx.settings.qualityRatios);
  let score = scoreFromRatio(ratioScore, ctx.settings.qualityRatios);
  const regime = classifySpreadRegime(ctx.spreadPrice, ctx.atr, th);
  if (regime === "elevated_spread") score = Math.min(score, 78);
  if (regime === "expensive_spread") score = Math.min(score, 52);
  const reasons: ToleranceReasonCode[] = ["OK"];
  if (regime !== "normal_spread") reasons.push("SPREAD_EXPENSIVE_VS_ATR");
  if (quality === "observe_only" || quality === "invalid") reasons.push("EXCEEDS_BAND_SOFT");
  const tolPrice = ctx.atr * tolAsRatio;
  const { components } = dynamicTolerancePrice({
    atr: ctx.atr,
    spreadPrice: ctx.spreadPrice,
    tickSize: ctx.tickSize,
    factors: ctx.settings.dimensionFactors.spread_cost,
  });
  return {
    dimension: "spread_cost",
    rawScalarDescription: "spreadToAtrRatio_excess",
    rawDistancePrice: excess * ctx.atr,
    rawChaseTowardTpR: null,
    normalized: normalizedTriple(excess * ctx.atr, ctx.atr, ctx.spreadPrice, ctx.tickSize),
    tolerancePrice: tolPrice,
    band: { halfWidthPrice: tolPrice, components },
    quality,
    score,
    reasonCodes: reasons,
    explanation: `spread/ATR=${ratio.toFixed(4)} regime=${regime} (${quality}).`,
  };
}

function evaluateEntryChase(
  m: { chaseTowardTpR: number },
  ctx: { settings: ToleranceCalibrationSettings },
): ToleranceDimensionResult {
  const r = Math.max(0, m.chaseTowardTpR);
  const o = ctx.settings.entryChase.observeOnlyMinR;
  const inv = ctx.settings.entryChase.invalidMinR;
  let quality: ToleranceQualityClassification;
  if (r < o * 0.45) quality = "ideal";
  else if (r < o) quality = "acceptable";
  else if (r < inv) quality = "weak_but_usable";
  else if (r < inv * 1.08) quality = "observe_only";
  else quality = "invalid";
  let score = 100;
  if (r >= o * 0.45) score = Math.round(100 - ((r - o * 0.45) / Math.max(1e-9, o * 0.55)) * 28);
  if (r >= o) score = Math.min(score, Math.round(72 - ((r - o) / Math.max(1e-9, inv - o)) * 40));
  if (r >= inv) score = Math.min(score, Math.round(32 - (r - inv) * 90));
  score = clamp(score, 0, 100);
  const reasons: ToleranceReasonCode[] = [];
  if (quality === "invalid" || quality === "observe_only") reasons.push("ENTRY_CHASE_TOO_LATE");
  else reasons.push("OK");
  return {
    dimension: "entry_chase",
    rawScalarDescription: "chaseTowardTpR",
    rawDistancePrice: null,
    rawChaseTowardTpR: r,
    normalized: { normalizedByAtr: null, normalizedBySpread: null, normalizedByTick: null },
    tolerancePrice: 0,
    band: { halfWidthPrice: 0, components: { atrPart: 0, spreadPart: 0, tickPart: 0 } },
    quality,
    score,
    reasonCodes: reasons,
    explanation: `Entry chase toward TP = ${r.toFixed(3)}R (observe≥${o.toFixed(2)}R, invalid≥${inv.toFixed(2)}R).`,
  };
}

function evaluateSlBuffer(
  m: { bufferExcessPrice: number },
  ctx: { atr: number; spreadPrice: number; tickSize: number; settings: ToleranceCalibrationSettings },
): ToleranceDimensionResult {
  const deficiency = Math.max(0, -m.bufferExcessPrice);
  return evaluatePriceDistanceDimension({
    dimension: "sl_buffer",
    rawDistancePrice: deficiency,
    settings: ctx.settings,
    atr: ctx.atr,
    spreadPrice: ctx.spreadPrice,
    tickSize: ctx.tickSize,
    rawDescription: "buffer_deficiency",
  });
}

function evaluateConfirmationWick(
  m: { wickShortfallPrice: number },
  ctx: { atr: number; spreadPrice: number; tickSize: number; settings: ToleranceCalibrationSettings },
): ToleranceDimensionResult {
  return evaluatePriceDistanceDimension({
    dimension: "confirmation_wick",
    rawDistancePrice: m.wickShortfallPrice,
    settings: ctx.settings,
    atr: ctx.atr,
    spreadPrice: ctx.spreadPrice,
    tickSize: ctx.tickSize,
    rawDescription: "wick_shortfall",
  });
}

function isPriceDistanceMeasurement(x: unknown): x is { rawDistancePrice: number; zoneTouchOccurred?: boolean } {
  return typeof x === "object" && x != null && "rawDistancePrice" in x && typeof (x as { rawDistancePrice: unknown }).rawDistancePrice === "number";
}

export function evaluateToleranceCalibration(input: ToleranceCalibrationInput): ToleranceCalibrationResult {
  const profile = input.symbolProfile;
  const atr = input.atr;
  const tickSize = profile.tickSize;
  const spreadPrice = profile.spreadPrice;
  const ref = input.referenceAtr != null && Number.isFinite(input.referenceAtr) && input.referenceAtr! > 0 ? input.referenceAtr! : atr;

  const volatilityRegime = classifyVolatilityRegime(atr, ref, input.settings.volatilityRegime);
  const spreadRegime = classifySpreadRegime(spreadPrice, atr, input.settings.spreadRegime);

  const prof: ToleranceCalibrationResult["profile"] = {
    canonicalSymbol: profile.canonicalSymbol,
    tickSize,
    spreadPrice,
    atr,
    volatilityRegime,
    spreadRegime,
    referenceAtr: ref,
  };

  const byDimension = {} as Record<ToleranceDimension, ToleranceDimensionResult>;
  const scores: number[] = [];
  const m = input.measurements;

  const ctx = { atr, spreadPrice, tickSize, settings: input.settings };

  for (const dim of ALL_TOLERANCE_DIMENSIONS) {
    const meas = m[dim as keyof ToleranceDimensionMeasurements] as ToleranceDimensionMeasurement | undefined;
    if (!meas) {
      byDimension[dim] = mkOmitted(dim, atr, spreadPrice, tickSize, input.settings.dimensionFactors[dim]);
    } else if (dim === "retest_depth" && isPriceDistanceMeasurement(meas)) {
      byDimension[dim] = evaluateRetestDepth(meas, ctx);
    } else if (dim === "spread_cost") {
      byDimension[dim] = evaluateSpreadCost(meas as { spreadToAtrRatio?: number }, ctx);
    } else if (dim === "entry_chase" && typeof meas === "object" && meas != null && "chaseTowardTpR" in meas) {
      byDimension[dim] = evaluateEntryChase(meas as { chaseTowardTpR: number }, { settings: input.settings });
    } else if (dim === "sl_buffer" && typeof meas === "object" && meas != null && "bufferExcessPrice" in meas) {
      byDimension[dim] = evaluateSlBuffer(meas as { bufferExcessPrice: number }, ctx);
    } else if (dim === "confirmation_wick" && typeof meas === "object" && meas != null && "wickShortfallPrice" in meas) {
      byDimension[dim] = evaluateConfirmationWick(meas as { wickShortfallPrice: number }, ctx);
    } else if (dim === "target_distance" && typeof meas === "object" && meas != null && "shortfallPrice" in meas) {
      byDimension[dim] = evaluatePriceDistanceDimension({
        dimension: "target_distance",
        rawDistancePrice: (meas as { shortfallPrice: number }).shortfallPrice,
        settings: input.settings,
        atr,
        spreadPrice,
        tickSize,
        rawDescription: "target_shortfall",
      });
    } else if (isPriceDistanceMeasurement(meas)) {
      byDimension[dim] = evaluatePriceDistanceDimension({
        dimension: dim,
        rawDistancePrice: meas.rawDistancePrice,
        settings: input.settings,
        atr,
        spreadPrice,
        tickSize,
      });
    } else {
      byDimension[dim] = mkOmitted(dim, atr, spreadPrice, tickSize, input.settings.dimensionFactors[dim]);
    }

    const r = byDimension[dim]!;
    if (!r.reasonCodes.includes("MEASUREMENT_OMITTED")) scores.push(r.score);
  }

  const measuredAggregateScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const summaryExplanation = `Tolerance calibration for ${profile.canonicalSymbol}: vol=${volatilityRegime}, spread=${spreadRegime}, aggregate=${measuredAggregateScore ?? "n/a"}.`;

  return { profile: prof, byDimension, measuredAggregateScore, summaryExplanation };
}

/** Public helper: price-distance evaluation for a single dimension (sweep-style geometry). */
export function evaluateTolerancePriceDistanceDimension(
  dimension: Exclude<
    ToleranceDimension,
    "entry_chase" | "spread_cost" | "sl_buffer" | "confirmation_wick" | "target_distance"
  >,
  rawDistancePrice: number,
  input: Pick<ToleranceCalibrationInput, "settings" | "symbolProfile" | "atr" | "referenceAtr">,
): ToleranceDimensionResult {
  const full = evaluateToleranceCalibration({
    settings: input.settings,
    symbolProfile: input.symbolProfile,
    atr: input.atr,
    referenceAtr: input.referenceAtr,
    measurements: { [dimension]: { rawDistancePrice: rawDistancePrice } } as ToleranceDimensionMeasurements,
  });
  return full.byDimension[dimension]!;
}
