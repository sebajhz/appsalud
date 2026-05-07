import type { CandidateTimingMetadata } from "./candidate-timing";
import type { ConfirmationResult } from "./confirmation-detector";
import type { DisplacementResult } from "./displacement";
import type { EntrySlTpModelResult } from "./entry-sl-tp-types";
import { decisionModelReason } from "./decision-model-reasons";
import type {
  DecisionConfidenceBand,
  DecisionExplainabilityItem,
  DecisionHardGateResult,
  DecisionModelInput,
  DecisionModelResult,
  DecisionReasonCode,
  DecisionReasonRef,
  DecisionScoreComponent,
  DecisionSoftScoreResult,
  DecisionVariantClassification,
} from "./decision-model-types";
import type { DecisionModelSettings } from "./decision-model-settings";
import type { RetestResult } from "./retest-detector";
import type { SweepStatus } from "./liquidity-sweep";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { TradePlanAccountGuardInput, TradePlanHardGate } from "./trade-plan-types";
import type { ZoneCandidate } from "./zone-candidate";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { Candle } from "./candle";
import { detectDisplacement } from "./displacement";
import { atrAtIndex } from "./atr";
import type { ToleranceCalibrationResult, ToleranceDimension } from "./tolerance-calibration-types";

function ref(code: DecisionReasonCode): DecisionReasonRef {
  const r = decisionModelReason(code);
  return { code: r.code, message: r.message };
}

function clamp01to100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function avgToleranceScores(tol: ToleranceCalibrationResult, dims: readonly ToleranceDimension[]): number | null {
  const picked: number[] = [];
  for (const d of dims) {
    const r = tol.byDimension[d];
    if (r && !r.reasonCodes.includes("MEASUREMENT_OMITTED")) picked.push(r.score);
  }
  if (!picked.length) return null;
  return picked.reduce((a, b) => a + b, 0) / picked.length;
}

function hasCriticalToleranceInvalid(
  tol: ToleranceCalibrationResult,
  dims: readonly ToleranceDimension[],
): boolean {
  for (const d of dims) {
    const r = tol.byDimension[d];
    if (r && !r.reasonCodes.includes("MEASUREMENT_OMITTED") && r.quality === "invalid") return true;
  }
  return false;
}

function blendComponentWithTolerance(
  baseScore: number,
  baseCodes: DecisionReasonCode[],
  baseExp: string,
  tol: ToleranceCalibrationResult | null | undefined,
  blend: boolean,
  dims: readonly ToleranceDimension[],
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (!blend || !tol) return { score: baseScore, codes: baseCodes, exp: baseExp };
  const avg = avgToleranceScores(tol, dims);
  if (avg == null) return { score: baseScore, codes: baseCodes, exp: baseExp };
  const wT = 0.35;
  const score = Math.round(clamp01to100(baseScore * (1 - wT) + avg * wT));
  const changed = score !== baseScore;
  const codes: DecisionReasonCode[] = changed
    ? [...baseCodes, "TOLERANCE_CALIBRATION_ADJUSTED" as const]
    : baseCodes;
  const exp = changed ? `${baseExp} Tolerance calibration blended (V2-06).` : baseExp;
  return { score, codes, exp };
}

function normalizeWeights(w: DecisionModelSettings["weights"]): DecisionModelSettings["weights"] {
  const sum =
    w.sweepQuality +
    w.displacementQuality +
    w.ifvgQuality +
    w.zoneQuality +
    w.retestQuality +
    w.confirmationQuality +
    w.entrySlTpQuality +
    w.timingQuality +
    w.contextQuality +
    w.spreadVolatilityQuality;
  if (!(sum > 0)) return w;
  const inv = 1 / sum;
  return {
    sweepQuality: w.sweepQuality * inv,
    displacementQuality: w.displacementQuality * inv,
    ifvgQuality: w.ifvgQuality * inv,
    zoneQuality: w.zoneQuality * inv,
    retestQuality: w.retestQuality * inv,
    confirmationQuality: w.confirmationQuality * inv,
    entrySlTpQuality: w.entrySlTpQuality * inv,
    timingQuality: w.timingQuality * inv,
    contextQuality: w.contextQuality * inv,
    spreadVolatilityQuality: w.spreadVolatilityQuality * inv,
  };
}

