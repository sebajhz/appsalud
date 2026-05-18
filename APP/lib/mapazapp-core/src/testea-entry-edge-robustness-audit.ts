import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";
import {
  normalizeOfficialOutcome,
  type OfficialOutcomeClass,
} from "./testea-entry-variant-outcome-reconciliation";
import {
  normalizeVariantOutcome,
  type VariantOutcomeClass,
} from "./testea-entry-variant-transition-audit";

/** E5.13.6.8 — edge robustness audit (read-only diagnostic). */
export type RobustnessVariantId = "edge" | "25" | "adaptive";

export const DEFAULT_BUFFER_POINTS = [5, 10, 20, 30, 50];
export const DEFAULT_MIN_EFFECTIVE_RR = 1.5;

export interface TestEaEntryEdgeRobustnessAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface EffectiveRrProxy {
  effective_risk_points: number;
  effective_reward_points: number;
  effective_rr: number;
  effective_rr_pass: boolean;
  fragile_by_buffer: boolean;
}

export interface BufferStressSummary {
  buffer_points: number;
  total_edge_trades: number;
  edge_win_count: number;
  edge_loss_count: number;
  edge_ambiguous_count: number;
  edge_unresolved_count: number;
  average_effective_rr: number;
  median_effective_rr: number;
  p10_effective_rr: number;
  pass_effective_rr_count: number;
  fail_effective_rr_count: number;
  edge_wins_failing_effective_rr_count: number;
  rescued_loss_to_win_failing_effective_rr_count: number;
  rescued_expired_to_win_failing_effective_rr_count: number;
  rescued_ambiguous_to_win_failing_effective_rr_count: number;
}

export interface SmallDistanceFragility {
  edge_risk_points_lte_10: number;
  edge_risk_points_lte_20: number;
  edge_risk_points_lte_30: number;
  edge_risk_points_lte_50: number;
  edge_risk_points_lte_100: number;
  edge_tp_distance_points_lte_20: number;
  edge_tp_distance_points_lte_30: number;
  edge_tp_distance_points_lte_50: number;
  edge_win_small_risk_count: number;
  edge_win_small_tp_distance_count: number;
}

export interface SpeedRealismSummary {
  edge_win_bars_to_fill_0_or_1: number;
  edge_win_bars_to_close_0_or_1: number;
  edge_win_fill_and_close_fast_count: number;
  official_expired_to_edge_win_fast_count: number;
  official_ambiguous_to_edge_win_fast_count: number;
  official_loss_to_edge_win_fast_count: number;
}

export interface RiskRatioStressSummary {
  average_risk_ratio_vs_50: number;
  median_risk_ratio_vs_50: number;
  p90_risk_ratio_vs_50: number;
  count_risk_ratio_gt_1_25: number;
  count_risk_ratio_gt_1_5: number;
  count_risk_ratio_gt_2_0: number;
  count_risk_ratio_gt_2_5: number;
  count_risk_ratio_gt_3_0: number;
  edge_wins_ratio_lte_1_25: number;
  edge_wins_ratio_lte_1_5: number;
  edge_wins_ratio_lte_2: number;
  edge_wins_ratio_gt_2: number;
}

export interface TransitionRobustnessBucket {
  bucket: string;
  count: number;
  average_risk_ratio_vs_50: number;
  average_effective_rr_by_buffer: Record<number, number>;
  fail_effective_rr_count_by_buffer: Record<number, number>;
  average_bars_to_fill: number;
  average_bars_to_close: number;
  fast_fill_close_count: number;
}

export interface UnresolvedEdgeAudit {
  count: number;
  official_outcome_distribution: Record<string, number>;
  average_risk_points: number;
  average_risk_ratio_vs_50: number;
  bars_to_fill_distribution: Record<string, number>;
  mostly_official_wins: boolean;
  mostly_official_expired: boolean;
  notes: string;
}

export interface VariantRobustnessLens {
  variant: RobustnessVariantId;
  average_effective_rr_by_buffer: Record<number, number>;
  fail_effective_rr_count_by_buffer: Record<number, number>;
  ambiguity_count: number;
  ambiguity_delta_vs_50: number;
  total_delta_r_vs_50: number;
  average_risk_ratio_vs_50: number;
  robustness_interpretation: string;
}

export interface EdgeSummary {
  improved_count: number;
  degraded_count: number;
  unchanged_count: number;
  rescued_loss_to_win_count: number;
  rescued_expired_to_win_count: number;
  rescued_ambiguous_to_win_count: number;
  harmed_win_to_loss_count: number;
  harmed_win_to_ambiguous_count: number;
  total_delta_r_vs_official: number;
  average_delta_r_vs_official: number;
  average_risk_points: number;
  median_risk_points: number;
  edge_unresolved_count: number;
}

export interface RobustnessAuditExample {
  category: string;
  trade_id: string;
  official_outcome: string;
  official_result_r: number | null;
  edge_status: string;
  edge_result_r: number | null;
  official_entry: number | null;
  official_sl: number | null;
  official_tp: number | null;
  edge_entry: number | null;
  edge_sl: number | null;
  edge_tp: number | null;
  edge_risk_points: number | null;
  edge_tp_distance_points: number | null;
  risk_ratio_vs_50: number | null;
  effective_rr_by_buffer: Record<number, number>;
  edge_bars_to_fill: number | null;
  edge_bars_to_close: number | null;
  direction?: string | undefined;
  entry_quality_score?: number | null;
  premium_discount_score?: number | null;
  htf_structure_score?: number | null;
  mss_choch_score?: number | null;
}

export interface TestEaEntryEdgeRobustnessAuditAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  trade_count: number;
  control_variant: "50";
  edge_summary: EdgeSummary;
  buffer_stress: BufferStressSummary[];
  small_distance_fragility: SmallDistanceFragility;
  speed_realism: SpeedRealismSummary;
  risk_ratio_stress: RiskRatioStressSummary;
  transition_robustness: TransitionRobustnessBucket[];
  unresolved_edge_audit: UnresolvedEdgeAudit;
  variant_comparison: {
    edge: VariantRobustnessLens;
    "25": VariantRobustnessLens;
    adaptive: VariantRobustnessLens;
  };
  interpretation_flags: string[];
  examples: RobustnessAuditExample[];
  proxy_limitation_note: string;
}

