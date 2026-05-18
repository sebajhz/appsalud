import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";
import {
  normalizeOfficialOutcome,
  type OfficialOutcomeClass,
} from "./testea-entry-variant-outcome-reconciliation";

/** Hypothetical variant id for transition audit (E5.13.6.6). */
export type TransitionVariantId = "edge" | "25" | "50" | "75" | "adaptive";

export const DEFAULT_TRANSITION_VARIANTS: TransitionVariantId[] = [
  "edge",
  "25",
  "adaptive",
];

export const ALL_TRANSITION_VARIANTS: TransitionVariantId[] = [
  "edge",
  "25",
  "50",
  "75",
  "adaptive",
];

/** Variant sim status bucket (hypothetical EVOS). */
export type VariantOutcomeClass =
  | "win"
  | "loss"
  | "ambiguous"
  | "not_filled"
  | "invalid_risk"
  | "unresolved"
  | "expired_open"
  | "other";

export interface TestEaEntryVariantTransitionAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface TransitionMatrixRow {
  bucket: string;
  count: number;
  total_delta_r: number;
  avg_delta_r: number;
}

export interface ImprovementSummary {
  improved_count: number;
  degraded_count: number;
  unchanged_count: number;
  partial_improvement_loss_to_ambiguous_count: number;
  rescued_loss_to_win_count: number;
  rescued_expired_to_win_count: number;
  rescued_ambiguous_to_win_count: number;
  harmed_win_to_loss_count: number;
  harmed_win_to_ambiguous_count: number;
  harmed_win_to_not_filled_count: number;
  official_loss_reduced_count: number;
  official_ambiguous_reduced_count: number;
  variant_new_ambiguous_count: number;
}

export interface DeltaRExample {
  trade_id: string;
  official_outcome: string;
  variant_status: string;
  official_result_r: number;
  variant_result_r: number;
  delta_r: number;
  variant: TransitionVariantId;
}

export interface DeltaRSummary {
  total_delta_r_vs_official: number;
  average_delta_r_vs_official: number;
  median_delta_r_vs_official: number;
  positive_delta_count: number;
  negative_delta_count: number;
  zero_delta_count: number;
  top_positive_examples: DeltaRExample[];
  top_negative_examples: DeltaRExample[];
  /** Variant not_filled uses 0 R for delta baseline. */
  not_filled_variant_r_assumption: "zero";
}

export interface RiskSanitySummary {
  average_risk_points: number;
  median_risk_points: number;
  p10_risk_points: number;
  p90_risk_points: number;
  average_risk_ratio_vs_50: number;
  median_risk_ratio_vs_50: number;
  p90_risk_ratio_vs_50: number;
  count_risk_ratio_gt_1_5: number;
  count_risk_ratio_gt_2_0: number;
  count_risk_ratio_gt_3_0: number;
  average_tp_distance_points: number | null;
  invalid_risk_count: number;
}

export interface GeometrySanitySummary {
  edge_entry_equals_near_edge_count: number;
  edge_entry_outside_fvg_count: number;
  edge_invalid_risk_count: number;
  average_distance_edge_to_sl_points: number | null;
  average_distance_edge_to_tp_points: number | null;
  edge_win_while_official_not_filled_count: number;
  edge_win_while_official_50_loss_count: number;
  edge_win_while_official_50_ambiguous_count: number;
  extra_fills_vs_50: number;
  additional_wins_vs_50: number;
  additional_losses_vs_50: number;
  additional_ambiguous_vs_50: number;
  total_r_delta_vs_50: number;
  ambiguity_delta_vs_50: number;
}

export interface TransitionAuditExample {
  bucket: string;
  trade_id: string;
  official_outcome: string;
  official_result_r: number | null;
  variant_status: string;
  variant_result_r: number | null;
  official_entry: number | null;
  official_sl: number | null;
  official_tp: number | null;
  variant_entry: number | null;
  variant_sl: number | null;
  variant_tp: number | null;
  variant_risk_points: number | null;
  risk_ratio_vs_50: number | null;
  official_bars_to_fill: number | null;
  official_bars_held: number | null;
  variant_bars_to_fill: number | null;
  variant_bars_to_close: number | null;
  direction?: string | undefined;
  entry_quality_score?: number | null;
  premium_discount_score?: number | null;
  htf_structure_score?: number | null;
  mss_choch_score?: number | null;
}

