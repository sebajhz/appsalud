import type { Candle } from "./candle";
import { calculateAtrSeries } from "./atr";
import { detectSwings, type SwingPoint } from "./swing-detector";
import type {
  ContextBiasConfidenceBand,
  ContextBiasDirection,
  ContextBiasExplainabilityItem,
  ContextBiasInput,
  ContextBiasMarketRegime,
  ContextBiasPerTimeframeSnapshot,
  ContextBiasRangePosition,
  ContextBiasReasonCode,
  ContextBiasResult,
  ContextBiasScoreComponent,
  ContextBiasStructureState,
  ContextBiasTimeframeInput,
  ContextBiasTimeframeKey,
} from "./context-bias-types";
import { contextBiasReason } from "./context-bias-reasons";

const TF_ORDER: ContextBiasTimeframeKey[] = ["D1", "H4", "H1", "M15"];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** When swing pivots are thin or mixed, slope of closes still gives a stable HTF lean v1. */
function closeSlopeSign(candles: Candle[]): -1 | 0 | 1 {
  if (candles.length < 8) return 0;
  const from = candles[0]!.close;
  const to = candles[candles.length - 1]!.close;
  const rel = (to - from) / Math.max(1e-9, Math.abs(from));
  if (rel > 0.0025) return 1;
  if (rel < -0.0025) return -1;
  return 0;
}

function lastTwoByType(swings: SwingPoint[], type: "HIGH" | "LOW"): SwingPoint[] {
  const xs = swings.filter((s) => s.type === type).sort((a, b) => a.index - b.index);
  if (xs.length < 2) return [];
  return xs.slice(-2);
}

function classifyStructure(
  candles: Candle[],
  swings: SwingPoint[],
  settings: ContextBiasInput["settings"],
): {
  structure: ContextBiasStructureState;
  sign: -1 | 0 | 1;
  reasons: ContextBiasReasonCode[];
} {
  const reasons: ContextBiasReasonCode[] = [];
  const highs = lastTwoByType(swings, "HIGH");
  const lows = lastTwoByType(swings, "LOW");
  if (highs.length < 2 || lows.length < 2) {
    return { structure: "unknown", sign: 0, reasons: ["INSUFFICIENT_HTF_DATA"] };
  }
  const [h0, h1] = highs;
  const [l0, l1] = lows;
  const HH = h1.price > h0.price;
  const HL = l1.price > l0.price;
  const LH = h1.price < h0.price;
  const LL = l1.price < l0.price;

  let structure: ContextBiasStructureState = "mixed";
  let sign: -1 | 0 | 1 = 0;

  if (HH && HL) {
    structure = "higher_highs_higher_lows";
    sign = 1;
    reasons.push("HTF_SWING_STRUCTURE_BULLISH");
  } else if (LH && LL) {
    structure = "lower_highs_lower_lows";
    sign = -1;
    reasons.push("HTF_SWING_STRUCTURE_BEARISH");
  } else {
    structure = "mixed";
    reasons.push("HTF_SWING_STRUCTURE_MIXED");
  }

  const last = candles[candles.length - 1]!;
  if (sign === 1 && last.close < l1.price) {
    structure = "broken_structure_down";
    sign = 0;
    reasons.length = 0;
    reasons.push("HTF_SWING_STRUCTURE_MIXED");
  } else if (sign === -1 && last.close > h1.price) {
    structure = "broken_structure_up";
    sign = 0;
    reasons.length = 0;
    reasons.push("HTF_SWING_STRUCTURE_MIXED");
  }

  return { structure, sign, reasons };
}

function chopBodyRangeRatio(candles: Candle[], lookback: number): number {
  const n = candles.length;
  if (n < 2) return 1;
  const from = Math.max(0, n - lookback);
  let sum = 0;
  let cnt = 0;
  for (let i = from; i < n; i++) {
    const c = candles[i]!;
    const range = Math.max(c.high - c.low, 1e-12);
    sum += Math.abs(c.close - c.open) / range;
    cnt++;
  }
  return cnt > 0 ? sum / cnt : 1;
}