function mapTradePlanGateToDecisionReason(g: TradePlanHardGate): DecisionReasonCode | null {
  switch (g) {
    case "SYMBOL_PROFILE_MISSING":
      return "SYMBOL_PROFILE_MISSING";
    case "RR_BELOW_MINIMUM":
      return "RR_BELOW_MINIMUM";
    case "SPREAD_NOT_ALLOWED":
    case "SPREAD_ABOVE_MAX":
      return "ACCOUNT_GUARD_BLOCKS";
    case "DAILY_DRAWDOWN_BLOCKED":
    case "MAX_DRAWDOWN_BLOCKED":
    case "MAX_TRADES_REACHED":
    case "NEWS_BLACKOUT":
    case "PROP_FIRM_BLOCKED":
    case "PSYCHOLOGICAL_LOCK":
    case "TRADE_REVIEW_NOT_ALLOWED":
    case "OPERATIONAL_STATUS_BLOCKS":
    case "ACCOUNT_ID_REQUIRED":
      return "ACCOUNT_GUARD_BLOCKS";
    case "APPROVED_PARAMETER_SET_REQUIRED":
      return "REGISTRY_BLOCKS_TRADE_REVIEW";
    default:
      return "ENTRY_SL_TP_INVALID";
  }
}

function registryBlocksTradeReview(
  registry: ParameterSetCompatibilityResult | null | undefined,
): boolean {
  if (registry == null) return false;
  if (!registry.allowTradeReview) return true;
  if (!registry.compatible && registry.blockingReasons.length > 0) return true;
  return false;
}

function accountGuardHardBlock(guard: TradePlanAccountGuardInput | undefined): boolean {
  if (!guard) return false;
  if (guard.allowTradeReview === false) return true;
  if (guard.dailyDrawdownBlocked) return true;
  if (guard.maxDrawdownBlocked) return true;
  if (guard.maxTradesReached) return true;
  if (guard.propFirmBlocked) return true;
  if (guard.newsBlackout) return true;
  if (guard.psychologicalLock) return true;
  if (guard.spreadAllowed === false) return true;
  const op = guard.operationalStatus;
  if (
    op === "BLOCKED_DAILY_DRAWDOWN" ||
    op === "BLOCKED_MAX_DRAWDOWN" ||
    op === "BLOCKED_NEWS" ||
    op === "BLOCKED_MAX_TRADES" ||
    op === "BLOCKED_CONSISTENCY" ||
    op === "BLOCKED_PSYCHOLOGY" ||
    op === "NO_APPROVED_PARAMETER_SET"
  ) {
    return true;
  }
  return false;
}

function scoreSweep(status: SweepStatus | undefined): { score: number; codes: DecisionReasonCode[]; exp: string } {
  switch (status) {
    case "CONFIRMED_SWEEP":
      return { score: 100, codes: ["OK"], exp: "Liquidity sweep confirmed vs pool." };
    case "NEAR_SWEEP":
      return { score: 52, codes: ["OK"], exp: "Near sweep — proximity without full confirmed sweep." };
    case "POSSIBLE_BREAK_RISK":
      return { score: 22, codes: ["OK"], exp: "Possible break risk — deep sweep without timely reclaim." };
    case "NO_SWEEP":
      return { score: 12, codes: ["OK"], exp: "No sweep detected in the search window." };
    default:
      return { score: 10, codes: ["COMPONENT_INSUFFICIENT_INPUT"], exp: "Sweep status unknown — conservative score." };
  }
}

function scoreDisplacement(d: DisplacementResult | null | undefined): {
  score: number;
  codes: DecisionReasonCode[];
  exp: string;
} {
  if (!d || d.direction === "NONE") {
    return {
      score: 28,
      codes: ["COMPONENT_INSUFFICIENT_INPUT"],
      exp: "No directional displacement detected (or insufficient ATR).",
    };
  }
  if (d.quality === "STRONG") return { score: 100, codes: ["OK"], exp: "Displacement strong vs ATR threshold." };
  if (d.quality === "MODERATE") return { score: 74, codes: ["OK"], exp: "Displacement moderate." };
  return { score: 40, codes: ["OK"], exp: "Displacement weak." };
}