export interface RobustnessAuditCsvRow {
  bundle: string;
  section: string;
  bucket: string;
  variant: string;
  buffer_points: number | "";
  count: number;
  average_effective_rr: number | "";
  fail_count: number | "";
  average_risk_ratio_vs_50: number | "";
  notes: string;
}

const PRICE_EPS = 1e-9;

const TRANSITION_BUCKETS: string[] = [
  "official_loss_variant_win",
  "official_ambiguous_variant_win",
  "official_expired_unfilled_variant_win",
  "official_win_variant_loss",
  "official_win_variant_ambiguous",
  "official_win_variant_unresolved",
];

const EXAMPLE_CATEGORIES = [
  "edge_win_failing_effective_rr",
  "official_loss_edge_win_fragile",
  "official_expired_edge_win_fragile_fast",
  "official_ambiguous_edge_win_fragile_fast",
  "official_win_edge_loss",
  "edge_unresolved",
] as const;

type ExampleCategory = (typeof EXAMPLE_CATEGORIES)[number];

interface TradeEdgeContext {
  trade: BacktestTrade;
  official: OfficialOutcomeClass;
  edgeOut: VariantOutcomeClass;
  edgeSlot: EntryVariantOutcomeSimSlot;
  controlSlot: EntryVariantOutcomeSimSlot | undefined;
  riskPoints: number;
  tpDistancePoints: number | null;
  riskRatioVs50: number | null;
  bucket: string;
  officialR: number;
  edgeR: number;
}

