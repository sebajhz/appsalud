import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";

/** E5.13.6 — variant keys as exported in summary JSON rollups. */
export const ENTRY_VARIANT_OUTCOME_SIM_VARIANTS = ["edge", "25", "50", "75", "adaptive"] as const;

export type EntryVariantOutcomeSimVariant = (typeof ENTRY_VARIANT_OUTCOME_SIM_VARIANTS)[number];

export const ENTRY_VARIANT_OUTCOME_SIM_ROLLUP_SUFFIXES = [
  "sim_filled_count",
  "sim_win_count",
  "sim_loss_count",
  "sim_ambiguous_count",
  "sim_not_filled_count",
  "sim_invalid_risk_count",
  "sim_total_r",
  "sim_expectancy_r",
  "sim_winrate",
  "sim_average_risk_points",
] as const;

export type EntryVariantOutcomeSimRollupSuffix = (typeof ENTRY_VARIANT_OUTCOME_SIM_ROLLUP_SUFFIXES)[number];

export interface EntryVariantOutcomeSimVariantRollup {
  variant: EntryVariantOutcomeSimVariant;
  filled_count: number;
  win_count: number;
  loss_count: number;
  ambiguous_count: number;
  not_filled_count: number;
  invalid_risk_count: number;
  total_r: number;
  expectancy_r: number;
  winrate: number;
  average_risk_points: number;
}

export interface TestEaEntryVariantOutcomeSimBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText?: string | undefined;
}

export interface TestEaEntryVariantOutcomeSimBundleAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  has_logic: boolean;
  enabled: boolean | null;
  variants: EntryVariantOutcomeSimVariantRollup[];
  best_variant_by_expectancy: string | null;
  best_variant_by_total_r: string | null;
  lowest_ambiguous_variant: string | null;
  highest_fill_variant: string | null;
  /** Recomputed from trades CSV when sim columns exist (diagnostic cross-check). */
  trade_level_counts?: Partial<Record<EntryVariantOutcomeSimVariant, { filled: number; win: number; loss: number; ambiguous: number; not_filled: number; invalid_risk: number; total_r: number }>> | null;
}

export interface TestEaEntryVariantOutcomeSimCampaignAnalysis {
  bundles: TestEaEntryVariantOutcomeSimBundleAnalysis[];
}

function asRecord(x: unknown): Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
}

function readString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function readBooleanOrNull(obj: Record<string, unknown>, key: string): boolean | null {
  const v = obj[key];
  if (typeof v === "boolean") return v;
  return null;
}