function scoreIfvg(
  fvgSizeAtr: number | null | undefined,
  zone: ZoneCandidate | null,
  atr: number | null | undefined,
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (fvgSizeAtr != null && Number.isFinite(fvgSizeAtr) && fvgSizeAtr > 0) {
    const clamped = Math.min(2, Math.max(0.02, fvgSizeAtr));
    const t = (clamped - 0.02) / (2 - 0.02);
    const score = Math.round(40 + t * 55);
    return { score, codes: ["OK"], exp: "IFVG/FVG size vs ATR within tuned band." };
  }
  if (zone && atr != null && atr > 0) {
    const w = Math.abs(zone.zoneHigh - zone.zoneLow) / atr;
    const clamped = Math.min(2.5, Math.max(0.05, w));
    const t = (clamped - 0.05) / (2.5 - 0.05);
    const score = Math.round(45 + t * 50);
    return { score, codes: ["OK"], exp: "Zone width vs ATR used as IFVG quality proxy." };
  }
  return {
    score: 35,
    codes: ["COMPONENT_INSUFFICIENT_INPUT"],
    exp: "Insufficient data for IFVG size — proxy neutral-low.",
  };
}

function scoreZone(zone: ZoneCandidate | null, atr: number | null | undefined): {
  score: number;
  codes: DecisionReasonCode[];
  exp: string;
} {
  if (!zone || atr == null || !(atr > 0)) {
    return { score: 40, codes: ["COMPONENT_INSUFFICIENT_INPUT"], exp: "Zone or ATR missing for width quality." };
  }
  const width = Math.abs(zone.zoneHigh - zone.zoneLow);
  const ratio = width / atr;
  if (ratio < 0.08) return { score: 55, codes: ["OK"], exp: "Zone very tight vs ATR." };
  if (ratio > 2.2) return { score: 58, codes: ["OK"], exp: "Zone very wide vs ATR — fuzzier reaction area." };
  return { score: 88, codes: ["OK"], exp: "Zone width vs ATR in a balanced band." };
}

function scoreRetest(r: RetestResult | null | undefined): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (r?.retested) return { score: 96, codes: ["OK"], exp: "Retest of the zone detected." };
  return { score: 18, codes: ["OK"], exp: "No retest yet (or not supplied)." };
}

function scoreConfirmation(c: ConfirmationResult | null | undefined): {
  score: number;
  codes: DecisionReasonCode[];
  exp: string;
} {
  if (!c) {
    return { score: 25, codes: ["COMPONENT_INSUFFICIENT_INPUT"], exp: "Confirmation result missing." };
  }
  if (!c.confirmed) return { score: 22, codes: ["OK"], exp: "Confirmation not satisfied." };
  if (c.quality === "CLEAR") return { score: 100, codes: ["OK"], exp: "Clear confirmation candle vs ATR." };
  if (c.quality === "MARGINAL") return { score: 68, codes: ["OK"], exp: "Marginal confirmation." };
  return { score: 40, codes: ["OK"], exp: "Confirmation flagged none." };
}

