import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";

/** Official virtual outcome bucket for cross-tab with variant 50 sim. */
export type OfficialOutcomeClass =
  | "win"
  | "loss"
  | "ambiguous"
  | "expired_unfilled"
  | "expired_open"
  | "unresolved"
  | "invalid_risk"
  | "other";

/** Variant 50 hypothetical sim status bucket. */
export type Variant50OutcomeClass =
  | "win"
  | "loss"
  | "ambiguous"
  | "not_filled"
  | "invalid_risk"
  | "unresolved"
  | "expired_open"
  | "other";

export const RECONCILIATION_CROSS_BUCKET_IDS = [
  "official_win_variant50_win",
  "official_win_variant50_loss",
  "official_win_variant50_ambiguous",
  "official_win_variant50_not_filled",
  "official_loss_variant50_win",
  "official_loss_variant50_loss",
  "official_loss_variant50_ambiguous",
  "official_loss_variant50_not_filled",
  "official_ambiguous_variant50_win",
  "official_ambiguous_variant50_loss",
  "official_ambiguous_variant50_ambiguous",
  "official_ambiguous_variant50_not_filled",
  "official_expired_variant50_not_filled",
  "official_expired_variant50_filled",
  "official_filled_variant50_not_filled",
  "official_not_filled_variant50_filled",
] as const;

export type ReconciliationCrossBucketId = (typeof RECONCILIATION_CROSS_BUCKET_IDS)[number];

export interface TestEaEntryVariantReconcileBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface ReconciliationBucketRow {
  id: ReconciliationCrossBucketId | string;
  count: number;
}

export interface ReconciliationExampleRow {
  bucket: string;
  trade_id: string;
  official_outcome: string;
  official_result_r: number | null;
  variant50_status: string;
  variant50_result_r: number | null;
  official_entry: number | null;
  official_sl: number | null;
  official_tp: number | null;
  variant50_entry: number | null;
  variant50_sl: number | null;
  variant50_tp: number | null;
  official_bars_to_fill: number | null;
  official_bars_held: number | null;
  variant50_bars_to_fill: number | null;
  variant50_bars_to_close: number | null;
  variant50_ambiguous: boolean | null;
  mismatch_reason: string;
}

export interface TestEaEntryVariantReconcileSummary {
  trade_count: number;
  official_win_count: number;
  official_loss_count: number;
  official_ambiguous_count: number;
  official_expired_unfilled_count: number;
  variant50_win_count: number;
  variant50_loss_count: number;
  variant50_ambiguous_count: number;
  variant50_not_filled_count: number;
  outcome_match_count: number;
  mismatch_count: number;
  mismatch_rate: number;
  entry_price_mismatch_count: number;
  sl_price_mismatch_count: number;
  tp_price_mismatch_count: number;
  fill_bar_mismatch_count: number;
  close_bar_mismatch_count: number;
  result_r_mismatch_count: number;
  same_bar_ambiguity_mismatch_count: number;
  invalid_risk_count: number;
  price_mismatch_counts: {
    entry: number;
    sl: number;
    tp: number;
  };
  bar_mismatch_counts: {
    fill: number;
    close: number;
  };
  fill_bar_delta_histogram: Record<string, number>;
  close_bar_delta_histogram: Record<string, number>;
  mismatch_reason_counts: Record<string, number>;
  tp_delta_points_max: number | null;
}

export interface TestEaEntryVariantReconcileBundleAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  summary: TestEaEntryVariantReconcileSummary | null;
  buckets: ReconciliationBucketRow[];
  examples: ReconciliationExampleRow[];
}

const PRICE_EPS = 1e-4;
const R_EPS = 0.001;

export function normalizeOfficialOutcome(outcome: string | undefined): OfficialOutcomeClass {
  const o = outcome?.trim().toLowerCase() ?? "";
  if (o === "win") return "win";
  if (o === "loss") return "loss";
  if (o === "ambiguous") return "ambiguous";
  if (o === "expired_unfilled") return "expired_unfilled";
  if (o === "expired_open") return "expired_open";
  if (o === "unresolved") return "unresolved";
  if (o === "invalid_risk") return "invalid_risk";
  return "other";
}