function defaultImportOptions(): ImportBacktestCsvOptions {
  return {
    strategyId: "MZP_TESTEA",
    parameterSetId: "default",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "edge-robustness-audit",
    sourceType: "mapazapp_testea_csv",
    datasetSplit: "train",
  };
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

/** TP distance in same units as exported risk_points (scaled by SL geometry). */
export function computeTpDistancePoints(
  entry: number | undefined,
  sl: number | undefined,
  tp: number | undefined,
  riskPoints: number | undefined,
): number | null {
  if (
    entry == null ||
    sl == null ||
    tp == null ||
    riskPoints == null ||
    !Number.isFinite(entry) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(tp) ||
    !Number.isFinite(riskPoints) ||
    riskPoints <= 0
  ) {
    return null;
  }
  const slDist = Math.abs(entry - sl);
  if (slDist <= PRICE_EPS) return null;
  const tpDist = Math.abs(tp - entry);
  return (tpDist / slDist) * riskPoints;
}

/** Conservative buffer/spread proxy — not bar-by-bar re-simulation. */
export function computeEffectiveRrProxy(
  riskPoints: number,
  tpDistancePoints: number,
  bufferPoints: number,
  minEffectiveRr: number,
): EffectiveRrProxy {
  const effectiveRiskPoints = riskPoints + bufferPoints;
  const effectiveRewardPoints = Math.max(tpDistancePoints - bufferPoints, 0);
  const effectiveRr =
    effectiveRiskPoints > 0 ? effectiveRewardPoints / effectiveRiskPoints : 0;
  const effectiveRrPass = effectiveRr >= minEffectiveRr;
  return {
    effective_risk_points: effectiveRiskPoints,
    effective_reward_points: effectiveRewardPoints,
    effective_rr: effectiveRr,
    effective_rr_pass: effectiveRrPass,
    fragile_by_buffer: !effectiveRrPass,
  };
}

function transitionBucket(official: OfficialOutcomeClass, variant: VariantOutcomeClass): string {
  return `official_${official}_variant_${variant}`;
}

function isFastFill(barsToFill: number | undefined): boolean {
  return barsToFill != null && Number.isFinite(barsToFill) && barsToFill <= 1;
}

function isFastClose(barsToClose: number | undefined): boolean {
  return barsToClose != null && Number.isFinite(barsToClose) && barsToClose <= 1;
}

/** Per-trade: edge fill and close both within 0–1 bars (E5.13.6.8). */
export function isFastFillAndClose(
  barsToFill: number | undefined,
  barsToClose: number | undefined,
): boolean {
  return isFastFill(barsToFill) && isFastClose(barsToClose);
}

function officialResultR(trade: BacktestTrade): number {
  return Number.isFinite(trade.resultR) ? trade.resultR : 0;
}

function variantResultR(variant: VariantOutcomeClass, slot: EntryVariantOutcomeSimSlot): number {
  if (variant === "not_filled" || variant === "invalid_risk") return 0;
  const r = slot.resultR;
  return r != null && Number.isFinite(r) ? r : 0;
}

function getSlot(
  trade: BacktestTrade,
  key: "edge" | "p25" | "p50" | "adaptive",
): EntryVariantOutcomeSimSlot | undefined {
  return trade.entryVariantOutcomeSim?.[key];
}

function buildTradeContexts(trades: BacktestTrade[]): TradeEdgeContext[] {
  const out: TradeEdgeContext[] = [];
  for (const trade of trades) {
    const edgeSlot = getSlot(trade, "edge");
    if (!edgeSlot) continue;
    const risk =
      edgeSlot.riskPoints != null && Number.isFinite(edgeSlot.riskPoints) && edgeSlot.riskPoints > 0
        ? edgeSlot.riskPoints
        : null;
    if (risk == null) continue;

    const official = normalizeOfficialOutcome(trade.outcome);
    const edgeOut = normalizeVariantOutcome(edgeSlot.status, edgeSlot.invalidRisk);
    const controlSlot = getSlot(trade, "p50");
    const tpDist = computeTpDistancePoints(
      edgeSlot.entryPrice,
      edgeSlot.slPrice,
      edgeSlot.tpPrice,
      risk,
    );

    out.push({
      trade,
      official,
      edgeOut,
      edgeSlot,
      controlSlot,
      riskPoints: risk,
      tpDistancePoints: tpDist,
      riskRatioVs50: riskRatioVs50(edgeSlot.riskPoints, controlSlot?.riskPoints),
      bucket: transitionBucket(official, edgeOut),
      officialR: officialResultR(trade),
      edgeR: variantResultR(edgeOut, edgeSlot),
    });
  }
  return out;
}

function computeBufferStress(
  contexts: TradeEdgeContext[],
  bufferPoints: number[],
  minEffectiveRr: number,
): BufferStressSummary[] {
  return bufferPoints.map((buf) => {
    const effectiveRrs: number[] = [];
    let edgeWin = 0;
    let edgeLoss = 0;
    let edgeAmb = 0;
    let edgeUnres = 0;
    let pass = 0;
    let fail = 0;
    let edgeWinsFailing = 0;
    let rescuedLossFailing = 0;
    let rescuedExpiredFailing = 0;
    let rescuedAmbFailing = 0;

    for (const ctx of contexts) {
      const { edgeOut, official, tpDistancePoints, riskPoints } = ctx;
      if (edgeOut === "win") edgeWin += 1;
      else if (edgeOut === "loss") edgeLoss += 1;
      else if (edgeOut === "ambiguous") edgeAmb += 1;
      else if (edgeOut === "unresolved") edgeUnres += 1;

      if (tpDistancePoints == null) continue;
      const proxy = computeEffectiveRrProxy(riskPoints, tpDistancePoints, buf, minEffectiveRr);
      effectiveRrs.push(proxy.effective_rr);
      if (proxy.effective_rr_pass) pass += 1;
      else fail += 1;

      if (edgeOut === "win" && proxy.fragile_by_buffer) edgeWinsFailing += 1;
      if (edgeOut === "win" && proxy.fragile_by_buffer && official === "loss") rescuedLossFailing += 1;
      if (edgeOut === "win" && proxy.fragile_by_buffer && official === "expired_unfilled") {
        rescuedExpiredFailing += 1;
      }
      if (edgeOut === "win" && proxy.fragile_by_buffer && official === "ambiguous") {
        rescuedAmbFailing += 1;
      }
    }

    const sorted = [...effectiveRrs].sort((a, b) => a - b);
    return {
      buffer_points: buf,
      total_edge_trades: contexts.length,
      edge_win_count: edgeWin,
      edge_loss_count: edgeLoss,
      edge_ambiguous_count: edgeAmb,
      edge_unresolved_count: edgeUnres,
      average_effective_rr:
        effectiveRrs.length > 0 ? effectiveRrs.reduce((s, v) => s + v, 0) / effectiveRrs.length : 0,
      median_effective_rr: median(effectiveRrs),
      p10_effective_rr: percentile(sorted, 0.1),
      pass_effective_rr_count: pass,
      fail_effective_rr_count: fail,
      edge_wins_failing_effective_rr_count: edgeWinsFailing,
      rescued_loss_to_win_failing_effective_rr_count: rescuedLossFailing,
      rescued_expired_to_win_failing_effective_rr_count: rescuedExpiredFailing,
      rescued_ambiguous_to_win_failing_effective_rr_count: rescuedAmbFailing,
    };
  });
}

function computeSmallDistanceFragility(contexts: TradeEdgeContext[]): SmallDistanceFragility {
  const f: SmallDistanceFragility = {
    edge_risk_points_lte_10: 0,
    edge_risk_points_lte_20: 0,
    edge_risk_points_lte_30: 0,
    edge_risk_points_lte_50: 0,
    edge_risk_points_lte_100: 0,
    edge_tp_distance_points_lte_20: 0,
    edge_tp_distance_points_lte_30: 0,
    edge_tp_distance_points_lte_50: 0,
    edge_win_small_risk_count: 0,
    edge_win_small_tp_distance_count: 0,
  };

  for (const ctx of contexts) {
    const r = ctx.riskPoints;
    if (r <= 10) f.edge_risk_points_lte_10 += 1;
    if (r <= 20) f.edge_risk_points_lte_20 += 1;
    if (r <= 30) f.edge_risk_points_lte_30 += 1;
    if (r <= 50) f.edge_risk_points_lte_50 += 1;
    if (r <= 100) f.edge_risk_points_lte_100 += 1;

    const tpd = ctx.tpDistancePoints;
    if (tpd != null) {
      if (tpd <= 20) f.edge_tp_distance_points_lte_20 += 1;
      if (tpd <= 30) f.edge_tp_distance_points_lte_30 += 1;
      if (tpd <= 50) f.edge_tp_distance_points_lte_50 += 1;
      if (ctx.edgeOut === "win" && tpd <= 50) f.edge_win_small_tp_distance_count += 1;
    }
    if (ctx.edgeOut === "win" && r <= 50) f.edge_win_small_risk_count += 1;
  }
  return f;
}

function computeSpeedRealism(contexts: TradeEdgeContext[]): SpeedRealismSummary {
  const s: SpeedRealismSummary = {
    edge_win_bars_to_fill_0_or_1: 0,
    edge_win_bars_to_close_0_or_1: 0,
    edge_win_fill_and_close_fast_count: 0,
    official_expired_to_edge_win_fast_count: 0,
    official_ambiguous_to_edge_win_fast_count: 0,
    official_loss_to_edge_win_fast_count: 0,
  };

  for (const ctx of contexts) {
    if (ctx.edgeOut !== "win") continue;
    const fill = ctx.edgeSlot.barsToFill;
    const close = ctx.edgeSlot.barsToClose;
    const fastFill = isFastFill(fill);
    const fastClose = isFastClose(close);
    if (fastFill) s.edge_win_bars_to_fill_0_or_1 += 1;
    if (fastClose) s.edge_win_bars_to_close_0_or_1 += 1;
    if (isFastFillAndClose(fill, close)) {
      s.edge_win_fill_and_close_fast_count += 1;
      if (ctx.official === "expired_unfilled") s.official_expired_to_edge_win_fast_count += 1;
      if (ctx.official === "ambiguous") s.official_ambiguous_to_edge_win_fast_count += 1;
      if (ctx.official === "loss") s.official_loss_to_edge_win_fast_count += 1;
    }
  }
  return s;
}

function computeRiskRatioStress(contexts: TradeEdgeContext[]): RiskRatioStressSummary {
  const ratios: number[] = [];
  for (const ctx of contexts) {
    if (ctx.riskRatioVs50 != null) ratios.push(ctx.riskRatioVs50);
  }
  const sorted = [...ratios].sort((a, b) => a - b);
  const wins = contexts.filter((c) => c.edgeOut === "win");

  return {
    average_risk_ratio_vs_50:
      ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 0,
    median_risk_ratio_vs_50: median(ratios),
    p90_risk_ratio_vs_50: percentile(sorted, 0.9),
    count_risk_ratio_gt_1_25: ratios.filter((r) => r > 1.25).length,
    count_risk_ratio_gt_1_5: ratios.filter((r) => r > 1.5).length,
    count_risk_ratio_gt_2_0: ratios.filter((r) => r > 2.0).length,
    count_risk_ratio_gt_2_5: ratios.filter((r) => r > 2.5).length,
    count_risk_ratio_gt_3_0: ratios.filter((r) => r > 3.0).length,
    edge_wins_ratio_lte_1_25: wins.filter((c) => (c.riskRatioVs50 ?? 999) <= 1.25).length,
    edge_wins_ratio_lte_1_5: wins.filter((c) => (c.riskRatioVs50 ?? 999) <= 1.5).length,
    edge_wins_ratio_lte_2: wins.filter((c) => (c.riskRatioVs50 ?? 999) <= 2).length,
    edge_wins_ratio_gt_2: wins.filter((c) => (c.riskRatioVs50 ?? 0) > 2).length,
  };
}

function computeTransitionRobustness(
  contexts: TradeEdgeContext[],
  bufferPoints: number[],
  minEffectiveRr: number,
): TransitionRobustnessBucket[] {
  const byBucket = new Map<string, TradeEdgeContext[]>();
  for (const b of TRANSITION_BUCKETS) byBucket.set(b, []);
  for (const ctx of contexts) {
    const arr = byBucket.get(ctx.bucket);
    if (arr) arr.push(ctx);
  }

  return TRANSITION_BUCKETS.map((bucket) => {
    const rows = byBucket.get(bucket) ?? [];
    const ratios = rows.map((r) => r.riskRatioVs50).filter((v): v is number => v != null);
    const fills = rows
      .map((r) => r.edgeSlot.barsToFill)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const closes = rows
      .map((r) => r.edgeSlot.barsToClose)
      .filter((v): v is number => v != null && Number.isFinite(v));

    const avgEffectiveByBuffer: Record<number, number> = {};
    const failByBuffer: Record<number, number> = {};

    const fastFillClose = rows.filter((ctx) =>
      isFastFillAndClose(ctx.edgeSlot.barsToFill, ctx.edgeSlot.barsToClose),
    ).length;

    for (const buf of bufferPoints) {
      const eff: number[] = [];
      let fail = 0;
      for (const ctx of rows) {
        if (ctx.tpDistancePoints == null) continue;
        const proxy = computeEffectiveRrProxy(
          ctx.riskPoints,
          ctx.tpDistancePoints,
          buf,
          minEffectiveRr,
        );
        eff.push(proxy.effective_rr);
        if (proxy.fragile_by_buffer) fail += 1;
      }
      avgEffectiveByBuffer[buf] =
        eff.length > 0 ? eff.reduce((s, v) => s + v, 0) / eff.length : 0;
      failByBuffer[buf] = fail;
    }

    return {
      bucket,
      count: rows.length,
      average_risk_ratio_vs_50:
        ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 0,
      average_effective_rr_by_buffer: avgEffectiveByBuffer,
      fail_effective_rr_count_by_buffer: failByBuffer,
      average_bars_to_fill:
        fills.length > 0 ? fills.reduce((s, v) => s + v, 0) / fills.length : 0,
      average_bars_to_close:
        closes.length > 0 ? closes.reduce((s, v) => s + v, 0) / closes.length : 0,
      fast_fill_close_count: fastFillClose,
    };
  }).filter((b) => b.count > 0);
}

function computeUnresolvedAudit(contexts: TradeEdgeContext[]): UnresolvedEdgeAudit {
  const unresolved = contexts.filter((c) => c.edgeOut === "unresolved");
  const officialDist: Record<string, number> = {};
  const fillDist: Record<string, number> = {};
  const risks: number[] = [];
  const ratios: number[] = [];

  for (const ctx of unresolved) {
    officialDist[ctx.official] = (officialDist[ctx.official] ?? 0) + 1;
    const fill = ctx.edgeSlot.barsToFill;
    const key =
      fill == null || !Number.isFinite(fill)
        ? "unknown"
        : fill <= 1
          ? "0_1"
          : fill <= 5
            ? "2_5"
            : "6_plus";
    fillDist[key] = (fillDist[key] ?? 0) + 1;
    risks.push(ctx.riskPoints);
    if (ctx.riskRatioVs50 != null) ratios.push(ctx.riskRatioVs50);
  }

  const winCount = officialDist.win ?? 0;
  const expiredCount =
    (officialDist.expired_unfilled ?? 0) + (officialDist.expired_open ?? 0);

  return {
    count: unresolved.length,
    official_outcome_distribution: officialDist,
    average_risk_points: risks.length > 0 ? risks.reduce((s, v) => s + v, 0) / risks.length : 0,
    average_risk_ratio_vs_50:
      ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 0,
    bars_to_fill_distribution: fillDist,
    mostly_official_wins: unresolved.length > 0 && winCount > unresolved.length / 2,
    mostly_official_expired: unresolved.length > 0 && expiredCount > unresolved.length / 2,
    notes:
      unresolved.length === 0
        ? "no unresolved edge trades"
        : "diagnostic only — unresolved sim status, not live order state",
  };
}

function computeEdgeSummary(contexts: TradeEdgeContext[]): EdgeSummary {
  const risks = contexts.map((c) => c.riskPoints);
  let improved = 0;
  let degraded = 0;
  let unchanged = 0;
  let rescuedLoss = 0;
  let rescuedExpired = 0;
  let rescuedAmb = 0;
  let harmedLoss = 0;
  let harmedAmb = 0;
  let deltaSum = 0;
  let unresolved = 0;

  for (const ctx of contexts) {
    const d = ctx.edgeR - ctx.officialR;
    deltaSum += d;
    if (ctx.edgeOut === "unresolved") unresolved += 1;

    if (ctx.official === ctx.edgeOut || (ctx.official === "expired_unfilled" && ctx.edgeOut === "not_filled")) {
      unchanged += 1;
    } else if (ctx.official === "loss" && ctx.edgeOut === "win") {
      improved += 1;
      rescuedLoss += 1;
    } else if (ctx.official === "ambiguous" && ctx.edgeOut === "win") {
      improved += 1;
      rescuedAmb += 1;
    } else if (ctx.official === "expired_unfilled" && ctx.edgeOut === "win") {
      improved += 1;
      rescuedExpired += 1;
    } else if (ctx.official === "win" && ctx.edgeOut === "loss") {
      degraded += 1;
      harmedLoss += 1;
    } else if (ctx.official === "win" && ctx.edgeOut === "ambiguous") {
      degraded += 1;
      harmedAmb += 1;
    }
  }

  return {
    improved_count: improved,
    degraded_count: degraded,
    unchanged_count: unchanged,
    rescued_loss_to_win_count: rescuedLoss,
    rescued_expired_to_win_count: rescuedExpired,
    rescued_ambiguous_to_win_count: rescuedAmb,
    harmed_win_to_loss_count: harmedLoss,
    harmed_win_to_ambiguous_count: harmedAmb,
    total_delta_r_vs_official: deltaSum,
    average_delta_r_vs_official: contexts.length > 0 ? deltaSum / contexts.length : 0,
    average_risk_points: risks.length > 0 ? risks.reduce((s, v) => s + v, 0) / risks.length : 0,
    median_risk_points: median(risks),
    edge_unresolved_count: unresolved,
  };
}

function computeVariantLens(
  trades: BacktestTrade[],
  variant: RobustnessVariantId,
  bufferPoints: number[],
  minEffectiveRr: number,
): VariantRobustnessLens {
  const slotKey = variant === "edge" ? "edge" : variant === "25" ? "p25" : "adaptive";
  const effByBuf: Record<number, number> = {};
  const failByBuf: Record<number, number> = {};
  const ratios: number[] = [];
  let amb = 0;
  let ambDelta = 0;
  let deltaVs50 = 0;

  for (const buf of bufferPoints) {
    effByBuf[buf] = 0;
    failByBuf[buf] = 0;
  }

  for (const trade of trades) {
    const slot = getSlot(trade, slotKey);
    const p50 = getSlot(trade, "p50");
    if (!slot) continue;
    const vOut = normalizeVariantOutcome(slot.status, slot.invalidRisk);
    const p50Out = normalizeVariantOutcome(p50?.status, p50?.invalidRisk);
    if (vOut === "ambiguous") amb += 1;
    if (vOut === "ambiguous" && p50Out !== "ambiguous") ambDelta += 1;
    else if (vOut !== "ambiguous" && p50Out === "ambiguous") ambDelta -= 1;
    deltaVs50 += variantResultR(vOut, slot) - variantResultR(p50Out, p50 ?? {});

    const risk = slot.riskPoints;
    const rr = riskRatioVs50(risk, p50?.riskPoints);
    if (rr != null) ratios.push(rr);

    const tpd = computeTpDistancePoints(slot.entryPrice, slot.slPrice, slot.tpPrice, risk);
    if (risk == null || !Number.isFinite(risk) || risk <= 0 || tpd == null) continue;

    for (const buf of bufferPoints) {
      const proxy = computeEffectiveRrProxy(risk, tpd, buf, minEffectiveRr);
      effByBuf[buf] = (effByBuf[buf] ?? 0) + proxy.effective_rr;
      if (proxy.fragile_by_buffer) failByBuf[buf] = (failByBuf[buf] ?? 0) + 1;
    }
  }

  const tradeN = trades.filter((t) => getSlot(t, slotKey) != null).length || 1;
  for (const buf of bufferPoints) {
    effByBuf[buf] = (effByBuf[buf] ?? 0) / tradeN;
  }

  let interpretation = "neutral";
  const buf30 = bufferPoints.includes(30) ? 30 : bufferPoints[bufferPoints.length - 1];
  const fail30 = failByBuf[buf30] ?? 0;
  if (fail30 > tradeN * 0.5) interpretation = "buffer_sensitive";
  else if (fail30 < tradeN * 0.2) interpretation = "buffer_resilient";
  if (ambDelta > 50) interpretation += "; raises_ambiguity_vs_50";
  if (deltaVs50 > 0 && fail30 > tradeN * 0.3) interpretation += "; headline_r_gain_with_fragility";

  return {
    variant,
    average_effective_rr_by_buffer: effByBuf,
    fail_effective_rr_count_by_buffer: failByBuf,
    ambiguity_count: amb,
    ambiguity_delta_vs_50: ambDelta,
    total_delta_r_vs_50: deltaVs50,
    average_risk_ratio_vs_50:
      ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 0,
    robustness_interpretation: interpretation,
  };
}

function buildExample(
  category: ExampleCategory,
  ctx: TradeEdgeContext,
  bufferPoints: number[],
  minEffectiveRr: number,
): RobustnessAuditExample {
  const effective_rr_by_buffer: Record<number, number> = {};
  if (ctx.tpDistancePoints != null) {
    for (const buf of bufferPoints) {
      effective_rr_by_buffer[buf] = computeEffectiveRrProxy(
        ctx.riskPoints,
        ctx.tpDistancePoints,
        buf,
        minEffectiveRr,
      ).effective_rr;
    }
  }

  return {
    category,
    trade_id: String(ctx.trade.tradeId),
    official_outcome: ctx.official,
    official_result_r: Number.isFinite(ctx.trade.resultR) ? ctx.trade.resultR : null,
    edge_status: ctx.edgeOut,
    edge_result_r: ctx.edgeSlot.resultR ?? null,
    official_entry: Number.isFinite(ctx.trade.entryPrice) ? ctx.trade.entryPrice : null,
    official_sl: ctx.trade.sl ?? null,
    official_tp: ctx.trade.tp ?? null,
    edge_entry: ctx.edgeSlot.entryPrice ?? null,
    edge_sl: ctx.edgeSlot.slPrice ?? null,
    edge_tp: ctx.edgeSlot.tpPrice ?? null,
    edge_risk_points: ctx.riskPoints,
    edge_tp_distance_points: ctx.tpDistancePoints,
    risk_ratio_vs_50: ctx.riskRatioVs50,
    effective_rr_by_buffer,
    edge_bars_to_fill: ctx.edgeSlot.barsToFill ?? null,
    edge_bars_to_close: ctx.edgeSlot.barsToClose ?? null,
    direction: ctx.trade.direction,
    entry_quality_score: ctx.trade.scoreTotal ?? null,
    premium_discount_score: ctx.trade.premiumDiscountScore ?? null,
    htf_structure_score: ctx.trade.htfStructureScore ?? null,
    mss_choch_score: ctx.trade.mssChochScore ?? null,
  };
}

function collectExamples(
  contexts: TradeEdgeContext[],
  bufferPoints: number[],
  minEffectiveRr: number,
  maxExamples: number,
): RobustnessAuditExample[] {
  const perCat = new Map<ExampleCategory, RobustnessAuditExample[]>();
  const push = (cat: ExampleCategory, ex: RobustnessAuditExample) => {
    const arr = perCat.get(cat) ?? [];
    if (arr.length < maxExamples) {
      arr.push(ex);
      perCat.set(cat, arr);
    }
  };

  const buf30 = bufferPoints.includes(30) ? 30 : bufferPoints[bufferPoints.length - 1]!;

  for (const ctx of contexts) {
    if (ctx.tpDistancePoints == null) continue;
    const proxy30 = computeEffectiveRrProxy(
      ctx.riskPoints,
      ctx.tpDistancePoints,
      buf30,
      minEffectiveRr,
    );

    if (ctx.edgeOut === "win" && proxy30.fragile_by_buffer) {
      push("edge_win_failing_effective_rr", buildExample("edge_win_failing_effective_rr", ctx, bufferPoints, minEffectiveRr));
    }
    if (ctx.bucket === "official_loss_variant_win" && proxy30.fragile_by_buffer) {
      push("official_loss_edge_win_fragile", buildExample("official_loss_edge_win_fragile", ctx, bufferPoints, minEffectiveRr));
    }
    if (
      ctx.bucket === "official_expired_unfilled_variant_win" &&
      proxy30.fragile_by_buffer &&
      isFastFill(ctx.edgeSlot.barsToFill) &&
      isFastClose(ctx.edgeSlot.barsToClose)
    ) {
      push(
        "official_expired_edge_win_fragile_fast",
        buildExample("official_expired_edge_win_fragile_fast", ctx, bufferPoints, minEffectiveRr),
      );
    }
    if (
      ctx.bucket === "official_ambiguous_variant_win" &&
      proxy30.fragile_by_buffer &&
      isFastFill(ctx.edgeSlot.barsToFill) &&
      isFastClose(ctx.edgeSlot.barsToClose)
    ) {
      push(
        "official_ambiguous_edge_win_fragile_fast",
        buildExample("official_ambiguous_edge_win_fragile_fast", ctx, bufferPoints, minEffectiveRr),
      );
    }
    if (ctx.bucket === "official_win_variant_loss") {
      push("official_win_edge_loss", buildExample("official_win_edge_loss", ctx, bufferPoints, minEffectiveRr));
    }
    if (ctx.edgeOut === "unresolved") {
      push("edge_unresolved", buildExample("edge_unresolved", ctx, bufferPoints, minEffectiveRr));
    }
  }

  const examples: RobustnessAuditExample[] = [];
  for (const cat of EXAMPLE_CATEGORIES) {
    examples.push(...(perCat.get(cat) ?? []));
  }
  return examples;
}

function buildInterpretationFlags(
  edgeSummary: EdgeSummary,
  bufferStress: BufferStressSummary[],
  speed: SpeedRealismSummary,
  risk: RiskRatioStressSummary,
  unresolved: UnresolvedEdgeAudit,
  variantComparison: TestEaEntryEdgeRobustnessAuditAnalysis["variant_comparison"],
): string[] {
  const flags: string[] = [];

  if (edgeSummary.total_delta_r_vs_official > 0) flags.push("EDGE_DOMINATES_SINGLE_BUNDLE");
  if (risk.average_risk_ratio_vs_50 > 1.5) flags.push("EDGE_RISK_DISTANCE_HIGH");
  if (risk.count_risk_ratio_gt_2_0 > 0) flags.push("EDGE_RISK_RATIO_GT_2");

  const buf30 = bufferStress.find((b) => b.buffer_points === 30);
  if (buf30 && buf30.total_edge_trades > 0) {
    const failRate = buf30.fail_effective_rr_count / buf30.total_edge_trades;
    if (failRate > 0.5) flags.push("EDGE_BUFFER_SENSITIVE_30PTS");
    if (buf30.edge_wins_failing_effective_rr_count > buf30.edge_win_count * 0.3) {
      flags.push("EDGE_WINS_FRAGILE_AT_30PTS_BUFFER");
    }
    if (buf30.rescued_expired_to_win_failing_effective_rr_count > 100) {
      flags.push("EDGE_EXPIRED_RESCUES_FRAGILE_AT_BUFFER");
    }
  }

  const edgeWins = bufferStress[0]?.edge_win_count ?? 0;
  if (edgeWins > 0 && speed.edge_win_fill_and_close_fast_count > edgeWins * 0.2) {
    flags.push("EDGE_FAST_FILL_CLOSE_HEAVY");
  }
  if (speed.official_expired_to_edge_win_fast_count > 200) {
    flags.push("EDGE_EXPIRED_TO_WIN_FAST_HEAVY");
  }

  if (unresolved.count > 0) flags.push("EDGE_UNRESOLVED_PRESENT");

  const p25 = variantComparison["25"];
  const adaptive = variantComparison.adaptive;
  if (p25.total_delta_r_vs_50 > 0 && p25.ambiguity_delta_vs_50 > 0) {
    flags.push("VARIANT_25_IMPROVES_R_BUT_INCREASES_AMBIGUITY");
  }
  if (adaptive.total_delta_r_vs_50 > 0 && adaptive.ambiguity_delta_vs_50 > 0) {
    flags.push("VARIANT_ADAPTIVE_IMPROVES_R_BUT_INCREASES_AMBIGUITY");
  }

  const edgeFail30 = variantComparison.edge.fail_effective_rr_count_by_buffer[30] ?? 0;
  const p25Fail30 = p25.fail_effective_rr_count_by_buffer[30] ?? 0;
  if (p25Fail30 < edgeFail30 && p25.total_delta_r_vs_50 > 0) {
    flags.push("VARIANT_25_MORE_ROBUST_THAN_EDGE_AT_BUFFER");
  }

  return [...new Set(flags)];
}

const PROXY_LIMITATION_NOTE =
  "Buffer/spread stress uses exported edge risk/TP geometry only — not bar-by-bar OHLC re-simulation. " +
  "Exact buffered outcomes with spread/slippage require MQL5 EVOS path changes or candle-path data. " +
  "This audit is diagnostic only; not a decision gate or live-trading approval.";

/**
 * E5.13.6.8 — Edge entry robustness audit from bundle texts (read-only diagnostic).
 */
export function analyzeTestEaEntryEdgeRobustnessAuditFromTexts(
  input: TestEaEntryEdgeRobustnessAuditBundleTextInput,
  options?: {
    bufferPoints?: number[] | undefined;
    minEffectiveRr?: number | undefined;
    maxExamples?: number | undefined;
  },
): TestEaEntryEdgeRobustnessAuditAnalysis {
  const bufferPoints = options?.bufferPoints ?? DEFAULT_BUFFER_POINTS;
  const minEffectiveRr = options?.minEffectiveRr ?? DEFAULT_MIN_EFFECTIVE_RR;
  const maxExamples = options?.maxExamples ?? 10;

  const emptyBase = {
    bundleName: input.bundleName,
    errors: [] as string[],
    warnings: [] as string[],
    trade_count: 0,
    control_variant: "50" as const,
    edge_summary: {
      improved_count: 0,
      degraded_count: 0,
      unchanged_count: 0,
      rescued_loss_to_win_count: 0,
      rescued_expired_to_win_count: 0,
      rescued_ambiguous_to_win_count: 0,
      harmed_win_to_loss_count: 0,
      harmed_win_to_ambiguous_count: 0,
      total_delta_r_vs_official: 0,
      average_delta_r_vs_official: 0,
      average_risk_points: 0,
      median_risk_points: 0,
      edge_unresolved_count: 0,
    },
    buffer_stress: [] as BufferStressSummary[],
    small_distance_fragility: {
      edge_risk_points_lte_10: 0,
      edge_risk_points_lte_20: 0,
      edge_risk_points_lte_30: 0,
      edge_risk_points_lte_50: 0,
      edge_risk_points_lte_100: 0,
      edge_tp_distance_points_lte_20: 0,
      edge_tp_distance_points_lte_30: 0,
      edge_tp_distance_points_lte_50: 0,
      edge_win_small_risk_count: 0,
      edge_win_small_tp_distance_count: 0,
    },
    speed_realism: {
      edge_win_bars_to_fill_0_or_1: 0,
      edge_win_bars_to_close_0_or_1: 0,
      edge_win_fill_and_close_fast_count: 0,
      official_expired_to_edge_win_fast_count: 0,
      official_ambiguous_to_edge_win_fast_count: 0,
      official_loss_to_edge_win_fast_count: 0,
    },
    risk_ratio_stress: {
      average_risk_ratio_vs_50: 0,
      median_risk_ratio_vs_50: 0,
      p90_risk_ratio_vs_50: 0,
      count_risk_ratio_gt_1_25: 0,
      count_risk_ratio_gt_1_5: 0,
      count_risk_ratio_gt_2_0: 0,
      count_risk_ratio_gt_2_5: 0,
      count_risk_ratio_gt_3_0: 0,
      edge_wins_ratio_lte_1_25: 0,
      edge_wins_ratio_lte_1_5: 0,
      edge_wins_ratio_lte_2: 0,
      edge_wins_ratio_gt_2: 0,
    },
    transition_robustness: [] as TransitionRobustnessBucket[],
    unresolved_edge_audit: {
      count: 0,
      official_outcome_distribution: {},
      average_risk_points: 0,
      average_risk_ratio_vs_50: 0,
      bars_to_fill_distribution: {},
      mostly_official_wins: false,
      mostly_official_expired: false,
      notes: "no data",
    },
    variant_comparison: {
      edge: {
        variant: "edge" as const,
        average_effective_rr_by_buffer: {},
        fail_effective_rr_count_by_buffer: {},
        ambiguity_count: 0,
        ambiguity_delta_vs_50: 0,
        total_delta_r_vs_50: 0,
        average_risk_ratio_vs_50: 0,
        robustness_interpretation: "no data",
      },
      "25": {
        variant: "25" as const,
        average_effective_rr_by_buffer: {},
        fail_effective_rr_count_by_buffer: {},
        ambiguity_count: 0,
        ambiguity_delta_vs_50: 0,
        total_delta_r_vs_50: 0,
        average_risk_ratio_vs_50: 0,
        robustness_interpretation: "no data",
      },
      adaptive: {
        variant: "adaptive" as const,
        average_effective_rr_by_buffer: {},
        fail_effective_rr_count_by_buffer: {},
        ambiguity_count: 0,
        ambiguity_delta_vs_50: 0,
        total_delta_r_vs_50: 0,
        average_risk_ratio_vs_50: 0,
        robustness_interpretation: "no data",
      },
    },
    interpretation_flags: [] as string[],
    examples: [] as RobustnessAuditExample[],
    proxy_limitation_note: PROXY_LIMITATION_NOTE,
  };

  let summaryJson: Record<string, unknown>;
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return { ok: false, ...emptyBase, errors: ["invalid JSON in summaryJsonText"] };
  }

  if (summaryJson["has_entry_variant_outcome_sim_v1_logic"] !== true) {
    return {
      ok: false,
      ...emptyBase,
      warnings: [
        "BUNDLE_EVOS_COLUMNS_MISSING: has_entry_variant_outcome_sim_v1_logic is not true — cannot run edge robustness audit.",
      ],
    };
  }

  const imp = importBacktestTradesFromCsv(input.tradesCsvText, defaultImportOptions());
  if (!imp.ok) {
    return {
      ok: false,
      ...emptyBase,
      errors: imp.errors.map((e) => e.message),
      warnings: imp.warnings.map((w) => w.message),
    };
  }

  const trades = imp.trades;
  const hasEvos = trades.some((t) => t.entryVariantOutcomeSim?.edge != null);
  if (!hasEvos) {
    return {
      ok: false,
      ...emptyBase,
      warnings: [
        "BUNDLE_EVOS_TRADES_MISSING: trades CSV has no entry_variant_edge_sim_* columns — cannot audit edge robustness.",
      ],
    };
  }

  const contexts = buildTradeContexts(trades);
  const edgeSummary = computeEdgeSummary(contexts);
  const buffer_stress = computeBufferStress(contexts, bufferPoints, minEffectiveRr);
  const small_distance_fragility = computeSmallDistanceFragility(contexts);
  const speed_realism = computeSpeedRealism(contexts);
  const risk_ratio_stress = computeRiskRatioStress(contexts);
  const transition_robustness = computeTransitionRobustness(
    contexts,
    bufferPoints,
    minEffectiveRr,
  );
  const unresolved_edge_audit = computeUnresolvedAudit(contexts);
  const variant_comparison = {
    edge: computeVariantLens(trades, "edge", bufferPoints, minEffectiveRr),
    "25": computeVariantLens(trades, "25", bufferPoints, minEffectiveRr),
    adaptive: computeVariantLens(trades, "adaptive", bufferPoints, minEffectiveRr),
  };
  const examples = collectExamples(contexts, bufferPoints, minEffectiveRr, maxExamples);
  const interpretation_flags = buildInterpretationFlags(
    edgeSummary,
    buffer_stress,
    speed_realism,
    risk_ratio_stress,
    unresolved_edge_audit,
    variant_comparison,
  );

  return {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    warnings: imp.warnings.map((w) => w.message),
    trade_count: trades.length,
    control_variant: "50",
    edge_summary: edgeSummary,
    buffer_stress,
    small_distance_fragility,
    speed_realism,
    risk_ratio_stress,
    transition_robustness,
    unresolved_edge_audit,
    variant_comparison,
    interpretation_flags,
    examples,
    proxy_limitation_note: PROXY_LIMITATION_NOTE,
  };
}