function scoreEntrySlTp(
  m: EntrySlTpModelResult | null,
  minRr: number,
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (!m) {
    return { score: 0, codes: ["ENTRY_SL_TP_MISSING"], exp: "No Entry/SL/TP model output." };
  }
  if (m.status === "insufficient_data") {
    return { score: 5, codes: ["ENTRY_SL_TP_INSUFFICIENT"], exp: "Entry/SL/TP insufficient data." };
  }
  if (m.status === "invalid" || (m.status === "blocked" && m.blockingReasons.length > 0)) {
    const rrBlock = m.blockingReasons.some((b) => b.code === "RR_BELOW_MINIMUM");
    if (rrBlock) return { score: 8, codes: ["RR_BELOW_MINIMUM"], exp: "R:R below minimum in price plan." };
    return { score: 12, codes: ["ENTRY_SL_TP_INVALID"], exp: "Entry/SL/TP blocked or invalid." };
  }
  const rr = m.rr?.rr;
  if (rr == null || !Number.isFinite(rr)) {
    return { score: 20, codes: ["SL_TP_GEOMETRY_INVALID"], exp: "R:R not computable from plan." };
  }
  const headroom = rr - minRr;
  let score = 72;
  if (headroom >= 1) score = 100;
  else if (headroom >= 0.5) score = 92;
  else if (headroom >= 0) score = 82;
  else score = 30;
  const tq = m.targetQuality;
  if (tq === "strong") score = Math.min(100, score + 6);
  if (tq === "marginal") score = Math.max(0, score - 10);
  if (tq === "invalid") score = Math.min(score, 25);
  return { score: Math.round(Math.min(100, Math.max(0, score))), codes: ["OK"], exp: "Entry/SL/TP geometry and R:R quality." };
}

function scoreTiming(
  timing: CandidateTimingMetadata | null | undefined,
  entrySlTp: EntrySlTpModelResult | null,
  settings: DecisionModelSettings,
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  const codes: DecisionReasonCode[] = [];
  if (settings.strictCandidateTiming && (!timing || timing.sourceKind === "missing")) {
    return { score: 0, codes: ["TIMING_LOOKAHEAD_UNSAFE"], exp: "Strict timing mode: missing candidate timing metadata." };
  }
  let base = 70;
  if (timing?.sourceKind === "exact") base = 100;
  else if (timing?.sourceKind === "inferred") base = 78;
  else if (timing?.sourceKind === "missing") base = 44;

  if (entrySlTp?.warningReasons?.length) {
    for (const w of entrySlTp.warningReasons) {
      if (w.code === "TRADE_ALREADY_PAST_TARGET") codes.push("TARGET_ALREADY_PASSED_BLOCKED");
      if (w.code === "TARGET_TOO_CLOSE_TO_PRICE") codes.push("TARGET_TOO_CLOSE_BLOCKED");
      if (w.code === "ENTRY_CHASE_EXCEEDED") codes.push("ENTRY_CHASE_BLOCKED");
    }
    if (codes.length) base = Math.min(base, 55);
  }
  if (entrySlTp?.blockingReasons.some((b) => b.code === "TRADE_ALREADY_PAST_TARGET")) {
    return { score: 0, codes: ["TARGET_ALREADY_PASSED_BLOCKED"], exp: "Target already passed — blocked policy." };
  }
  const exp =
    codes.length > 0
      ? "Timing warnings from Entry/SL/TP model reduce timing quality."
      : "Candidate timing metadata and Entry/SL/TP timing signals.";
  return { score: Math.round(base), codes: codes.length ? codes : ["OK"], exp };
}

function scoreContext(
  explicit: number | null | undefined,
  placeholder: number,
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (explicit != null && Number.isFinite(explicit)) {
    const s = Math.min(100, Math.max(0, explicit));
    return { score: Math.round(s), codes: ["OK"], exp: "Explicit context / HTF quality input (v1)." };
  }
  return {
    score: Math.round(placeholder),
    codes: ["CONTEXT_PLACEHOLDER_NEUTRAL", "CONTEXT_INPUT_MISSING"],
    exp: "HTF/context engine not wired — neutral placeholder score.",
  };
}

function scoreSpreadVol(
  profile: SymbolMarketSpec | null,
  atr: number | null | undefined,
): { score: number; codes: DecisionReasonCode[]; exp: string } {
  if (!profile || atr == null || !(atr > 0)) {
    return { score: 50, codes: ["COMPONENT_INSUFFICIENT_INPUT"], exp: "Spread vs ATR ratio unavailable." };
  }
  const ratio = profile.spreadPrice / atr;
  if (ratio <= 0.05) return { score: 100, codes: ["OK"], exp: "Spread small vs ATR." };
  if (ratio <= 0.12) return { score: 82, codes: ["OK"], exp: "Spread moderate vs ATR." };
  if (ratio <= 0.22) return { score: 58, codes: ["OK"], exp: "Spread elevated vs ATR." };
  return { score: 32, codes: ["OK"], exp: "Spread high vs ATR — execution stress risk." };
}