function rangeFromCandles(candles: Candle[], lookback: number): {
  high: number;
  low: number;
  mid: number;
} | null {
  if (!candles.length) return null;
  const lb = Math.min(lookback, candles.length);
  const slice = candles.slice(-lb);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of slice) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  if (!(hi > lo)) return { high: hi, low: lo, mid: (hi + lo) / 2 };
  return { high: hi, low: lo, mid: (hi + lo) / 2 };
}

function classifyRangePosition(
  price: number,
  rangeHigh: number,
  rangeLow: number,
): ContextBiasRangePosition {
  const span = rangeHigh - rangeLow;
  if (!(span > 0)) return "unknown";
  const t = (price - rangeLow) / span;
  if (t <= 0.12) return "extreme_low";
  if (t >= 0.88) return "extreme_high";
  if (t < 0.38) return "discount";
  if (t > 0.62) return "premium";
  return "middle";
}

function atrExpansionRegime(
  candles: Candle[],
  period: number,
  expansionRatio: number,
  contractionRatio: number,
): { regime: "expansion" | "contraction" | "neutral"; reasons: ContextBiasReasonCode[] } {
  const reasons: ContextBiasReasonCode[] = [];
  const series = calculateAtrSeries(candles, period);
  const n = series.length;
  if (n < period * 3) return { regime: "neutral", reasons };
  let i = n - 1;
  while (i >= 0 && series[i] == null) i--;
  const recent = i >= 0 ? series[i] : null;
  let j = i - period * 2;
  if (j < period) return { regime: "neutral", reasons };
  const older = series[j];
  if (recent == null || older == null || !(older > 0)) return { regime: "neutral", reasons };
  const r = recent / older;
  if (r >= expansionRatio) {
    reasons.push("HTF_EXPANSION");
    return { regime: "expansion", reasons };
  }
  if (r <= contractionRatio) {
    reasons.push("HTF_CONTRACTION");
    return { regime: "contraction", reasons };
  }
  return { regime: "neutral", reasons };
}

function inferMarketRegime(params: {
  structure: ContextBiasStructureState;
  sign: -1 | 0 | 1;
  choppy: boolean;
  atrReg: "expansion" | "contraction" | "neutral";
}): ContextBiasMarketRegime {
  if (params.choppy) return "choppy";
  if (params.structure === "broken_structure_up" || params.structure === "broken_structure_down") {
    return "unclear";
  }
  if (params.structure === "mixed" || params.structure === "unknown") return "ranging";
  if (params.sign === 1 && params.structure === "higher_highs_higher_lows") return "trending_up";
  if (params.sign === -1 && params.structure === "lower_highs_lower_lows") return "trending_down";
  if (params.atrReg === "expansion") return "expansion";
  if (params.atrReg === "contraction") return "contraction";
  return "unclear";
}

function analyzeTimeframe(
  tf: ContextBiasTimeframeKey,
  candles: Candle[],
  settings: ContextBiasInput["settings"],
  price: number,
): ContextBiasPerTimeframeSnapshot | null {
  if (candles.length < settings.minBarsAnchorTimeframe) return null;
  const swings = detectSwings(candles, settings.swing);
  const { structure, sign } = classifyStructure(candles, swings, settings);
  const slopeSign = closeSlopeSign(candles);
  const directionalSign: -1 | 0 | 1 = sign !== 0 ? sign : slopeSign;
  const chopRatio = chopBodyRangeRatio(candles, settings.choppyLookbackBars);
  const choppy = chopRatio < settings.choppyBodyRangeRatioMax;
  const atrR = atrExpansionRegime(
    candles,
    settings.atrPeriod,
    settings.expansionAtrRatio,
    settings.contractionAtrRatio,
  );
  const regime = inferMarketRegime({ structure, sign: directionalSign, choppy, atrReg: atrR.regime });
  const rg = rangeFromCandles(candles, settings.rangeLookbackBars);
  const rangePosition =
    rg != null ? classifyRangePosition(price, rg.high, rg.low) : ("unknown" as ContextBiasRangePosition);

  return {
    timeframe: tf,
    barCount: candles.length,
    structure,
    regime,
    rangeHigh: rg?.high ?? null,
    rangeLow: rg?.low ?? null,
    rangeMid: rg?.mid ?? null,
    rangePosition,
    directionalSign,
  };
}