function readNumberOrZero(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function summaryKeyForVariantRollup(
  variant: EntryVariantOutcomeSimVariant,
  suffix: EntryVariantOutcomeSimRollupSuffix,
): string {
  return `entry_variant_${variant}_${suffix}`;
}

export function readVariantRollupFromSummary(
  summary: Record<string, unknown>,
  variant: EntryVariantOutcomeSimVariant,
): EntryVariantOutcomeSimVariantRollup {
  return {
    variant,
    filled_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_filled_count")),
    win_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_win_count")),
    loss_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_loss_count")),
    ambiguous_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_ambiguous_count")),
    not_filled_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_not_filled_count")),
    invalid_risk_count: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_invalid_risk_count")),
    total_r: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_total_r")),
    expectancy_r: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_expectancy_r")),
    winrate: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_winrate")),
    average_risk_points: readNumberOrZero(summary, summaryKeyForVariantRollup(variant, "sim_average_risk_points")),
  };
}

function slotKey(variant: EntryVariantOutcomeSimVariant): keyof NonNullable<BacktestTrade["entryVariantOutcomeSim"]> {
  if (variant === "edge") return "edge";
  if (variant === "25") return "p25";
  if (variant === "50") return "p50";
  if (variant === "75") return "p75";
  return "adaptive";
}

function classifySlot(slot: EntryVariantOutcomeSimSlot | undefined): {
  filled: boolean;
  win: boolean;
  loss: boolean;
  ambiguous: boolean;
  not_filled: boolean;
  invalid_risk: boolean;
  r: number;
} {
  const status = slot?.status?.trim().toLowerCase() ?? "";
  const r = typeof slot?.resultR === "number" && Number.isFinite(slot.resultR) ? slot.resultR : 0;
  if (status === "not_filled") return { filled: false, win: false, loss: false, ambiguous: false, not_filled: true, invalid_risk: false, r: 0 };
  if (status === "invalid_risk" || slot?.invalidRisk === true)
    return { filled: false, win: false, loss: false, ambiguous: false, not_filled: false, invalid_risk: true, r: 0 };
  if (status === "ambiguous" || slot?.ambiguous === true)
    return { filled: true, win: false, loss: false, ambiguous: true, not_filled: false, invalid_risk: false, r };
  if (status === "win") return { filled: true, win: true, loss: false, ambiguous: false, not_filled: false, invalid_risk: false, r };
  if (status === "loss") return { filled: true, win: false, loss: true, ambiguous: false, not_filled: false, invalid_risk: false, r };
  if (status === "unresolved" || status === "expired_open")
    return { filled: true, win: false, loss: false, ambiguous: false, not_filled: false, invalid_risk: false, r };
  if (status !== "") return { filled: true, win: false, loss: false, ambiguous: false, not_filled: false, invalid_risk: false, r };
  return { filled: false, win: false, loss: false, ambiguous: false, not_filled: true, invalid_risk: false, r: 0 };
}

function aggregateFromTrades(trades: BacktestTrade[]): TestEaEntryVariantOutcomeSimBundleAnalysis["trade_level_counts"] {
  const out: NonNullable<TestEaEntryVariantOutcomeSimBundleAnalysis["trade_level_counts"]> = {};
  for (const v of ENTRY_VARIANT_OUTCOME_SIM_VARIANTS) {
    out[v] = { filled: 0, win: 0, loss: 0, ambiguous: 0, not_filled: 0, invalid_risk: 0, total_r: 0 };
  }
  let any = false;
  for (const t of trades) {
    const sim = t.entryVariantOutcomeSim;
    if (!sim) continue;
    any = true;
    for (const v of ENTRY_VARIANT_OUTCOME_SIM_VARIANTS) {
      const slot = sim[slotKey(v)] as EntryVariantOutcomeSimSlot | undefined;
      const c = classifySlot(slot);
      const bucket = out[v]!;
      if (c.filled) bucket.filled += 1;
      if (c.win) bucket.win += 1;
      if (c.loss) bucket.loss += 1;
      if (c.ambiguous) bucket.ambiguous += 1;
      if (c.not_filled) bucket.not_filled += 1;
      if (c.invalid_risk) bucket.invalid_risk += 1;
      if (c.filled && (c.win || c.loss || c.ambiguous)) bucket.total_r += c.r;
    }
  }
  return any ? out : null;
}

/**
 * Read E5.13.6 hypothetical variant outcome simulation rollups from a TestEA summary JSON (in-memory).
 */
export function analyzeTestEaEntryVariantOutcomeSimFromTexts(
  input: TestEaEntryVariantOutcomeSimBundleTextInput,
): TestEaEntryVariantOutcomeSimBundleAnalysis {
  const empty: TestEaEntryVariantOutcomeSimBundleAnalysis = {
    ok: false,
    bundleName: input.bundleName,
    errors: [],
    warnings: [],
    has_logic: false,
    enabled: null,
    variants: [],
    best_variant_by_expectancy: null,
    best_variant_by_total_r: null,
    lowest_ambiguous_variant: null,
    highest_fill_variant: null,
    trade_level_counts: null,
  };

  let summary: Record<string, unknown>;
  try {
    summary = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return { ...empty, errors: ["invalid JSON in summaryJsonText"] };
  }

  const hasLogic = summary["has_entry_variant_outcome_sim_v1_logic"] === true;
  if (!hasLogic) {
    return {
      ...empty,
      ok: true,
      has_logic: false,
      warnings: ["BUNDLE_EVOS_FIELDS_MISSING: has_entry_variant_outcome_sim_v1_logic is not true — skipped variant outcome sim summary."],
    };
  }

  const enabled = readBooleanOrNull(summary, "entry_variant_outcome_sim_enabled");
  const variants = ENTRY_VARIANT_OUTCOME_SIM_VARIANTS.map((v) => readVariantRollupFromSummary(summary, v));

  const analysis: TestEaEntryVariantOutcomeSimBundleAnalysis = {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    warnings: [],
    has_logic: true,
    enabled,
    variants,
    best_variant_by_expectancy: readString(summary, "entry_variant_outcome_sim_best_variant_by_expectancy") || null,
    best_variant_by_total_r: readString(summary, "entry_variant_outcome_sim_best_variant_by_total_r") || null,
    lowest_ambiguous_variant: readString(summary, "entry_variant_outcome_sim_lowest_ambiguous_variant") || null,
    highest_fill_variant: readString(summary, "entry_variant_outcome_sim_highest_fill_variant") || null,
    trade_level_counts: null,
  };

  if (input.tradesCsvText?.trim()) {
    const imp = importBacktestTradesFromCsv(input.tradesCsvText, {
      strategyId: "MZP_TESTEA",
      parameterSetId: "default",
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD",
      accountId: "test",
      sourceType: "mapazapp_testea_csv",
      datasetSplit: "train",
    });
    if (!imp.ok) {
      analysis.warnings.push("TRADES_CSV_IMPORT_FAILED_FOR_EVOS_CROSSCHECK");
    } else {
      analysis.trade_level_counts = aggregateFromTrades(imp.trades);
    }
  }

  return analysis;
}

export function analyzeTestEaEntryVariantOutcomeSimCampaignFromTexts(
  bundles: TestEaEntryVariantOutcomeSimBundleTextInput[],
): TestEaEntryVariantOutcomeSimCampaignAnalysis {
  return {
    bundles: bundles.map((b) => analyzeTestEaEntryVariantOutcomeSimFromTexts(b)),
  };
}

export interface EntryVariantOutcomeSimCompareRow {
  bundleName: string;
  variant: EntryVariantOutcomeSimVariant;
  filled_count: number;
  win_count: number;
  loss_count: number;
  ambiguous_count: number;
  not_filled_count: number;
  invalid_risk_count: number;
  total_r: number;
  expectancy_r: number;
  winrate: number;
  average_risk_points: number;
}

/** Flatten campaign analysis into side-by-side variant rows for CLI/CSV. */
export function flattenEntryVariantOutcomeSimCompareRows(
  campaign: TestEaEntryVariantOutcomeSimCampaignAnalysis,
): EntryVariantOutcomeSimCompareRow[] {
  const rows: EntryVariantOutcomeSimCompareRow[] = [];
  for (const b of campaign.bundles) {
    if (!b.ok || !b.has_logic) continue;
    for (const v of b.variants) {
      rows.push({
        bundleName: b.bundleName,
        variant: v.variant,
        filled_count: v.filled_count,
        win_count: v.win_count,
        loss_count: v.loss_count,
        ambiguous_count: v.ambiguous_count,
        not_filled_count: v.not_filled_count,
        invalid_risk_count: v.invalid_risk_count,
        total_r: v.total_r,
        expectancy_r: v.expectancy_r,
        winrate: v.winrate,
        average_risk_points: v.average_risk_points,
      });
    }
  }
  return rows;
}