function confidenceFromTotal(total: number): DecisionConfidenceBand {
  if (total <= 44) return "no_trade";
  if (total <= 59) return "observe";
  if (total <= 74) return "wait";
  if (total <= 84) return "review_candidate";
  return "high_confidence_review_candidate";
}

function classifyVariant(params: {
  hardPass: boolean;
  total: number;
  sweep: SweepStatus | undefined;
  disp: DisplacementResult | null | undefined;
  conf: ConfirmationResult | null | undefined;
  retest: RetestResult | null | undefined;
  settings: DecisionModelSettings;
  tolerance: ToleranceCalibrationResult | null | undefined;
}): DecisionVariantClassification {
  if (!params.hardPass) return "invalid_variant";
  const ti = params.settings.toleranceIntegration;
  if (
    ti?.invalidToleranceInvalidatesVariant &&
    params.tolerance &&
    ti.criticalInvalidDimensions.length > 0 &&
    hasCriticalToleranceInvalid(params.tolerance, ti.criticalInvalidDimensions)
  ) {
    return "invalid_variant";
  }
  if (params.settings.breakRiskInvalidatesVariant && params.sweep === "POSSIBLE_BREAK_RISK") {
    return "invalid_variant";
  }
  if (!params.retest?.retested) return "weak_observe_variant";
  const strongDisp =
    params.disp &&
    params.disp.direction !== "NONE" &&
    (params.disp.quality === "STRONG" || params.disp.quality === "MODERATE");
  const clearConf = params.conf?.confirmed && params.conf.quality === "CLEAR";
  const marginalConf = params.conf?.confirmed && params.conf.quality === "MARGINAL";
  const confirmed = params.sweep === "CONFIRMED_SWEEP";
  const near = params.sweep === "NEAR_SWEEP";
  const br = params.sweep === "POSSIBLE_BREAK_RISK";

  if (confirmed && strongDisp && clearConf && params.total >= 65) return "primary_setup";
  if (br && !params.settings.breakRiskInvalidatesVariant) return "weak_observe_variant";
  if ((near || marginalConf) && params.total >= 58 && (strongDisp || params.total >= 68)) return "accepted_variant";
  if (params.total >= 60 && confirmed) return "accepted_variant";
  if (params.hardPass) return "weak_observe_variant";
  return "invalid_variant";
}