function mtfAlignment(
  snaps: ContextBiasPerTimeframeSnapshot[],
): { aligned: boolean; conflict: boolean; reasons: ContextBiasReasonCode[] } {
  const reasons: ContextBiasReasonCode[] = [];
  const h4 = snaps.find((s) => s.timeframe === "H4");
  const h1 = snaps.find((s) => s.timeframe === "H1");
  if (!h4 || !h1) {
    return { aligned: false, conflict: false, reasons };
  }
  const a = h4.directionalSign;
  const b = h1.directionalSign;
  if (a === 0 || b === 0) return { aligned: false, conflict: false, reasons };
  if (a === b) {
    reasons.push("HTF_MTF_ALIGNED");
    return { aligned: true, conflict: false, reasons };
  }
  reasons.push("HTF_MTF_CONFLICT");
  return { aligned: false, conflict: true, reasons };
}

function preferredDirectionFromScores(
  buy: number,
  sell: number,
  noTrade: number,
  choppy: boolean,
): ContextBiasDirection {
  if (noTrade >= 72 && buy < 48 && sell < 48) return "no_trade";
  if (choppy && buy < 58 && sell < 58) return "both_allowed";
  if (buy >= sell + 22 && buy >= 68) return "buy_only";
  if (sell >= buy + 22 && sell >= 68) return "sell_only";
  if (buy < 52 && sell < 52) return "unclear";
  return "both_allowed";
}

function confidenceBandFrom(
  aligned: boolean,
  conflict: boolean,
  requireAlign: boolean,
  contextScore: number,
): ContextBiasConfidenceBand {
  if (conflict) return "low";
  if (requireAlign && !aligned) return contextScore >= 70 ? "medium" : "low";
  if (contextScore >= 78 && aligned) return "high";
  if (contextScore >= 62) return "medium";
  return "low";
}