export function flattenRobustnessAuditCsvRows(
  analysis: TestEaEntryEdgeRobustnessAuditAnalysis,
): RobustnessAuditCsvRow[] {
  const rows: RobustnessAuditCsvRow[] = [];
  if (!analysis.ok) return rows;

  for (const b of analysis.buffer_stress) {
    rows.push({
      bundle: analysis.bundleName,
      section: "buffer_stress",
      bucket: "all_edge_trades",
      variant: "edge",
      buffer_points: b.buffer_points,
      count: b.total_edge_trades,
      average_effective_rr: b.average_effective_rr,
      fail_count: b.fail_effective_rr_count,
      average_risk_ratio_vs_50: analysis.risk_ratio_stress.average_risk_ratio_vs_50,
      notes: `edge_wins_failing_rr=${b.edge_wins_failing_effective_rr_count}`,
    });
  }

  for (const t of analysis.transition_robustness) {
    for (const [buf, avgRr] of Object.entries(t.average_effective_rr_by_buffer)) {
      rows.push({
        bundle: analysis.bundleName,
        section: "transition_robustness",
        bucket: t.bucket,
        variant: "edge",
        buffer_points: Number(buf),
        count: t.count,
        average_effective_rr: avgRr,
        fail_count: t.fail_effective_rr_count_by_buffer[Number(buf)] ?? 0,
        average_risk_ratio_vs_50: t.average_risk_ratio_vs_50,
        notes: `fast_fill_close=${t.fast_fill_close_count}`,
      });
    }
  }

  const riskBuckets = [
    ["lte_1_25", analysis.risk_ratio_stress.edge_wins_ratio_lte_1_25],
    ["lte_1_5", analysis.risk_ratio_stress.edge_wins_ratio_lte_1_5],
    ["lte_2", analysis.risk_ratio_stress.edge_wins_ratio_lte_2],
    ["gt_2", analysis.risk_ratio_stress.edge_wins_ratio_gt_2],
  ] as const;

  for (const [bucket, count] of riskBuckets) {
    rows.push({
      bundle: analysis.bundleName,
      section: "risk_bucket",
      bucket,
      variant: "edge",
      buffer_points: "",
      count,
      average_effective_rr: "",
      fail_count: "",
      average_risk_ratio_vs_50: analysis.risk_ratio_stress.average_risk_ratio_vs_50,
      notes: "edge_wins_by_risk_ratio_bucket",
    });
  }

  return rows;
}