function collectHardGates(input: DecisionModelInput): DecisionHardGateResult {
  const blocking: DecisionReasonRef[] = [];
  const warnings: DecisionReasonRef[] = [];

  const push = (c: DecisionReasonCode) => blocking.push(ref(c));

  if (!input.symbolProfile) push("SYMBOL_PROFILE_MISSING");
  if (!input.zoneCandidate) push("ZONE_MISSING");
  if (input.zoneUsed) push("ZONE_USED");
  if (input.zoneExpired) push("ZONE_EXPIRED");
  if (input.zoneInvalidated) push("ZONE_INVALIDATED");

  if (accountGuardHardBlock(input.accountGuard)) push("ACCOUNT_GUARD_BLOCKS");
  if (registryBlocksTradeReview(input.registryCompatibility)) push("REGISTRY_BLOCKS_TRADE_REVIEW");

  if (input.tradePlanHardGateFailures?.length) {
    for (const g of input.tradePlanHardGateFailures) {
      const c = mapTradePlanGateToDecisionReason(g);
      if (c) blocking.push(ref(c));
    }
  }

  const es = input.entrySlTp;
  if (!es) push("ENTRY_SL_TP_MISSING");
  else if (es.status === "insufficient_data") push("ENTRY_SL_TP_INSUFFICIENT");
  else if (es.status === "invalid") push("ENTRY_SL_TP_INVALID");
  else if (es.status === "observe_only" && es.blockingReasons.some((b) => b.code === "RR_BELOW_MINIMUM")) {
    push("RR_BELOW_MINIMUM");
  } else if (es.status === "blocked") {
    for (const b of es.blockingReasons) {
      if (b.code === "RR_BELOW_MINIMUM") push("RR_BELOW_MINIMUM");
      else if (b.code === "REWARD_SHORTER_THAN_RISK" || b.code === "INVALID_PRICE_GEOMETRY") push("SL_TP_GEOMETRY_INVALID");
      else if (b.code === "TRADE_ALREADY_PAST_TARGET") push("TARGET_ALREADY_PASSED_BLOCKED");
      else if (b.code === "TARGET_TOO_CLOSE_TO_PRICE") push("TARGET_TOO_CLOSE_BLOCKED");
      else if (b.code === "ENTRY_CHASE_EXCEEDED") push("ENTRY_CHASE_BLOCKED");
      else push("ENTRY_SL_TP_INVALID");
    }
  }

  if (es?.rr && input.minRr > 0 && es.rr.rr < input.minRr && es.status !== "observe_only") {
    push("RR_BELOW_MINIMUM");
  }

  if (
    input.settings.strictCandidateTiming &&
    (!input.candidateTiming || input.candidateTiming.sourceKind === "missing")
  ) {
    push("TIMING_LOOKAHEAD_UNSAFE");
  }

  const tolInt = input.settings.toleranceIntegration;
  const tolRes = input.toleranceCalibrationResult;
  if (tolInt?.invalidToleranceAsHardBlock && tolRes && tolInt.criticalInvalidDimensions.length > 0) {
    if (hasCriticalToleranceInvalid(tolRes, tolInt.criticalInvalidDimensions)) push("TOLERANCE_CALIBRATION_INVALID");
  }

  const dedup = new Map<string, DecisionReasonRef>();
  for (const b of blocking) dedup.set(b.code, b);

  return { hardGatePassed: dedup.size === 0, blockingReasons: [...dedup.values()], warningReasons: warnings };
}