export function normalizeVariant50Outcome(
  status: string | undefined,
  invalidRisk?: boolean | undefined,
): Variant50OutcomeClass {
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

export function isOfficialFilled(outcome: OfficialOutcomeClass): boolean {
  return (
    outcome === "win" ||
    outcome === "loss" ||
    outcome === "ambiguous" ||
    outcome === "expired_open" ||
    outcome === "unresolved"
  );
}

export function isVariant50Filled(v: Variant50OutcomeClass): boolean {
  return v !== "not_filled" && v !== "invalid_risk";
}

/** Map official × variant50 to documented cross-tab bucket id (primary cell). */
export function resolveCrossBucketId(
  official: OfficialOutcomeClass,
  variant: Variant50OutcomeClass,
): string {
  if (official === "win") {
    if (variant === "win") return "official_win_variant50_win";
    if (variant === "loss") return "official_win_variant50_loss";
    if (variant === "ambiguous") return "official_win_variant50_ambiguous";
    if (variant === "not_filled") return "official_win_variant50_not_filled";
  }
  if (official === "loss") {
    if (variant === "win") return "official_loss_variant50_win";
    if (variant === "loss") return "official_loss_variant50_loss";
    if (variant === "ambiguous") return "official_loss_variant50_ambiguous";
    if (variant === "not_filled") return "official_loss_variant50_not_filled";
  }
  if (official === "ambiguous") {
    if (variant === "win") return "official_ambiguous_variant50_win";
    if (variant === "loss") return "official_ambiguous_variant50_loss";
    if (variant === "ambiguous") return "official_ambiguous_variant50_ambiguous";
    if (variant === "not_filled") return "official_ambiguous_variant50_not_filled";
  }
  if (official === "expired_unfilled") {
    if (variant === "not_filled") return "official_expired_variant50_not_filled";
    if (isVariant50Filled(variant)) return "official_expired_variant50_filled";
  }
  return `official_${official}_variant50_${variant}`;
}

/** Additional fill-alignment buckets (may overlap cross-tab cells). */
export function resolveFillAlignmentBucketIds(
  official: OfficialOutcomeClass,
  variant: Variant50OutcomeClass,
): string[] {
  const extra: string[] = [];
  if (isOfficialFilled(official) && variant === "not_filled") {
    extra.push("official_filled_variant50_not_filled");
  }
  if (official === "expired_unfilled" && isVariant50Filled(variant)) {
    extra.push("official_not_filled_variant50_filled");
  }
  return extra;
}

function pricesMismatch(a: number | undefined, b: number | undefined): boolean {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) > PRICE_EPS;
}

function outcomeParityMatch(official: OfficialOutcomeClass, variant: Variant50OutcomeClass): boolean {
  if (official === "win" && variant === "win") return true;
  if (official === "loss" && variant === "loss") return true;
  if (official === "ambiguous" && variant === "ambiguous") return true;
  if (official === "expired_unfilled" && variant === "not_filled") return true;
  if (official === "expired_open" && variant === "expired_open") return true;
  if (official === "unresolved" && variant === "unresolved") return true;
  return false;
}

function deltaBucket(delta: number): string {
  if (delta === 0) return "0";
  if (delta === -1) return "-1";
  if (delta === 1) return "1";
  if (delta < -1) return "lt_-1";
  return "gt_1";
}

function bumpHistogram(hist: Record<string, number>, key: string): void {
  hist[key] = (hist[key] ?? 0) + 1;
}

function bumpReasonCounts(counts: Record<string, number>, reasons: string[]): void {
  for (const r of reasons) {
    counts[r] = (counts[r] ?? 0) + 1;
  }
}

function variant50Slot(trade: BacktestTrade): EntryVariantOutcomeSimSlot | undefined {
  return trade.entryVariantOutcomeSim?.p50;
}

function buildExample(
  bucket: string,
  trade: BacktestTrade,
  slot: EntryVariantOutcomeSimSlot | undefined,
  reason: string,
): ReconciliationExampleRow {
  return {
    bucket,
    trade_id: String(trade.tradeId),
    official_outcome: trade.outcome ?? "",
    official_result_r: Number.isFinite(trade.resultR) ? trade.resultR : null,
    variant50_status: slot?.status ?? "",
    variant50_result_r:
      slot?.resultR != null && Number.isFinite(slot.resultR) ? slot.resultR : null,
    official_entry: Number.isFinite(trade.entryPrice) ? trade.entryPrice : null,
    official_sl: trade.sl ?? null,
    official_tp: trade.tp ?? null,
    variant50_entry: slot?.entryPrice ?? null,
    variant50_sl: slot?.slPrice ?? null,
    variant50_tp: slot?.tpPrice ?? null,
    official_bars_to_fill: trade.barsToFill ?? null,
    official_bars_held: trade.barsHeld ?? null,
    variant50_bars_to_fill: slot?.barsToFill ?? null,
    variant50_bars_to_close: slot?.barsToClose ?? null,
    variant50_ambiguous: slot?.ambiguous ?? null,
    mismatch_reason: reason,
  };
}

