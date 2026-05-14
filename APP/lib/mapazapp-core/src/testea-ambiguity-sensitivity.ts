import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestDatasetSplit, BacktestSourceType, BacktestTrade } from "./backtest-types";
import type { BacktestRunId, ParameterSetId, StrategyId } from "./ids";
import { calculateMaxDrawdownR } from "./backtest-metrics";

/** Accounting modes for post-processing TestEA virtual outcomes (E5.6.1). */
export type AmbiguityAccountingMode = "neutral_zero" | "conservative_loss" | "skip_ambiguous";

export const DEFAULT_AMBIGUITY_MODES: AmbiguityAccountingMode[] = ["neutral_zero", "conservative_loss", "skip_ambiguous"];

export interface TestEaAmbiguitySensitivityOptions {
  /** Subset of modes to evaluate; default all three. */
  modes?: AmbiguityAccountingMode[] | undefined;
}

export interface TestEaAmbiguityBundleTextInput {
  /** Human label (folder name or path basename). */
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface TestEaAmbiguitySensitivityRow {
  bundleName: string;
  runId: string;
  campaignId: string | null;
  parameterSetId: string;
  effectiveRunId: string | null;
  fvgMin: number | null;
  tradeCountRaw: number;
  countedTrades: number;
  winCount: number;
  lossCount: number;
  ambiguousCount: number;
  ambiguousRate: number;
  expiredCount: number;
  expiredOpenCount: number;
  unresolvedCount: number;
  invalidRiskCount: number;
  totalR: number;
  averageR: number;
  expectancyR: number;
  winrate: number;
  maxDrawdownR: number;
  tradesPerDay: number | null;
  mode: AmbiguityAccountingMode;
}

export interface TestEaAmbiguityBundleAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  importErrors: { code: string; message: string; row?: number }[];
  importWarnings: { code: string; message: string; row?: number }[];
  rows: TestEaAmbiguitySensitivityRow[];
}

export interface TestEaAmbiguityCampaignAnalysis {
  bundles: TestEaAmbiguityBundleAnalysis[];
  flatRows: TestEaAmbiguitySensitivityRow[];
}

function asRecord(x: unknown): Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
}