export function evaluateDecisionModel(input: DecisionModelInput): DecisionModelResult {
  const weights = normalizeWeights(input.settings.weights);
  const hg = collectHardGates(input);

  const w = weights;
  const zone = input.zoneCandidate;
  const atr = input.confirmationAtr;

  const ti = input.settings.toleranceIntegration;
  const tol = input.toleranceCalibrationResult ?? null;
  const tolBlend = Boolean(ti?.blendToleranceIntoSoftScore && tol);

  const cSweepBase = scoreSweep(input.sweepStatus);
  const cSweep = (() => {
    const b = blendComponentWithTolerance(
      cSweepBase.score,
      cSweepBase.codes,
      cSweepBase.exp,
      tol,
      tolBlend,
      ["liquidity_sweep", "near_sweep", "over_sweep_break_risk"],
    );
    return { score: b.score, codes: b.codes, exp: b.exp };
  })();
  const cDisp = scoreDisplacement(input.displacement);
  const cIfvg = scoreIfvg(input.fvgSizeAtr, zone, atr);
  const cZone = scoreZone(zone, atr);
  const cRetestBase = scoreRetest(input.retest);
  const cRetest = (() => {
    const b = blendComponentWithTolerance(
      cRetestBase.score,
      cRetestBase.codes,
      cRetestBase.exp,
      tol,
      tolBlend,
      ["retest_depth"],
    );
    return { score: b.score, codes: b.codes, exp: b.exp };
  })();
  const cConf = scoreConfirmation(input.confirmation);
  const cEstBase = scoreEntrySlTp(input.entrySlTp, input.minRr);
  const cEst = (() => {
    const b = blendComponentWithTolerance(
      cEstBase.score,
      cEstBase.codes,
      cEstBase.exp,
      tol,
      tolBlend,
      ["sl_buffer", "entry_chase", "target_distance"],
    );
    return { score: b.score, codes: b.codes, exp: b.exp };
  })();
  const cTimBase = scoreTiming(input.candidateTiming, input.entrySlTp, input.settings);
  const cTim = (() => {
    const b = blendComponentWithTolerance(
      cTimBase.score,
      cTimBase.codes,
      cTimBase.exp,
      tol,
      tolBlend,
      ["confirmation_wick", "target_distance", "entry_chase"],
    );
    return { score: b.score, codes: b.codes, exp: b.exp };
  })();
  const cCtx = scoreContext(input.contextQualityScore ?? null, input.settings.contextPlaceholderScore);
  const cSpBase = scoreSpreadVol(input.symbolProfile, atr);
  const cSp = (() => {
    const b = blendComponentWithTolerance(
      cSpBase.score,
      cSpBase.codes,
      cSpBase.exp,
      tol,
      tolBlend,
      ["spread_cost"],
    );
    return { score: b.score, codes: b.codes, exp: b.exp };
  })();

  const mk = (
    id: DecisionScoreComponent["id"],
    label: string,
    src: { score: number; codes: DecisionReasonCode[]; exp: string },
    weight: number,
  ): DecisionScoreComponent => ({
    id,
    score: src.score,
    weight,
    contribution: src.score * weight,
    reasonCodes: src.codes,
    explanationSimple: src.exp,
  });

  const components: DecisionScoreComponent[] = [
    mk("sweepQuality", "Sweep quality", cSweep, w.sweepQuality),
    mk("displacementQuality", "Displacement quality", cDisp, w.displacementQuality),
    mk("ifvgQuality", "IFVG / FVG quality", cIfvg, w.ifvgQuality),
    mk("zoneQuality", "Zone quality", cZone, w.zoneQuality),
    mk("retestQuality", "Retest quality", cRetest, w.retestQuality),
    mk("confirmationQuality", "Confirmation quality", cConf, w.confirmationQuality),
    mk("entrySlTpQuality", "Entry / SL / TP quality", cEst, w.entrySlTpQuality),
    mk("timingQuality", "Timing / anti-lookahead quality", cTim, w.timingQuality),
    mk("contextQuality", "Context / HTF (placeholder)", cCtx, w.contextQuality),
    mk("spreadVolatilityQuality", "Spread vs volatility", cSp, w.spreadVolatilityQuality),
  ];

  let weightedSumRaw = 0;
  for (const c of components) weightedSumRaw += c.contribution;
  const totalScore = Math.round(Math.min(100, Math.max(0, weightedSumRaw)));

  const soft: DecisionSoftScoreResult = {
    totalScore,
    components,
    weightedSumRaw,
  };

  const explainability: DecisionExplainabilityItem[] = components.map((c) => ({
      componentId: c.id,
      label: c.id,
      score: c.score,
      weight: c.weight,
      contribution: c.contribution,
      reasonCodes: c.reasonCodes,
      explanationSimple: c.explanationSimple,
    }));

  const effectiveTotal = hg.hardGatePassed ? totalScore : Math.min(totalScore, 44);
  const confidenceBand = hg.hardGatePassed ? confidenceFromTotal(totalScore) : "no_trade";
  const variant = classifyVariant({
    hardPass: hg.hardGatePassed,
    total: totalScore,
    sweep: input.sweepStatus,
    disp: input.displacement,
    conf: input.confirmation,
    retest: input.retest,
    settings: input.settings,
    tolerance: tol,
  });

  return {
    hardGates: hg,
    softScore: soft,
    confidenceBand,
    variant,
    explainability,
    reviewOnly: true,
    canAutoExecute: false,
    registryMutationAllowed: false,
  };
}

/** Optional TradePlan hard-gate failures from `collectTradePlanHardGateFailures` (same bar as plan). */
export type DecisionModelTradePlanGateInput = {
  tradePlanHardGateFailures?: TradePlanHardGate[];
};

export function buildDisplacementAtBar(
  candles: Candle[],
  barIndex: number,
  atrSeries: (number | null)[],
  displacementSettings: IfvgStrategySettings["displacement"],
): DisplacementResult {
  const i = barIndex;
  if (i < 1 || i >= candles.length) {
    return {
      direction: "NONE",
      quality: "WEAK",
      body: 0,
      range: 0,
      closePosition: null,
      atrThreshold: 0,
    };
  }
  const atr = atrAtIndex(atrSeries, i);
  return detectDisplacement(candles[i]!, candles[i - 1]!, atr, displacementSettings);
}