export interface VariantTransitionAuditResult {
  variant: TransitionVariantId;
  official_counts: Record<string, number>;
  variant_counts: Record<string, number>;
  transition_matrix: TransitionMatrixRow[];
  improvement_summary: ImprovementSummary;
  delta_r_summary: DeltaRSummary;
  risk_sanity: RiskSanitySummary;
  geometry_sanity: GeometrySanitySummary;
  examples: TransitionAuditExample[];
}

export interface TestEaEntryVariantTransitionAuditAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  trade_count: number;
  control_variant: "50";
  variants: VariantTransitionAuditResult[];
  interpretation_flags: string[];
}

export interface TransitionAuditCsvRow {
  bundle: string;
  variant: string;
  bucket: string;
  count: number;
  total_delta_r: number;
  avg_delta_r: number;
  avg_risk_ratio_vs_50: number | null;
  notes: string;
}

const PRICE_EPS = 1e-4;

const VARIANT_SLOT_KEY: Record<
  TransitionVariantId,
  "edge" | "p25" | "p50" | "p75" | "adaptive"
> = {
  edge: "edge",
  "25": "p25",
  "50": "p50",
  "75": "p75",
  adaptive: "adaptive",
};

const OFFICIAL_OUTCOMES: OfficialOutcomeClass[] = [
  "win",
  "loss",
  "ambiguous",
  "expired_unfilled",
  "expired_open",
  "unresolved",
  "invalid_risk",
  "other",
];

const VARIANT_OUTCOMES: VariantOutcomeClass[] = [
  "win",
  "loss",
  "ambiguous",
  "not_filled",
  "invalid_risk",
  "unresolved",
  "expired_open",
  "other",
];

export function normalizeVariantOutcome(
  status: string | undefined,
  invalidRisk?: boolean | undefined,
): VariantOutcomeClass {
  if (invalidRisk === true) return "invalid_risk";
  const s = status?.trim().toLowerCase() ?? "";
  if (s === "win") return "win";
  if (s === "loss") return "loss";
  if (s === "ambiguous") return "ambiguous";
  if (s === "not_filled") return "not_filled";
  if (s === "invalid_risk") return "invalid_risk";
  if (s === "unresolved") return "unresolved";
  if (s === "expired_open") return "expired_open";
  return "other";
}

export function transitionBucketId(
  official: OfficialOutcomeClass,
  variant: VariantOutcomeClass,
): string {
  return `official_${official}_variant_${variant}`;
}

function defaultImportOptions(): ImportBacktestCsvOptions {
  return {
    strategyId: "MZP_TESTEA",
    parameterSetId: "default",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "transition-audit",
    sourceType: "mapazapp_testea_csv",
    datasetSplit: "train",
  };
}

function getVariantSlot(
  trade: BacktestTrade,
  variant: TransitionVariantId,
): EntryVariantOutcomeSimSlot | undefined {
  const evos = trade.entryVariantOutcomeSim;
  if (!evos) return undefined;
  return evos[VARIANT_SLOT_KEY[variant]];
}

function variantResultR(
  variant: VariantOutcomeClass,
  slot: EntryVariantOutcomeSimSlot | undefined,
): number {
  if (variant === "not_filled" || variant === "invalid_risk") return 0;
  const r = slot?.resultR;
  return r != null && Number.isFinite(r) ? r : 0;
}