export function evaluateContextBias(input: ContextBiasInput): ContextBiasResult {
  const reasons: ContextBiasReasonCode[] = [];
  const byTf = input.htfCandlesByTimeframe;
  const price =
    input.currentPrice != null && Number.isFinite(input.currentPrice)
      ? input.currentPrice
      : (() => {
          let lastClose = 0;
          for (const tf of TF_ORDER) {
            const c = byTf[tf];
            if (c?.length) lastClose = c[c.length - 1]!.close;
          }
          for (const tf of ["M15", "H1", "H4", "D1"] as const) {
            const c = byTf[tf];
            if (c?.length) lastClose = c[c.length - 1]!.close;
          }
          return lastClose;
        })();

  const snaps: ContextBiasPerTimeframeSnapshot[] = [];
  for (const tf of TF_ORDER) {
    const candles = byTf[tf];
    if (!candles?.length) continue;
    const s = analyzeTimeframe(tf, candles, input.settings, price);
    if (s) snaps.push(s);
  }

  if (snaps.length === 0) {
    return {
      canonicalSymbol: input.canonicalSymbol,
      brokerSymbol: input.brokerSymbol,
      lowerTimeframe: input.lowerTimeframe,
      preferredDirection: "unclear",
      allowedDirections: ["BUY", "SELL"],
      contextScore: 28,
      buyScore: 45,
      sellScore: 45,
      noTradeScore: 40,
      marketRegime: "unclear",
      rangePosition: "unknown",
      structureState: "unknown",
      confidenceBand: "low",
      reasonCodes: ["INSUFFICIENT_HTF_DATA"],
      explainability: [],
      components: [],
      perTimeframe: [],
      summaryExplanation: contextBiasReason("INSUFFICIENT_HTF_DATA").message,
    };
  }

  const anchor = snaps[0]!;
  const anchorCandles =
    byTf[anchor.timeframe] ?? byTf.D1 ?? byTf.H4 ?? byTf.H1 ?? byTf.M15 ?? [];
  const chopRatio = chopBodyRangeRatio(anchorCandles, input.settings.choppyLookbackBars);
  const choppy = chopRatio < input.settings.choppyBodyRangeRatioMax;
  if (choppy) reasons.push("HTF_CHOPPY_PROXY");

  const { aligned, conflict, reasons: mtfReasons } = mtfAlignment(snaps);
  reasons.push(...mtfReasons);

  let buyScore = 52;
  let sellScore = 52;
  let noTradeScore = 18;

  const struct = anchor.structure;
  const sign = anchor.directionalSign;
  if (sign === 1) {
    buyScore += 26;
    sellScore -= 12;
    reasons.push("HTF_SWING_STRUCTURE_BULLISH");
  } else if (sign === -1) {
    sellScore += 26;
    buyScore -= 12;
    reasons.push("HTF_SWING_STRUCTURE_BEARISH");
  } else {
    reasons.push("HTF_SWING_STRUCTURE_MIXED");
  }

  const rp = anchor.rangePosition;
  if (rp === "discount" || rp === "extreme_low") {
    buyScore += 16;
    reasons.push("HTF_RANGE_DISCOUNT");
  } else if (rp === "premium" || rp === "extreme_high") {
    sellScore += 16;
    reasons.push("HTF_RANGE_PREMIUM");
  } else if (rp === "middle") {
    buyScore -= input.settings.middleRangePenalty;
    sellScore -= input.settings.middleRangePenalty;
    reasons.push("HTF_RANGE_MIDDLE");
  }

  if (conflict) {
    buyScore -= 18;
    sellScore -= 18;
    noTradeScore += 22;
  }

  if (choppy) {
    buyScore -= input.settings.choppyMarketPenalty;
    sellScore -= input.settings.choppyMarketPenalty;
    noTradeScore += input.settings.noTradeIfExtremeChop ? 28 : 12;
  }

  buyScore = clamp(Math.round(buyScore), 0, 100);
  sellScore = clamp(Math.round(sellScore), 0, 100);
  noTradeScore = clamp(Math.round(noTradeScore), 0, 100);

  const dirEval = input.directionToEvaluate;
  let setupAlignmentScore = 72;
  const setupReasons: ContextBiasReasonCode[] = [];
  if (dirEval === "BUY") {
    if (sign === -1 || anchor.rangePosition === "premium") {
      buyScore = clamp(buyScore - input.settings.oppositeTrendPenalty, 0, 100);
      setupAlignmentScore = 38;
      setupReasons.push("SETUP_DIRECTION_OPPOSED");
    } else if (sign === 1 && (rp === "discount" || rp === "extreme_low" || rp === "middle")) {
      buyScore = clamp(buyScore + 8, 0, 100);
      setupAlignmentScore = 88;
      setupReasons.push("SETUP_DIRECTION_ALIGNED");
    } else {
      setupAlignmentScore = 62;
    }
  } else if (dirEval === "SELL") {
    if (sign === 1 || anchor.rangePosition === "discount") {
      sellScore = clamp(sellScore - input.settings.oppositeTrendPenalty, 0, 100);
      setupAlignmentScore = 38;
      setupReasons.push("SETUP_DIRECTION_OPPOSED");
    } else if (sign === -1 && (rp === "premium" || rp === "extreme_high" || rp === "middle")) {
      sellScore = clamp(sellScore + 8, 0, 100);
      setupAlignmentScore = 88;
      setupReasons.push("SETUP_DIRECTION_ALIGNED");
    } else {
      setupAlignmentScore = 62;
    }
  }

  if (noTradeScore >= 62) {
    setupReasons.push("CONTEXT_NO_TRADE_BIAS");
  }

  const trendStructureScore = clamp(50 + sign * 28 + (conflict ? -15 : aligned ? 12 : 0), 0, 100);
  let rangeScore = 55;
  if (rp === "discount" || rp === "extreme_low") rangeScore = 72;
  if (rp === "premium" || rp === "extreme_high") rangeScore = 72;
  if (rp === "middle") rangeScore = 40;
  if (rp === "unknown") rangeScore = 45;

  const mtfScore = conflict ? 32 : aligned ? 88 : 58;
  const volScore = choppy ? 28 : 68;

  const wTrend = 0.28;
  const wRange = 0.22;
  const wMtf = 0.22;
  const wVol = 0.14;
  const wSetup = 0.14;
  let contextScore = Math.round(
    trendStructureScore * wTrend +
      rangeScore * wRange +
      mtfScore * wMtf +
      volScore * wVol +
      setupAlignmentScore * wSetup,
  );
  contextScore = clamp(contextScore, 0, 100);

  const anchorSlope = closeSlopeSign(anchorCandles);
  if (!choppy && !conflict && anchorSlope !== 0) {
    contextScore = Math.min(100, contextScore + (aligned ? 10 : 18));
  }

  if (input.settings.requireHtfAlignmentForHighConfidence && !aligned && !conflict) {
    reasons.push("HIGH_CONFIDENCE_REQUIRES_MTF");
  }

  const preferredDirection = preferredDirectionFromScores(buyScore, sellScore, noTradeScore, choppy);
  let allowedDirections: Array<"BUY" | "SELL"> = ["BUY", "SELL"];
  if (preferredDirection === "no_trade") {
    allowedDirections = [];
    reasons.push("CONTEXT_NO_TRADE_BIAS");
  } else if (preferredDirection === "buy_only") allowedDirections = ["BUY"];
  else if (preferredDirection === "sell_only") allowedDirections = ["SELL"];

  const confidenceBand = confidenceBandFrom(
    aligned,
    conflict,
    input.settings.requireHtfAlignmentForHighConfidence,
    contextScore,
  );

  const marketRegime = anchor.regime;
  const rangePosition = anchor.rangePosition;
  const structureState = struct;

  const components: ContextBiasScoreComponent[] = [
    {
      id: "trendStructure",
      score: trendStructureScore,
      weight: wTrend,
      reasonCodes: reasons.filter((r) =>
        [
          "HTF_SWING_STRUCTURE_BULLISH",
          "HTF_SWING_STRUCTURE_BEARISH",
          "HTF_SWING_STRUCTURE_MIXED",
          "INSUFFICIENT_HTF_DATA",
        ].includes(r),
      ),
      explanationSimple: `HTF swing structure on ${anchor.timeframe}: ${structureState}.`,
    },
    {
      id: "rangePosition",
      score: rangeScore,
      weight: wRange,
      reasonCodes: reasons.filter((r) =>
        ["HTF_RANGE_DISCOUNT", "HTF_RANGE_PREMIUM", "HTF_RANGE_MIDDLE"].includes(r),
      ),
      explanationSimple: `Range position: ${rangePosition}.`,
    },
    {
      id: "mtfAlignment",
      score: mtfScore,
      weight: wMtf,
      reasonCodes: mtfReasons,
      explanationSimple: conflict ? "H4/H1 conflict." : aligned ? "H4/H1 aligned." : "Partial MTF data or neutral.",
    },
    {
      id: "volatilityChop",
      score: volScore,
      weight: wVol,
      reasonCodes: choppy ? ["HTF_CHOPPY_PROXY"] : ["OK"],
      explanationSimple: choppy ? "Choppy proxy triggered (body/range)." : "Volatility/chop acceptable.",
    },
    {
      id: "setupAlignment",
      score: setupAlignmentScore,
      weight: wSetup,
      reasonCodes: setupReasons.length ? setupReasons : ["OK"],
      explanationSimple:
        dirEval != null ? `Setup direction ${dirEval} vs HTF.` : "No setup direction supplied — neutral alignment weight.",
    },
  ];

  const explainability: ContextBiasExplainabilityItem[] = components.map((c) => ({
    componentId: c.id,
    label: c.id,
    score: c.score,
    weight: c.weight,
    contribution: c.score * c.weight,
    reasonCodes: c.reasonCodes,
    explanationSimple: c.explanationSimple,
  }));

  const allReasons = [...reasons, ...setupReasons];
  const reasonCodes =
    allReasons.length > 0 ? [...new Set(allReasons)] : (["OK"] as ContextBiasReasonCode[]);

  const summaryExplanation = `${input.canonicalSymbol}: HTF bias ${preferredDirection}, regime ${marketRegime}, contextScore ${contextScore}.`;

  return {
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol,
    lowerTimeframe: input.lowerTimeframe,
    preferredDirection,
    allowedDirections,
    contextScore,
    buyScore,
    sellScore,
    noTradeScore,
    marketRegime,
    rangePosition,
    structureState,
    confidenceBand,
    reasonCodes,
    explainability,
    components,
    perTimeframe: snaps,
    summaryExplanation,
  };
}