function defaultImportOptions(): ImportBacktestCsvOptions {
  return {
    strategyId: "MZP_TESTEA",
    parameterSetId: "default",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "reconcile",
    sourceType: "mapazapp_testea_csv",
    datasetSplit: "train",
  };
}

/**
 * E5.13.6.1 — Reconcile official virtual outcome vs variant 50/CE simulation per trade (diagnostic).
 */
export function analyzeTestEaEntryVariantReconcileFromTexts(
  input: TestEaEntryVariantReconcileBundleTextInput,
  options?: { maxExamples?: number | undefined },
): TestEaEntryVariantReconcileBundleAnalysis {
  const maxExamples = options?.maxExamples ?? 10;
  const empty: TestEaEntryVariantReconcileBundleAnalysis = {
    ok: false,
    bundleName: input.bundleName,
    errors: [],
    warnings: [],
    summary: null,
    buckets: [],
    examples: [],
  };

  let summaryJson: Record<string, unknown>;
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return { ...empty, errors: ["invalid JSON in summaryJsonText"] };
  }

  const hasLogic = summaryJson["has_entry_variant_outcome_sim_v1_logic"] === true;
  if (!hasLogic) {
    return {
      ...empty,
      ok: false,
      warnings: [
        "BUNDLE_EVOS_COLUMNS_MISSING: has_entry_variant_outcome_sim_v1_logic is not true — cannot reconcile variant 50 simulation.",
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
  const hasEvosCol = trades.some((t) => t.entryVariantOutcomeSim?.p50 != null);
  if (!hasEvosCol) {
    return {
      ...empty,
      ok: false,
      warnings: [
        "BUNDLE_EVOS_TRADES_MISSING: trades CSV has no entry_variant_50_sim_* columns — cannot reconcile.",
      ],
    };
  }

  const bucketCounts = new Map<string, number>();
  const bump = (id: string) => bucketCounts.set(id, (bucketCounts.get(id) ?? 0) + 1);

  const examplesByBucket = new Map<string, ReconciliationExampleRow[]>();
  const pushExample = (bucket: string, ex: ReconciliationExampleRow) => {
    const arr = examplesByBucket.get(bucket) ?? [];
    if (arr.length < maxExamples) {
      arr.push(ex);
      examplesByBucket.set(bucket, arr);
    }
  };

  let officialWin = 0;
  let officialLoss = 0;
  let officialAmb = 0;
  let officialExp = 0;
  let v50Win = 0;
  let v50Loss = 0;
  let v50Amb = 0;
  let v50NotFilled = 0;
  let outcomeMatch = 0;
  let mismatchCount = 0;
  let entryPxMismatch = 0;
  let slMismatch = 0;
  let tpMismatch = 0;
  let fillBarMismatch = 0;
  let closeBarMismatch = 0;
  let resultRMismatch = 0;
  let sameBarAmbMismatch = 0;
  let invalidRiskCount = 0;
  const fillBarDeltaHistogram: Record<string, number> = {};
  const closeBarDeltaHistogram: Record<string, number> = {};
  const mismatchReasonCounts: Record<string, number> = {};
  let tpDeltaPointsMax: number | null = null;

  for (const trade of trades) {
    const official = normalizeOfficialOutcome(trade.outcome);
    const slot = variant50Slot(trade);
    const variant = normalizeVariant50Outcome(slot?.status, slot?.invalidRisk);

    if (official === "win") officialWin += 1;
    else if (official === "loss") officialLoss += 1;
    else if (official === "ambiguous") officialAmb += 1;
    else if (official === "expired_unfilled") officialExp += 1;

    if (variant === "win") v50Win += 1;
    else if (variant === "loss") v50Loss += 1;
    else if (variant === "ambiguous") v50Amb += 1;
    else if (variant === "not_filled") v50NotFilled += 1;
    else if (variant === "invalid_risk") invalidRiskCount += 1;

    const crossId = resolveCrossBucketId(official, variant);
    bump(crossId);
    for (const fillId of resolveFillAlignmentBucketIds(official, variant)) {
      bump(fillId);
    }

    const parity = outcomeParityMatch(official, variant);
    if (parity) outcomeMatch += 1;
    else mismatchCount += 1;

    const reasons: string[] = [];
    if (!parity) reasons.push(`outcome_${official}_vs_${variant}`);

    if (isOfficialFilled(official) && isVariant50Filled(variant)) {
      if (pricesMismatch(trade.entryPrice, slot?.entryPrice)) {
        entryPxMismatch += 1;
        reasons.push("entry_price_mismatch");
      }
      if (pricesMismatch(trade.sl, slot?.slPrice)) {
        slMismatch += 1;
        reasons.push("sl_price_mismatch");
      }
      if (pricesMismatch(trade.tp, slot?.tpPrice)) {
        tpMismatch += 1;
        reasons.push("tp_price_mismatch");
      }
      if (
        trade.tp != null &&
        slot?.tpPrice != null &&
        Number.isFinite(trade.tp) &&
        Number.isFinite(slot.tpPrice)
      ) {
        const tpDelta = Math.abs(trade.tp - slot.tpPrice);
        tpDeltaPointsMax =
          tpDeltaPointsMax == null ? tpDelta : Math.max(tpDeltaPointsMax, tpDelta);
      }
      if (trade.barsToFill != null && slot?.barsToFill != null) {
        const fillDelta = slot.barsToFill - trade.barsToFill;
        bumpHistogram(fillBarDeltaHistogram, deltaBucket(fillDelta));
        if (trade.barsToFill !== slot.barsToFill) {
          fillBarMismatch += 1;
          reasons.push("fill_bar_mismatch");
        }
      }
      if (trade.barsHeld != null && slot?.barsToClose != null) {
        const closeDelta = slot.barsToClose - trade.barsHeld;
        bumpHistogram(closeBarDeltaHistogram, deltaBucket(closeDelta));
        if (trade.barsHeld !== slot.barsToClose) {
          closeBarMismatch += 1;
          reasons.push("close_bar_mismatch");
        }
      }
      const offR = trade.resultR;
      const vR = slot?.resultR;
      if (
        official !== "ambiguous" &&
        variant !== "ambiguous" &&
        vR != null &&
        Number.isFinite(offR) &&
        Number.isFinite(vR) &&
        Math.abs(offR - vR) > R_EPS
      ) {
        resultRMismatch += 1;
        reasons.push("result_r_mismatch");
      }
      const offAmb = official === "ambiguous";
      const vAmb = variant === "ambiguous" || slot?.ambiguous === true;
      if (offAmb !== vAmb) {
        sameBarAmbMismatch += 1;
        reasons.push("same_bar_ambiguity_mismatch");
      }
    }

    if (reasons.length > 0) {
      bumpReasonCounts(mismatchReasonCounts, reasons);
      const ex = buildExample(crossId, trade, slot, reasons.join("|"));
      pushExample(crossId, ex);
      if (reasons.some((r) => r.includes("price") || r.includes("bar") || r.includes("result_r"))) {
        pushExample("diagnostic_geometry", ex);
      }
    } else if (!parity) {
      pushExample(crossId, buildExample(crossId, trade, slot, `outcome_${official}_vs_${variant}`));
    }
  }

  const tradeCount = trades.length;
  const summary: TestEaEntryVariantReconcileSummary = {
    trade_count: tradeCount,
    official_win_count: officialWin,
    official_loss_count: officialLoss,
    official_ambiguous_count: officialAmb,
    official_expired_unfilled_count: officialExp,
    variant50_win_count: v50Win,
    variant50_loss_count: v50Loss,
    variant50_ambiguous_count: v50Amb,
    variant50_not_filled_count: v50NotFilled,
    outcome_match_count: outcomeMatch,
    mismatch_count: mismatchCount,
    mismatch_rate: tradeCount > 0 ? mismatchCount / tradeCount : 0,
    entry_price_mismatch_count: entryPxMismatch,
    sl_price_mismatch_count: slMismatch,
    tp_price_mismatch_count: tpMismatch,
    fill_bar_mismatch_count: fillBarMismatch,
    close_bar_mismatch_count: closeBarMismatch,
    result_r_mismatch_count: resultRMismatch,
    same_bar_ambiguity_mismatch_count: sameBarAmbMismatch,
    invalid_risk_count: invalidRiskCount,
    price_mismatch_counts: {
      entry: entryPxMismatch,
      sl: slMismatch,
      tp: tpMismatch,
    },
    bar_mismatch_counts: {
      fill: fillBarMismatch,
      close: closeBarMismatch,
    },
    fill_bar_delta_histogram: fillBarDeltaHistogram,
    close_bar_delta_histogram: closeBarDeltaHistogram,
    mismatch_reason_counts: mismatchReasonCounts,
    tp_delta_points_max: tpDeltaPointsMax,
  };

  const buckets: ReconciliationBucketRow[] = [...bucketCounts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  const examples: ReconciliationExampleRow[] = [];
  for (const arr of examplesByBucket.values()) {
    examples.push(...arr);
  }

  return {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    warnings: imp.warnings.map((w) => w.message),
    summary,
    buckets,
    examples,
  };
}

export function flattenReconcileBucketsCsvRows(
  analysis: TestEaEntryVariantReconcileBundleAnalysis,
): { bucket: string; count: number }[] {
  return analysis.buckets.map((b) => ({ bucket: b.id, count: b.count }));
}