function readString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function readNumberOrNull(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractFvgMin(summary: Record<string, unknown>): number | null {
  const opt = asRecord(summary["optimization_parameters"]);
  const fromOpt = readNumberOrNull(opt, "virtual_min_trade_fvg_points");
  if (fromOpt != null) return fromOpt;
  const label = readString(summary, "effective_export_folder_label");
  const m = /_FVG(\d+)_/i.exec(label);
  if (m?.[1]) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function tradeOutcome(t: BacktestTrade): string {
  const o = t.outcome?.trim().toLowerCase() ?? "";
  if (o !== "") return o;
  return "";
}

function tradesPerDayFromTrades(trades: BacktestTrade[]): number | null {
  if (trades.length === 0) return null;
  let minT = Number.POSITIVE_INFINITY;
  let maxT = 0;
  for (const t of trades) {
    const a = Date.parse(t.entryTime);
    const b = Date.parse(t.exitTime);
    if (Number.isFinite(a) && a < minT) minT = a;
    if (Number.isFinite(b) && b > maxT) maxT = b;
  }
  if (!Number.isFinite(minT) || maxT <= minT) return null;
  const days = Math.max(1, (maxT - minT) / 86_400_000);
  return trades.length / days;
}

function adjustedRForMode(
  t: BacktestTrade,
  mode: AmbiguityAccountingMode,
): { includeInEquity: boolean; rForTotals: number; rForEquity: number } {
  const o = tradeOutcome(t);
  const baseR = Number.isFinite(t.resultR) ? t.resultR : 0;

  if (mode === "neutral_zero") {
    return { includeInEquity: true, rForTotals: baseR, rForEquity: baseR };
  }
  if (mode === "conservative_loss") {
    if (o === "ambiguous") {
      return { includeInEquity: true, rForTotals: -1, rForEquity: -1 };
    }
    return { includeInEquity: true, rForTotals: baseR, rForEquity: baseR };
  }
  // skip_ambiguous
  if (o === "ambiguous") {
    return { includeInEquity: false, rForTotals: 0, rForEquity: 0 };
  }
  return { includeInEquity: true, rForTotals: baseR, rForEquity: baseR };
}

function countBucketsFixed(trades: BacktestTrade[], mode: AmbiguityAccountingMode): {
  winCount: number;
  lossCount: number;
  ambiguousCount: number;
  expiredCount: number;
  expiredOpenCount: number;
  unresolvedCount: number;
  invalidRiskCount: number;
} {
  let winCount = 0;
  let lossCount = 0;
  let ambiguousCount = 0;
  let expiredCount = 0;
  let expiredOpenCount = 0;
  let unresolvedCount = 0;
  let invalidRiskCount = 0;

  for (const t of trades) {
    const o = tradeOutcome(t);
    if (o === "ambiguous") {
      ambiguousCount += 1;
      if (mode === "skip_ambiguous") continue;
    }
    if (o === "win") winCount += 1;
    else if (o === "loss") lossCount += 1;
    else if (o === "expired_unfilled") expiredCount += 1;
    else if (o === "expired_open") expiredOpenCount += 1;
    else if (o === "unresolved") unresolvedCount += 1;
    else if (o === "invalid_risk") invalidRiskCount += 1;
    else if (o === "") {
      if (t.resultR > 0) winCount += 1;
      else if (t.resultR < 0) lossCount += 1;
    }
  }
  return { winCount, lossCount, ambiguousCount, expiredCount, expiredOpenCount, unresolvedCount, invalidRiskCount };
}

function buildRowFixed(
  bundleName: string,
  summary: Record<string, unknown>,
  trades: BacktestTrade[],
  mode: AmbiguityAccountingMode,
): TestEaAmbiguitySensitivityRow {
  const tradeCountRaw = trades.length;
  const buckets = countBucketsFixed(trades, mode);
  const ambiguousTotal = buckets.ambiguousCount;
  const ambiguousRate = tradeCountRaw > 0 ? ambiguousTotal / tradeCountRaw : 0;

  let totalR = 0;
  const equityTrades: BacktestTrade[] = [];
  for (const t of trades) {
    const adj = adjustedRForMode(t, mode);
    totalR += adj.rForTotals;
    if (adj.includeInEquity) {
      equityTrades.push({ ...t, resultR: adj.rForEquity });
    }
  }

  const countedTrades = mode === "skip_ambiguous" ? Math.max(0, tradeCountRaw - ambiguousTotal) : tradeCountRaw;

  const expectancyR = countedTrades > 0 ? totalR / countedTrades : 0;
  const averageR = countedTrades > 0 ? totalR / countedTrades : 0;

  const decisive = buckets.winCount + buckets.lossCount;
  const winrate = decisive > 0 ? buckets.winCount / decisive : 0;

  const maxDrawdownR = calculateMaxDrawdownR(equityTrades);

  const runId = readString(summary, "run_id") || "unknown_run";
  const campaignIdRaw = readString(summary, "campaign_id");
  const campaignId = campaignIdRaw.trim() !== "" ? campaignIdRaw : null;
  const parameterSetId = readString(summary, "parameter_set_id") || "unknown_ps";
  const eff = readString(summary, "effective_run_id").trim();
  const effectiveRunId = eff !== "" ? eff : null;

  const tFrom = readString(summary, "tester_from");
  const tTo = readString(summary, "tester_to");
  let tradesPerDay: number | null = null;
  const df = Date.parse(tFrom);
  const dt = Date.parse(tTo);
  if (Number.isFinite(df) && Number.isFinite(dt) && dt > df) {
    const days = Math.max(1, (dt - df) / 86_400_000);
    tradesPerDay = tradeCountRaw / days;
  } else {
    tradesPerDay = tradesPerDayFromTrades(trades);
  }

  return {
    bundleName,
    runId,
    campaignId,
    parameterSetId,
    effectiveRunId,
    fvgMin: extractFvgMin(summary),
    tradeCountRaw,
    countedTrades,
    winCount: buckets.winCount,
    lossCount: buckets.lossCount,
    ambiguousCount: ambiguousTotal,
    ambiguousRate,
    expiredCount: buckets.expiredCount,
    expiredOpenCount: buckets.expiredOpenCount,
    unresolvedCount: buckets.unresolvedCount,
    invalidRiskCount: buckets.invalidRiskCount,
    totalR,
    averageR,
    expectancyR,
    winrate,
    maxDrawdownR,
    tradesPerDay,
    mode,
  };
}

/**
 * Post-process one TestEA bundle from in-memory JSON + trades CSV (no MT5, no disk in this function).
 */
export function analyzeTestEaBundleAmbiguitySensitivityFromTexts(
  input: TestEaAmbiguityBundleTextInput,
  options?: TestEaAmbiguitySensitivityOptions,
): TestEaAmbiguityBundleAnalysis {
  const modes = options?.modes?.length ? options.modes : DEFAULT_AMBIGUITY_MODES;
  const errors: string[] = [];
  let summary: Record<string, unknown>;
  try {
    summary = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      bundleName: input.bundleName,
      errors: ["invalid JSON in summaryJsonText"],
      importErrors: [],
      importWarnings: [],
      rows: [],
    };
  }

  const strategyId = (readString(summary, "strategy_id") || "MZP_TESTEA") as StrategyId;
  const parameterSetId = (readString(summary, "parameter_set_id") || "default") as ParameterSetId;
  const canonicalSymbol = readString(summary, "canonical_symbol") || readString(summary, "symbol") || "XAUUSD";
  const runIdOpt =
    readString(summary, "effective_run_id").trim() || readString(summary, "run_id").trim() || undefined;

  const imp = importBacktestTradesFromCsv(input.tradesCsvText, {
    strategyId,
    parameterSetId,
    canonicalSymbol,
    datasetSplit: "full" as BacktestDatasetSplit,
    sourceType: "mapazapp_testea_csv" as BacktestSourceType,
    runId: runIdOpt as BacktestRunId | undefined,
  });

  if (!imp.ok) {
    for (const e of imp.errors) errors.push(`${e.code}: ${e.message}`);
    return {
      ok: false,
      bundleName: input.bundleName,
      errors,
      importErrors: imp.errors,
      importWarnings: imp.warnings,
      rows: [],
    };
  }

  const rows: TestEaAmbiguitySensitivityRow[] = [];
  for (const m of modes) {
    rows.push(buildRowFixed(input.bundleName, summary, imp.trades, m));
  }

  return {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    importErrors: imp.errors,
    importWarnings: imp.warnings,
    rows,
  };
}

export function analyzeTestEaCampaignAmbiguitySensitivityFromTexts(
  bundles: TestEaAmbiguityBundleTextInput[],
  options?: TestEaAmbiguitySensitivityOptions,
): TestEaAmbiguityCampaignAnalysis {
  const out: TestEaAmbiguityBundleAnalysis[] = [];
  const flatRows: TestEaAmbiguitySensitivityRow[] = [];
  for (const b of bundles) {
    const r = analyzeTestEaBundleAmbiguitySensitivityFromTexts(b, options);
    out.push(r);
    if (r.ok) flatRows.push(...r.rows);
  }
  return { bundles: out, flatRows };
}

export type AmbiguitySensitivitySortKey = "fvg" | "expectancy" | "total_r" | "max_drawdown" | "ambiguous_rate";

export interface SummarizeAmbiguitySensitivityOptions {
  sortBy?: AmbiguitySensitivitySortKey | undefined;
  maxResults?: number | undefined;
}

/** Returns a shallow-sorted copy of rows for reporting. */
export function summarizeAmbiguitySensitivity(
  rows: TestEaAmbiguitySensitivityRow[],
  options?: SummarizeAmbiguitySensitivityOptions,
): TestEaAmbiguitySensitivityRow[] {
  const sortBy = options?.sortBy ?? "fvg";
  const copy = [...rows];
  const cmp = (a: TestEaAmbiguitySensitivityRow, b: TestEaAmbiguitySensitivityRow): number => {
    if (sortBy === "fvg") {
      const fa = a.fvgMin ?? -1;
      const fb = b.fvgMin ?? -1;
      if (fa !== fb) return fa - fb;
    } else if (sortBy === "expectancy") {
      if (a.expectancyR !== b.expectancyR) return b.expectancyR - a.expectancyR;
    } else if (sortBy === "total_r") {
      if (a.totalR !== b.totalR) return b.totalR - a.totalR;
    } else if (sortBy === "max_drawdown") {
      if (a.maxDrawdownR !== b.maxDrawdownR) return b.maxDrawdownR - a.maxDrawdownR;
    } else if (sortBy === "ambiguous_rate") {
      if (a.ambiguousRate !== b.ambiguousRate) return b.ambiguousRate - a.ambiguousRate;
    }
    if (a.bundleName !== b.bundleName) return a.bundleName.localeCompare(b.bundleName);
    const modeOrder = (m: AmbiguityAccountingMode) =>
      m === "neutral_zero" ? 0 : m === "conservative_loss" ? 1 : 2;
    return modeOrder(a.mode) - modeOrder(b.mode);
  };
  copy.sort(cmp);
  const max = options?.maxResults;
  if (max !== undefined && max >= 0) return copy.slice(0, max);
  return copy;
}