function officialResultR(trade: BacktestTrade): number {
  return Number.isFinite(trade.resultR) ? trade.resultR : 0;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function riskRatioVs50(
  variantRisk: number | undefined,
  controlRisk: number | undefined,
): number | null {
  if (
    variantRisk == null ||
    controlRisk == null ||
    !Number.isFinite(variantRisk) ||
    !Number.isFinite(controlRisk) ||
    controlRisk <= 0
  ) {
    return null;
  }
  return variantRisk / controlRisk;
}

function tpDistancePoints(
  entry: number | undefined,
  tp: number | undefined,
): number | null {
  if (entry == null || tp == null || !Number.isFinite(entry) || !Number.isFinite(tp)) {
    return null;
  }
  return Math.abs(tp - entry);
}

function isEntryOutsideFvg(
  entry: number | undefined,
  near: number | undefined,
  far: number | undefined,
): boolean {
  if (
    entry == null ||
    near == null ||
    far == null ||
    !Number.isFinite(entry) ||
    !Number.isFinite(near) ||
    !Number.isFinite(far)
  ) {
    return false;
  }
  const lo = Math.min(near, far);
  const hi = Math.max(near, far);
  return entry < lo - PRICE_EPS || entry > hi + PRICE_EPS;
}

function isEntryNearEdge(
  entry: number | undefined,
  near: number | undefined,
): boolean {
  if (entry == null || near == null || !Number.isFinite(entry) || !Number.isFinite(near)) {
    return false;
  }
  return Math.abs(entry - near) <= PRICE_EPS;
}

function emptyImprovementSummary(): ImprovementSummary {
  return {
    improved_count: 0,
    degraded_count: 0,
    unchanged_count: 0,
    partial_improvement_loss_to_ambiguous_count: 0,
    rescued_loss_to_win_count: 0,
    rescued_expired_to_win_count: 0,
    rescued_ambiguous_to_win_count: 0,
    harmed_win_to_loss_count: 0,
    harmed_win_to_ambiguous_count: 0,
    harmed_win_to_not_filled_count: 0,
    official_loss_reduced_count: 0,
    official_ambiguous_reduced_count: 0,
    variant_new_ambiguous_count: 0,
  };
}

function classifyTransition(
  official: OfficialOutcomeClass,
  variant: VariantOutcomeClass,
  imp: ImprovementSummary,
): "improved" | "degraded" | "unchanged" | "partial" | "other" {
  if (official === variant) return "unchanged";
  if (official === "expired_unfilled" && variant === "not_filled") return "unchanged";

  if (official === "loss" && variant === "win") {
    imp.rescued_loss_to_win_count += 1;
    return "improved";
  }
  if (official === "ambiguous" && variant === "win") {
    imp.rescued_ambiguous_to_win_count += 1;
    return "improved";
  }
  if (official === "expired_unfilled" && variant === "win") {
    imp.rescued_expired_to_win_count += 1;
    return "improved";
  }
  if (official === "loss" && variant === "ambiguous") {
    imp.partial_improvement_loss_to_ambiguous_count += 1;
    return "partial";
  }

  if (official === "win" && variant === "loss") {
    imp.harmed_win_to_loss_count += 1;
    return "degraded";
  }
  if (official === "win" && variant === "ambiguous") {
    imp.harmed_win_to_ambiguous_count += 1;
    return "degraded";
  }
  if (official === "win" && variant === "not_filled") {
    imp.harmed_win_to_not_filled_count += 1;
    return "degraded";
  }
  if (official === "expired_unfilled" && variant === "loss") {
    return "degraded";
  }
  if (official === "loss" && variant === "not_filled") {
    return "degraded";
  }

  if (official === "loss" && variant !== "loss") {
    imp.official_loss_reduced_count += 1;
  }
  if (official === "ambiguous" && variant === "win") {
    imp.official_ambiguous_reduced_count += 1;
  }
  if ((official === "win" || official === "loss") && variant === "ambiguous") {
    imp.variant_new_ambiguous_count += 1;
  }

  return "other";
}

function buildExample(
  bucket: string,
  trade: BacktestTrade,
  slot: EntryVariantOutcomeSimSlot | undefined,
  controlSlot: EntryVariantOutcomeSimSlot | undefined,
): TransitionAuditExample {
  return {
    bucket,
    trade_id: String(trade.tradeId),
    official_outcome: trade.outcome ?? "",
    official_result_r: Number.isFinite(trade.resultR) ? trade.resultR : null,
    variant_status: slot?.status ?? "",
    variant_result_r:
      slot?.resultR != null && Number.isFinite(slot.resultR) ? slot.resultR : null,
    official_entry: Number.isFinite(trade.entryPrice) ? trade.entryPrice : null,
    official_sl: trade.sl ?? null,
    official_tp: trade.tp ?? null,
    variant_entry: slot?.entryPrice ?? null,
    variant_sl: slot?.slPrice ?? null,
    variant_tp: slot?.tpPrice ?? null,
    variant_risk_points: slot?.riskPoints ?? null,
    risk_ratio_vs_50: riskRatioVs50(slot?.riskPoints, controlSlot?.riskPoints),
    official_bars_to_fill: trade.barsToFill ?? null,
    official_bars_held: trade.barsHeld ?? null,
    variant_bars_to_fill: slot?.barsToFill ?? null,
    variant_bars_to_close: slot?.barsToClose ?? null,
    direction: trade.direction,
    entry_quality_score: trade.scoreTotal ?? null,
    premium_discount_score: trade.premiumDiscountScore ?? null,
    htf_structure_score: trade.htfStructureScore ?? null,
    mss_choch_score: trade.mssChochScore ?? null,
  };
}

const EXAMPLE_BUCKETS: string[] = [
  "official_loss_variant_win",
  "official_ambiguous_variant_win",
  "official_expired_unfilled_variant_win",
  "official_win_variant_loss",
  "official_win_variant_ambiguous",
  "official_loss_variant_ambiguous",
  "official_win_variant_loss",
];

function analyzeVariant(
  trades: BacktestTrade[],
  variant: TransitionVariantId,
  maxExamples: number,
): VariantTransitionAuditResult {
  const matrixCounts = new Map<string, number>();
  const matrixDeltaR = new Map<string, number>();
  const officialCounts: Record<string, number> = {};
  const variantCounts: Record<string, number> = {};
  const imp = emptyImprovementSummary();

  const riskPoints: number[] = [];
  const riskRatios: number[] = [];
  const tpDistances: number[] = [];
  const deltas: DeltaRExample[] = [];

  const geom: GeometrySanitySummary = {
    edge_entry_equals_near_edge_count: 0,
    edge_entry_outside_fvg_count: 0,
    edge_invalid_risk_count: 0,
    average_distance_edge_to_sl_points: null,
    average_distance_edge_to_tp_points: null,
    edge_win_while_official_not_filled_count: 0,
    edge_win_while_official_50_loss_count: 0,
    edge_win_while_official_50_ambiguous_count: 0,
    extra_fills_vs_50: 0,
    additional_wins_vs_50: 0,
    additional_losses_vs_50: 0,
    additional_ambiguous_vs_50: 0,
    total_r_delta_vs_50: 0,
    ambiguity_delta_vs_50: 0,
  };

  const examplesByBucket = new Map<string, TransitionAuditExample[]>();
  const pushExample = (bucket: string, ex: TransitionAuditExample) => {
    const arr = examplesByBucket.get(bucket) ?? [];
    if (arr.length < maxExamples) {
      arr.push(ex);
      examplesByBucket.set(bucket, arr);
    }
  };

  let edgeSlSum = 0;
  let edgeSlN = 0;
  let edgeTpSum = 0;
  let edgeTpN = 0;

  for (const trade of trades) {
    const official = normalizeOfficialOutcome(trade.outcome);
    officialCounts[official] = (officialCounts[official] ?? 0) + 1;

    const slot = getVariantSlot(trade, variant);
    const vOut = normalizeVariantOutcome(slot?.status, slot?.invalidRisk);
    variantCounts[vOut] = (variantCounts[vOut] ?? 0) + 1;

    const offR = officialResultR(trade);
    const varR = variantResultR(vOut, slot);
    const delta = varR - offR;

    const bucket = transitionBucketId(official, vOut);
    matrixCounts.set(bucket, (matrixCounts.get(bucket) ?? 0) + 1);
    matrixDeltaR.set(bucket, (matrixDeltaR.get(bucket) ?? 0) + delta);

    const cls = classifyTransition(official, vOut, imp);
    if (cls === "improved") imp.improved_count += 1;
    else if (cls === "degraded") imp.degraded_count += 1;
    else if (cls === "unchanged") imp.unchanged_count += 1;

    const controlSlot = getVariantSlot(trade, "50");
    const ex = buildExample(bucket, trade, slot, controlSlot);
    if (EXAMPLE_BUCKETS.includes(bucket)) {
      pushExample(bucket, ex);
    }
    deltas.push({
      trade_id: String(trade.tradeId),
      official_outcome: official,
      variant_status: vOut,
      official_result_r: offR,
      variant_result_r: varR,
      delta_r: delta,
      variant,
    });

    if (slot?.riskPoints != null && Number.isFinite(slot.riskPoints) && slot.riskPoints > 0) {
      riskPoints.push(slot.riskPoints);
    }
    const rr = riskRatioVs50(slot?.riskPoints, controlSlot?.riskPoints);
    if (rr != null) riskRatios.push(rr);
    const tpd = tpDistancePoints(slot?.entryPrice, slot?.tpPrice);
    if (tpd != null) tpDistances.push(tpd);
    if (slot?.invalidRisk === true) geom.edge_invalid_risk_count += 1;

    if (variant === "edge") {
      const entry = slot?.entryPrice ?? trade.entryVariantEdgePrice;
      const near = trade.fvgNearEdgePrice;
      const far = trade.fvgFarEdgePrice;
      if (isEntryNearEdge(entry, near)) geom.edge_entry_equals_near_edge_count += 1;
      if (isEntryOutsideFvg(entry, near, far)) geom.edge_entry_outside_fvg_count += 1;
      if (
        slot?.entryPrice != null &&
        slot.slPrice != null &&
        Number.isFinite(slot.entryPrice) &&
        Number.isFinite(slot.slPrice)
      ) {
        edgeSlSum += Math.abs(slot.entryPrice - slot.slPrice);
        edgeSlN += 1;
      }
      if (
        slot?.entryPrice != null &&
        slot.tpPrice != null &&
        Number.isFinite(slot.entryPrice) &&
        Number.isFinite(slot.tpPrice)
      ) {
        edgeTpSum += Math.abs(slot.tpPrice - slot.entryPrice);
        edgeTpN += 1;
      }
      const p50 = normalizeVariantOutcome(controlSlot?.status, controlSlot?.invalidRisk);
      if (vOut === "win" && (official === "expired_unfilled" || p50 === "not_filled")) {
        geom.edge_win_while_official_not_filled_count += 1;
      }
      if (vOut === "win" && p50 === "loss") geom.edge_win_while_official_50_loss_count += 1;
      if (vOut === "win" && p50 === "ambiguous") {
        geom.edge_win_while_official_50_ambiguous_count += 1;
      }
    }

    if (variant === "25" || variant === "adaptive") {
      const p50Out = normalizeVariantOutcome(controlSlot?.status, controlSlot?.invalidRisk);
      const p50Filled = p50Out !== "not_filled" && p50Out !== "invalid_risk";
      const varFilled = vOut !== "not_filled" && vOut !== "invalid_risk";
      if (varFilled && !p50Filled) geom.extra_fills_vs_50 += 1;
      if (vOut === "win" && p50Out !== "win") geom.additional_wins_vs_50 += 1;
      if (vOut === "loss" && p50Out !== "loss") geom.additional_losses_vs_50 += 1;
      if (vOut === "ambiguous" && p50Out !== "ambiguous") geom.additional_ambiguous_vs_50 += 1;
      geom.total_r_delta_vs_50 += varR - variantResultR(p50Out, controlSlot);
      if (vOut === "ambiguous" && p50Out !== "ambiguous") geom.ambiguity_delta_vs_50 += 1;
      else if (vOut !== "ambiguous" && p50Out === "ambiguous") geom.ambiguity_delta_vs_50 -= 1;
    }
  }

  const sortedRisk = [...riskPoints].sort((a, b) => a - b);
  const sortedRatios = [...riskRatios].sort((a, b) => a - b);
  const deltaValues = deltas.map((d) => d.delta_r);
  const sortedDeltas = [...deltaValues].sort((a, b) => a - b);

  const topPositive = [...deltas]
    .filter((d) => d.delta_r > 0)
    .sort((a, b) => b.delta_r - a.delta_r)
    .slice(0, maxExamples);
  const topNegative = [...deltas]
    .filter((d) => d.delta_r < 0)
    .sort((a, b) => a.delta_r - b.delta_r)
    .slice(0, maxExamples);

  const transition_matrix: TransitionMatrixRow[] = [];
  for (const off of OFFICIAL_OUTCOMES) {
    for (const v of VARIANT_OUTCOMES) {
      const id = transitionBucketId(off, v);
      const count = matrixCounts.get(id) ?? 0;
      if (count > 0) {
        const totalDr = matrixDeltaR.get(id) ?? 0;
        transition_matrix.push({
          bucket: id,
          count,
          total_delta_r: totalDr,
          avg_delta_r: count > 0 ? totalDr / count : 0,
        });
      }
    }
  }
  transition_matrix.sort((a, b) => b.count - a.count);

  const examples: TransitionAuditExample[] = [];
  for (const arr of examplesByBucket.values()) {
    examples.push(...arr);
  }

  return {
    variant,
    official_counts: officialCounts,
    variant_counts: variantCounts,
    transition_matrix,
    improvement_summary: imp,
    delta_r_summary: {
      total_delta_r_vs_official: deltaValues.reduce((s, v) => s + v, 0),
      average_delta_r_vs_official:
        deltaValues.length > 0
          ? deltaValues.reduce((s, v) => s + v, 0) / deltaValues.length
          : 0,
      median_delta_r_vs_official: median(deltaValues),
      positive_delta_count: deltaValues.filter((v) => v > 0).length,
      negative_delta_count: deltaValues.filter((v) => v < 0).length,
      zero_delta_count: deltaValues.filter((v) => v === 0).length,
      top_positive_examples: topPositive,
      top_negative_examples: topNegative,
      not_filled_variant_r_assumption: "zero",
    },
    risk_sanity: {
      average_risk_points:
        riskPoints.length > 0 ? riskPoints.reduce((s, v) => s + v, 0) / riskPoints.length : 0,
      median_risk_points: median(riskPoints),
      p10_risk_points: percentile(sortedRisk, 0.1),
      p90_risk_points: percentile(sortedRisk, 0.9),
      average_risk_ratio_vs_50:
        riskRatios.length > 0 ? riskRatios.reduce((s, v) => s + v, 0) / riskRatios.length : 0,
      median_risk_ratio_vs_50: median(riskRatios),
      p90_risk_ratio_vs_50: percentile(sortedRatios, 0.9),
      count_risk_ratio_gt_1_5: riskRatios.filter((r) => r > 1.5).length,
      count_risk_ratio_gt_2_0: riskRatios.filter((r) => r > 2.0).length,
      count_risk_ratio_gt_3_0: riskRatios.filter((r) => r > 3.0).length,
      average_tp_distance_points:
        tpDistances.length > 0 ? tpDistances.reduce((s, v) => s + v, 0) / tpDistances.length : null,
      invalid_risk_count: variantCounts.invalid_risk ?? 0,
    },
    geometry_sanity: {
      ...geom,
      average_distance_edge_to_sl_points: edgeSlN > 0 ? edgeSlSum / edgeSlN : null,
      average_distance_edge_to_tp_points: edgeTpN > 0 ? edgeTpSum / edgeTpN : null,
    },
    examples,
  };
}

function buildInterpretationFlags(variants: VariantTransitionAuditResult[]): string[] {
  const flags: string[] = [];
  const edge = variants.find((v) => v.variant === "edge");
  const p25 = variants.find((v) => v.variant === "25");
  const p50 = variants.find((v) => v.variant === "50");
  const adaptive = variants.find((v) => v.variant === "adaptive");

  if (edge && p50) {
    if (edge.delta_r_summary.total_delta_r_vs_official > p50.delta_r_summary.total_delta_r_vs_official) {
      flags.push("EDGE_DOMINATES_SINGLE_BUNDLE");
    }
    if (edge.risk_sanity.average_risk_ratio_vs_50 > 1.5) {
      flags.push("EDGE_RISK_DISTANCE_HIGH");
    }
    if (edge.risk_sanity.count_risk_ratio_gt_2_0 > 0) {
      flags.push("EDGE_RISK_RATIO_GT_2");
    }
  }

  if (p25 && p50) {
    if (p25.delta_r_summary.total_delta_r_vs_official > p50.delta_r_summary.total_delta_r_vs_official) {
      flags.push("VARIANT_25_IMPROVES_TOTAL_R_VS_OFFICIAL");
    }
    const amb25 = p25.variant_counts.ambiguous ?? 0;
    const amb50 = p50.variant_counts.ambiguous ?? 0;
    if (amb25 > amb50) flags.push("VARIANT_25_INCREASES_AMBIGUITY");
  }

  if (adaptive && p50) {
    if (
      adaptive.delta_r_summary.total_delta_r_vs_official >
      p50.delta_r_summary.total_delta_r_vs_official
    ) {
      flags.push("VARIANT_ADAPTIVE_IMPROVES_TOTAL_R_VS_OFFICIAL");
    }
    const ambA = adaptive.variant_counts.ambiguous ?? 0;
    const amb50 = p50.variant_counts.ambiguous ?? 0;
    if (ambA > amb50) flags.push("VARIANT_ADAPTIVE_INCREASES_AMBIGUITY");
  }

  if (
    p25 &&
    p50 &&
    p25.delta_r_summary.total_delta_r_vs_official > p50.delta_r_summary.total_delta_r_vs_official &&
    (p25.variant_counts.ambiguous ?? 0) > (p50.variant_counts.ambiguous ?? 0)
  ) {
    flags.push("VARIANT_25_IMPROVES_TOTAL_R_BUT_INCREASES_AMBIGUITY");
  }

  const v75 = variants.find((v) => v.variant === "75");
  if (v75 && (v75.variant_counts.ambiguous ?? 0) > 500) {
    flags.push("VARIANT_75_HIGH_AMBIGUITY");
  }

  return [...new Set(flags)];
}

/**
 * E5.13.6.6 — Transition / sanity audit: official outcome vs hypothetical variant sim (diagnostic).
 */
export function analyzeTestEaEntryVariantTransitionAuditFromTexts(
  input: TestEaEntryVariantTransitionAuditBundleTextInput,
  options?: {
    maxExamples?: number | undefined;
    variants?: TransitionVariantId[] | undefined;
  },
): TestEaEntryVariantTransitionAuditAnalysis {
  const maxExamples = options?.maxExamples ?? 10;
  const variantIds = options?.variants ?? DEFAULT_TRANSITION_VARIANTS;

  const empty: TestEaEntryVariantTransitionAuditAnalysis = {
    ok: false,
    bundleName: input.bundleName,
    errors: [],
    warnings: [],
    trade_count: 0,
    control_variant: "50",
    variants: [],
    interpretation_flags: [],
  };

  let summaryJson: Record<string, unknown>;
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return { ...empty, errors: ["invalid JSON in summaryJsonText"] };
  }

  if (summaryJson["has_entry_variant_outcome_sim_v1_logic"] !== true) {
    return {
      ...empty,
      warnings: [
        "BUNDLE_EVOS_COLUMNS_MISSING: has_entry_variant_outcome_sim_v1_logic is not true — cannot run transition audit.",
      ],
    };
  }

  const imp = importBacktestTradesFromCsv(input.tradesCsvText, defaultImportOptions());
  if (!imp.ok) {
    return {
      ...empty,
      errors: imp.errors.map((e) => e.message),
      warnings: imp.warnings.map((w) => w.message),
    };
  }

  const trades = imp.trades;
  const hasEvos = trades.some((t) => t.entryVariantOutcomeSim?.edge != null);
  if (!hasEvos) {
    return {
      ...empty,
      warnings: [
        "BUNDLE_EVOS_TRADES_MISSING: trades CSV has no entry_variant_*_sim_* columns — cannot audit transitions.",
      ],
    };
  }

  const variants = variantIds.map((v) => analyzeVariant(trades, v, maxExamples));

  return {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    warnings: imp.warnings.map((w) => w.message),
    trade_count: trades.length,
    control_variant: "50",
    variants,
    interpretation_flags: buildInterpretationFlags(variants),
  };
}

export function flattenTransitionAuditCsvRows(
  analysis: TestEaEntryVariantTransitionAuditAnalysis,
): TransitionAuditCsvRow[] {
  const rows: TransitionAuditCsvRow[] = [];
  if (!analysis.ok) return rows;

  for (const v of analysis.variants) {
    const riskSum = v.transition_matrix.reduce((s, r) => s + r.count, 0);
    for (const row of v.transition_matrix) {
      rows.push({
        bundle: analysis.bundleName,
        variant: v.variant,
        bucket: row.bucket,
        count: row.count,
        total_delta_r: row.total_delta_r,
        avg_delta_r: row.avg_delta_r,
        avg_risk_ratio_vs_50: v.risk_sanity.average_risk_ratio_vs_50,
        notes:
          row.bucket.includes("expired_unfilled") && row.bucket.includes("_win")
            ? "fill_model_sensitive"
            : "",
      });
    }
    rows.push({
      bundle: analysis.bundleName,
      variant: v.variant,
      bucket: "_summary_improved",
      count: v.improvement_summary.improved_count,
      total_delta_r: v.delta_r_summary.total_delta_r_vs_official,
      avg_delta_r: v.delta_r_summary.average_delta_r_vs_official,
      avg_risk_ratio_vs_50: v.risk_sanity.average_risk_ratio_vs_50,
      notes: `matrix_rows=${riskSum}`,
    });
  }
  return rows;
}
