/**
 * E5.9 — TestEA Entry Quality Score calibration / distribution (post-process only; no MT5).
 */

import { importBacktestTradesFromCsv } from "./backtest-importer";
import { calculateMaxDrawdownR, calculateTotalR, calculateExpectancyR } from "./backtest-metrics";
import type { BacktestDatasetSplit, BacktestSourceType, BacktestTrade } from "./backtest-types";
import type { BacktestRunId, ParameterSetId, StrategyId } from "./ids";

export const SCORE_CALIBRATION_DIAGNOSTIC_FLAGS = [
  "SCORE_NO_A_B_GRADES",
  "SCORE_RANGE_TOO_NARROW",
  "SCORE_MISSING_COMPONENTS_HIGH",
  "TOP_QUARTILE_OUTPERFORMS",
  "TOP_QUARTILE_DOES_NOT_OUTPERFORM",
  "TOP_QUARTILE_REDUCES_AMBIGUITY",
  "TOP_QUARTILE_DOES_NOT_REDUCE_AMBIGUITY",
] as const;

export type ScoreCalibrationDiagnosticFlag = (typeof SCORE_CALIBRATION_DIAGNOSTIC_FLAGS)[number];

export const SCORE_COMPONENT_COLUMNS = [
  "htf_narrative_score",
  "liquidity_event_score",
  "displacement_fvg_quality_score",
  "entry_confirmation_score",
  "target_quality_score",
  "session_news_spread_score",
  "risk_overtrading_score",
  "ambiguous_risk_score",
] as const;

export type ScoreComponentColumn = (typeof SCORE_COMPONENT_COLUMNS)[number];

export const LIQUIDITY_QUALITY_CALIBRATION_COLUMNS = [
  "liquidity_sweep_quality_score",
  "liquidity_sweep_recency_score",
  "liquidity_sweep_reaction_score",
  "liquidity_sweep_displacement_score",
  "liquidity_sweep_directional_score",
  "liquidity_sweep_distance_score",
] as const;

export type LiquidityQualityCalibrationColumn = (typeof LIQUIDITY_QUALITY_CALIBRATION_COLUMNS)[number];

export const LIQUIDITY_CHAIN_CALIBRATION_COLUMNS = [
  "liquidity_chain_score",
  "liquidity_chain_sweep_to_setup_bars",
  "liquidity_chain_sweep_to_fvg_bars",
  "liquidity_chain_distance_to_fvg_points",
] as const;

export type LiquidityChainCalibrationColumn = (typeof LIQUIDITY_CHAIN_CALIBRATION_COLUMNS)[number];

/** E5.11 optional observation column when present in CSV. */
export const HTF_STRUCTURE_CALIBRATION_COLUMNS = ["htf_structure_score"] as const;

export type HtfStructureCalibrationColumn = (typeof HTF_STRUCTURE_CALIBRATION_COLUMNS)[number];

/** E5.12 optional MSS/CHoCH observation score when CSV includes `mss_choch_score`. */
export const MSS_CHOCH_CALIBRATION_COLUMNS = ["mss_choch_score"] as const;

export type MssChochCalibrationColumn = (typeof MSS_CHOCH_CALIBRATION_COLUMNS)[number];

export type TestEaScoreOutcomeGroup =
  | "all"
  | "wins"
  | "losses"
  | "ambiguous"
  | "expired_unfilled"
  | "expired_open"
  | "unresolved"
  | "invalid_risk"
  | "other";

export type TestEaScoreRelativeBandId =
  | "top_10_percent"
  | "top_25_percent"
  | "middle_50_percent"
  | "bottom_25_percent"
  | "bottom_10_percent";

export interface TestEaScoreCalibrationOutcomeSlice {
  count: number;
  average_score: number | null;
  average_ambiguous_risk_score: number | null;
  total_r: number;
  expectancy_r: number;
  winrate: number;
  ambiguous_count: number;
  ambiguous_rate: number;
  max_drawdown_r: number;
}

export interface TestEaScoreCalibrationBandSlice {
  counted_trades: number;
  total_r: number;
  expectancy_r: number;
  winrate: number;
  ambiguous_count: number;
  ambiguous_rate: number;
  average_score: number | null;
  average_ambiguous_risk_score: number | null;
  max_drawdown_r: number;
}

export interface TestEaScoreComponentStats {
  min: number | null;
  max: number | null;
  average: number | null;
  by_outcome: Partial<Record<TestEaScoreOutcomeGroup, { average: number | null; count: number }>>;
}

export interface TestEaScoreCalibrationBundleGeneral {
  bundleName: string;
  run_id: string;
  campaign_id: string | null;
  parameter_set_id: string;
  effective_run_id: string | null;
  fvgMin: number | null;
  virtual_min_trade_fvg_points: number | null;
  trade_count: number;
  score_enabled: boolean;
  score_observation_only: boolean | null;
  score_gate_enabled: boolean | null;
  has_entry_quality_score_logic: boolean | null;
}

export interface TestEaScoreCalibrationScoreStats {
  score_min: number | null;
  score_max: number | null;
  score_average: number | null;
  score_median: number | null;
  score_p10: number | null;
  score_p25: number | null;
  score_p50: number | null;
  score_p75: number | null;
  score_p90: number | null;
  ambiguous_risk_average: number | null;
  ambiguous_risk_p75: number | null;
  ambiguous_risk_p90: number | null;
}

export interface TestEaScoreCalibrationGradeBlock {
  score_a_count: number | null;
  score_b_count: number | null;
  score_c_count: number | null;
  score_rejected_count: number | null;
  grade_distribution_from_csv: Record<string, number>;
}

export interface TestEaScoreCalibrationBundleAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  diagnostic_flags: ScoreCalibrationDiagnosticFlag[];
  import_errors: { code: string; message: string; row?: number }[];
  import_warnings: { code: string; message: string; row?: number }[];
  general: TestEaScoreCalibrationBundleGeneral | null;
  score_stats: TestEaScoreCalibrationScoreStats | null;
  grades: TestEaScoreCalibrationGradeBlock | null;
  outcome_by_score: Partial<Record<TestEaScoreOutcomeGroup, TestEaScoreCalibrationOutcomeSlice>> | null;
  relative_bands: Partial<Record<TestEaScoreRelativeBandId, TestEaScoreCalibrationBandSlice>> | null;
  missing_component_frequency: Record<string, number>;
  component_stats: Partial<Record<ScoreComponentColumn, TestEaScoreComponentStats>>;
  /** Present when trades CSV includes E5.10.2 liquidity quality numeric columns. */
  liquidity_quality_component_stats: Partial<Record<LiquidityQualityCalibrationColumn, TestEaScoreComponentStats>> | null;
  /** Present when trades CSV includes E5.10.4 causal chain numeric columns. */
  liquidity_chain_component_stats: Partial<Record<LiquidityChainCalibrationColumn, TestEaScoreComponentStats>> | null;
  /** Present when trades CSV includes E5.11 `htf_structure_score`. */
  htf_structure_component_stats: Partial<Record<HtfStructureCalibrationColumn, TestEaScoreComponentStats>> | null;
  /** Present when trades CSV includes E5.12 `mss_choch_score`. */
  mss_choch_component_stats: Partial<Record<MssChochCalibrationColumn, TestEaScoreComponentStats>> | null;
}

export interface TestEaScoreCalibrationBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface TestEaScoreCalibrationCampaignAnalysis {
  bundles: TestEaScoreCalibrationBundleAnalysis[];
}

export interface TestEaScoreCalibrationSummaryRow {
  bundleName: string;
  fvgMin: number | null;
  trade_count: number;
  score_average: number | null;
  expectancy_r: number | null;
  ambiguous_rate: number | null;
  run_id: string;
  campaign_id: string | null;
  parameter_set_id: string;
  effective_run_id: string | null;
}

export type TestEaScoreCalibrationSortKey = "fvg" | "score" | "expectancy" | "ambiguous_rate";

export interface SummarizeScoreCalibrationOptions {
  sortBy?: TestEaScoreCalibrationSortKey | undefined;
  maxResults?: number | undefined;
}

// --- JSON / summary helpers (local; mirrors testea-ambiguity-sensitivity patterns) ---

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

function readBooleanOrNull(obj: Record<string, unknown>, key: string): boolean | null {
  const v = obj[key];
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
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

// --- CSV helpers (subset aligned with backtest-importer header rules) ---

const HEADER_ALIASES: Record<string, string> = {
  entry_quality_score: "score_total",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

function splitCsvRows(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}

function resolveHeaderIndex(headerCells: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerCells.forEach((h, i) => {
    let key = normalizeHeader(h);
    key = HEADER_ALIASES[key] ?? key;
    if (!map.has(key)) map.set(key, i);
  });
  return map;
}

function pick(row: string[], col: Map<string, number>, name: string): string | undefined {
  const idx = col.get(name);
  if (idx === undefined) return undefined;
  return row[idx];
}

function parseFiniteNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface TradeScoreAuxiliary {
  entry_quality_grade: string | null;
  score: number | null;
  ambiguous_risk: number | null;
  components: Record<ScoreComponentColumn, number | null>;
  /** E5.10.2 optional subscores when CSV includes liquidity quality columns. */
  liquidity_quality: Partial<Record<LiquidityQualityCalibrationColumn, number | null>> | null;
  /** E5.10.4 optional chain numerics when CSV includes liquidity_chain_* score/lag columns. */
  liquidity_chain: Partial<Record<LiquidityChainCalibrationColumn, number | null>> | null;
  /** E5.11 optional HTF structure observation score when CSV includes `htf_structure_score`. */
  htf_structure: Partial<Record<HtfStructureCalibrationColumn, number | null>> | null;
  /** E5.12 optional MSS/CHoCH observation score when CSV includes `mss_choch_score`. */
  mss_choch: Partial<Record<MssChochCalibrationColumn, number | null>> | null;
  missing_raw: string;
  missing_tokens: string[];
}

/** Parse optional score columns keyed by trade_id (does not validate full CSV schema). */
export function parseTradeScoreAuxiliaryByTradeId(tradesCsvText: string): {
  byTradeId: Map<string, TradeScoreAuxiliary>;
  hasEntryQualityScoreColumn: boolean;
  hasLiquidityQualityColumns: boolean;
  hasLiquidityChainColumns: boolean;
  hasHtfStructureScoreColumn: boolean;
  hasMssChochScoreColumn: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const byTradeId = new Map<string, TradeScoreAuxiliary>();
  const rows = splitCsvRows(tradesCsvText);
  if (rows.length < 1) {
    warnings.push("CSV_EMPTY");
    return {
      byTradeId,
      hasEntryQualityScoreColumn: false,
      hasLiquidityQualityColumns: false,
      hasLiquidityChainColumns: false,
      hasHtfStructureScoreColumn: false,
      hasMssChochScoreColumn: false,
      warnings,
    };
  }
  const headerCells = parseCsvLine(rows[0]!);
  const col = resolveHeaderIndex(headerCells);
  const hasEntryQualityScoreColumn = col.has("score_total");
  const hasLiquidityQualityColumns = col.has("liquidity_sweep_quality_score");
  const hasLiquidityChainColumns = col.has("liquidity_chain_score");
  const hasHtfStructureScoreColumn = col.has("htf_structure_score");
  const hasMssChochScoreColumn = col.has("mss_choch_score");

  const emptyComponents = (): Record<ScoreComponentColumn, number | null> => ({
    htf_narrative_score: null,
    liquidity_event_score: null,
    displacement_fvg_quality_score: null,
    entry_confirmation_score: null,
    target_quality_score: null,
    session_news_spread_score: null,
    risk_overtrading_score: null,
    ambiguous_risk_score: null,
  });

  for (let r = 1; r < rows.length; r++) {
    const cells = parseCsvLine(rows[r]!);
    if (cells.length === 1 && cells[0] === "") continue;
    const tid = pick(cells, col, "trade_id")?.trim();
    if (!tid) continue;

    const comps = emptyComponents();
    for (const c of SCORE_COMPONENT_COLUMNS) {
      comps[c] = parseFiniteNumber(pick(cells, col, c));
    }

    const missingRaw = pick(cells, col, "missing_quality_components")?.trim() ?? "";
    const missing_tokens = tokenizeMissingComponents(missingRaw);

    let liquidity_quality: Partial<Record<LiquidityQualityCalibrationColumn, number | null>> | null = null;
    if (hasLiquidityQualityColumns) {
      liquidity_quality = {};
      for (const c of LIQUIDITY_QUALITY_CALIBRATION_COLUMNS) {
        liquidity_quality[c] = parseFiniteNumber(pick(cells, col, c));
      }
    }

    let liquidity_chain: Partial<Record<LiquidityChainCalibrationColumn, number | null>> | null = null;
    if (hasLiquidityChainColumns) {
      liquidity_chain = {};
      for (const c of LIQUIDITY_CHAIN_CALIBRATION_COLUMNS) {
        liquidity_chain[c] = parseFiniteNumber(pick(cells, col, c));
      }
    }

    let htf_structure: Partial<Record<HtfStructureCalibrationColumn, number | null>> | null = null;
    if (hasHtfStructureScoreColumn) {
      htf_structure = {};
      for (const c of HTF_STRUCTURE_CALIBRATION_COLUMNS) {
        htf_structure[c] = parseFiniteNumber(pick(cells, col, c));
      }
    }

    let mss_choch: Partial<Record<MssChochCalibrationColumn, number | null>> | null = null;
    if (hasMssChochScoreColumn) {
      mss_choch = {};
      for (const c of MSS_CHOCH_CALIBRATION_COLUMNS) {
        mss_choch[c] = parseFiniteNumber(pick(cells, col, c));
      }
    }

    const aux: TradeScoreAuxiliary = {
      entry_quality_grade: pick(cells, col, "entry_quality_grade")?.trim() ?? null,
      score: parseFiniteNumber(pick(cells, col, "score_total")),
      ambiguous_risk: parseFiniteNumber(pick(cells, col, "ambiguous_risk_score")),
      components: comps,
      liquidity_quality,
      liquidity_chain,
      htf_structure,
      mss_choch,
      missing_raw: missingRaw,
      missing_tokens,
    };
    byTradeId.set(tid, aux);
  }

  return {
    byTradeId,
    hasEntryQualityScoreColumn,
    hasLiquidityQualityColumns,
    hasLiquidityChainColumns,
    hasHtfStructureScoreColumn,
    hasMssChochScoreColumn,
    warnings,
  };
}

export function tokenizeMissingComponents(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tradeOutcomeLabel(t: BacktestTrade): string {
  return t.outcome?.trim().toLowerCase() ?? "";
}

function outcomeGroup(t: BacktestTrade): TestEaScoreOutcomeGroup {
  const o = tradeOutcomeLabel(t);
  if (o === "win") return "wins";
  if (o === "loss") return "losses";
  if (o === "ambiguous") return "ambiguous";
  if (o === "expired_unfilled") return "expired_unfilled";
  if (o === "expired_open") return "expired_open";
  if (o === "unresolved") return "unresolved";
  if (o === "invalid_risk") return "invalid_risk";
  if (o === "") {
    if (t.resultR > 0) return "wins";
    if (t.resultR < 0) return "losses";
  }
  return "other";
}

function percentileLinear(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const clamped = Math.min(1, Math.max(0, p));
  const pos = (sortedAsc.length - 1) * clamped;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo]!;
  const w = pos - lo;
  return sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w;
}

function medianFromSorted(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 1) return sortedAsc[mid]!;
  return (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

function sliceMetrics(trades: BacktestTrade[], scoreOf: (t: BacktestTrade) => number | null, ambOf: (t: BacktestTrade) => number | null): TestEaScoreCalibrationOutcomeSlice {
  const n = trades.length;
  const scores = trades.map(scoreOf).filter((x): x is number => x != null && Number.isFinite(x));
  const ambs = trades.map(ambOf).filter((x): x is number => x != null && Number.isFinite(x));

  let winC = 0;
  let lossC = 0;
  let ambC = 0;
  for (const t of trades) {
    const o = tradeOutcomeLabel(t);
    if (o === "ambiguous") ambC += 1;
    if (o === "win" || (o === "" && t.resultR > 0)) winC += 1;
    else if (o === "loss" || (o === "" && t.resultR < 0)) lossC += 1;
  }
  const decisive = winC + lossC;
  const winrate = decisive > 0 ? winC / decisive : 0;
  const ambiguous_rate = n > 0 ? ambC / n : 0;

  const sortedTime = [...trades].sort((a, b) => a.entryTime.localeCompare(b.entryTime));
  const maxDd = calculateMaxDrawdownR(sortedTime);

  return {
    count: n,
    average_score: average(scores),
    average_ambiguous_risk_score: average(ambs),
    total_r: calculateTotalR(trades),
    expectancy_r: n > 0 ? calculateExpectancyR(trades) : 0,
    winrate,
    ambiguous_count: ambC,
    ambiguous_rate,
    max_drawdown_r: maxDd,
  };
}

function bandSlice(
  trades: BacktestTrade[],
  scoreOf: (t: BacktestTrade) => number | null,
  ambOf: (t: BacktestTrade) => number | null,
): TestEaScoreCalibrationBandSlice {
  const m = sliceMetrics(trades, scoreOf, ambOf);
  return {
    counted_trades: m.count,
    total_r: m.total_r,
    expectancy_r: m.expectancy_r,
    winrate: m.winrate,
    ambiguous_count: m.ambiguous_count,
    ambiguous_rate: m.ambiguous_rate,
    average_score: m.average_score,
    average_ambiguous_risk_score: m.average_ambiguous_risk_score,
    max_drawdown_r: m.max_drawdown_r,
  };
}

function buildComponentStats(
  rows: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): Partial<Record<ScoreComponentColumn, TestEaScoreComponentStats>> {
  const out: Partial<Record<ScoreComponentColumn, TestEaScoreComponentStats>> = {};
  for (const col of SCORE_COMPONENT_COLUMNS) {
    const vals: number[] = [];
    const byOutcome: Partial<Record<TestEaScoreOutcomeGroup, { sum: number; count: number }>> = {};
    let allSum = 0;
    let allCnt = 0;
    for (const { trade, aux } of rows) {
      const v = aux?.components[col];
      if (v == null || !Number.isFinite(v)) continue;
      vals.push(v);
      allSum += v;
      allCnt += 1;
      const g = outcomeGroup(trade);
      const cur = byOutcome[g] ?? { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      byOutcome[g] = cur;
    }
    const byOutFin: TestEaScoreComponentStats["by_outcome"] = {};
    if (allCnt > 0) byOutFin.all = { count: allCnt, average: allSum / allCnt };
    for (const [k, v] of Object.entries(byOutcome)) {
      const og = k as TestEaScoreOutcomeGroup;
      byOutFin[og] = { count: v!.count, average: v!.count > 0 ? v!.sum / v!.count : null };
    }
    if (vals.length === 0) {
      out[col] = { min: null, max: null, average: null, by_outcome: byOutFin };
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      out[col] = {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        average: average(vals),
        by_outcome: byOutFin,
      };
    }
  }
  return out;
}

function buildLiquidityQualityComponentStats(
  rows: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): Partial<Record<LiquidityQualityCalibrationColumn, TestEaScoreComponentStats>> | null {
  const out: Partial<Record<LiquidityQualityCalibrationColumn, TestEaScoreComponentStats>> = {};
  let any = false;
  for (const col of LIQUIDITY_QUALITY_CALIBRATION_COLUMNS) {
    const vals: number[] = [];
    const byOutcome: Partial<Record<TestEaScoreOutcomeGroup, { sum: number; count: number }>> = {};
    let allSum = 0;
    let allCnt = 0;
    for (const { trade, aux } of rows) {
      const v = aux?.liquidity_quality?.[col];
      if (v == null || !Number.isFinite(v)) continue;
      any = true;
      vals.push(v);
      allSum += v;
      allCnt += 1;
      const g = outcomeGroup(trade);
      const cur = byOutcome[g] ?? { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      byOutcome[g] = cur;
    }
    const byOutFin: TestEaScoreComponentStats["by_outcome"] = {};
    if (allCnt > 0) byOutFin.all = { count: allCnt, average: allSum / allCnt };
    for (const [k, v] of Object.entries(byOutcome)) {
      const og = k as TestEaScoreOutcomeGroup;
      byOutFin[og] = { count: v!.count, average: v!.count > 0 ? v!.sum / v!.count : null };
    }
    if (vals.length === 0) {
      out[col] = { min: null, max: null, average: null, by_outcome: byOutFin };
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      out[col] = {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        average: average(vals),
        by_outcome: byOutFin,
      };
    }
  }
  return any ? out : null;
}

function buildLiquidityChainComponentStats(
  rows: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): Partial<Record<LiquidityChainCalibrationColumn, TestEaScoreComponentStats>> | null {
  const out: Partial<Record<LiquidityChainCalibrationColumn, TestEaScoreComponentStats>> = {};
  let any = false;
  for (const col of LIQUIDITY_CHAIN_CALIBRATION_COLUMNS) {
    const vals: number[] = [];
    const byOutcome: Partial<Record<TestEaScoreOutcomeGroup, { sum: number; count: number }>> = {};
    let allSum = 0;
    let allCnt = 0;
    for (const { trade, aux } of rows) {
      const v = aux?.liquidity_chain?.[col];
      if (v == null || !Number.isFinite(v)) continue;
      any = true;
      vals.push(v);
      allSum += v;
      allCnt += 1;
      const g = outcomeGroup(trade);
      const cur = byOutcome[g] ?? { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      byOutcome[g] = cur;
    }
    const byOutFin: TestEaScoreComponentStats["by_outcome"] = {};
    if (allCnt > 0) byOutFin.all = { count: allCnt, average: allSum / allCnt };
    for (const [k, v] of Object.entries(byOutcome)) {
      const og = k as TestEaScoreOutcomeGroup;
      byOutFin[og] = { count: v!.count, average: v!.count > 0 ? v!.sum / v!.count : null };
    }
    if (vals.length === 0) {
      out[col] = { min: null, max: null, average: null, by_outcome: byOutFin };
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      out[col] = {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        average: average(vals),
        by_outcome: byOutFin,
      };
    }
  }
  return any ? out : null;
}

function buildHtfStructureComponentStats(
  rows: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): Partial<Record<HtfStructureCalibrationColumn, TestEaScoreComponentStats>> | null {
  const out: Partial<Record<HtfStructureCalibrationColumn, TestEaScoreComponentStats>> = {};
  let any = false;
  for (const col of HTF_STRUCTURE_CALIBRATION_COLUMNS) {
    const vals: number[] = [];
    const byOutcome: Partial<Record<TestEaScoreOutcomeGroup, { sum: number; count: number }>> = {};
    let allSum = 0;
    let allCnt = 0;
    for (const { trade, aux } of rows) {
      const v = aux?.htf_structure?.[col];
      if (v == null || !Number.isFinite(v)) continue;
      any = true;
      vals.push(v);
      allSum += v;
      allCnt += 1;
      const g = outcomeGroup(trade);
      const cur = byOutcome[g] ?? { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      byOutcome[g] = cur;
    }
    const byOutFin: TestEaScoreComponentStats["by_outcome"] = {};
    if (allCnt > 0) byOutFin.all = { count: allCnt, average: allSum / allCnt };
    for (const [k, v] of Object.entries(byOutcome)) {
      const og = k as TestEaScoreOutcomeGroup;
      byOutFin[og] = { count: v!.count, average: v!.count > 0 ? v!.sum / v!.count : null };
    }
    if (vals.length === 0) {
      out[col] = { min: null, max: null, average: null, by_outcome: byOutFin };
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      out[col] = {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        average: average(vals),
        by_outcome: byOutFin,
      };
    }
  }
  return any ? out : null;
}

function buildMssChochComponentStats(
  rows: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): Partial<Record<MssChochCalibrationColumn, TestEaScoreComponentStats>> | null {
  const out: Partial<Record<MssChochCalibrationColumn, TestEaScoreComponentStats>> = {};
  let any = false;
  for (const col of MSS_CHOCH_CALIBRATION_COLUMNS) {
    const vals: number[] = [];
    const byOutcome: Partial<Record<TestEaScoreOutcomeGroup, { sum: number; count: number }>> = {};
    let allSum = 0;
    let allCnt = 0;
    for (const { trade, aux } of rows) {
      const v = aux?.mss_choch?.[col];
      if (v == null || !Number.isFinite(v)) continue;
      any = true;
      vals.push(v);
      allSum += v;
      allCnt += 1;
      const g = outcomeGroup(trade);
      const cur = byOutcome[g] ?? { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      byOutcome[g] = cur;
    }
    const byOutFin: TestEaScoreComponentStats["by_outcome"] = {};
    if (allCnt > 0) byOutFin.all = { count: allCnt, average: allSum / allCnt };
    for (const [k, v] of Object.entries(byOutcome)) {
      const og = k as TestEaScoreOutcomeGroup;
      byOutFin[og] = { count: v!.count, average: v!.count > 0 ? v!.sum / v!.count : null };
    }
    if (vals.length === 0) {
      out[col] = { min: null, max: null, average: null, by_outcome: byOutFin };
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      out[col] = {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        average: average(vals),
        by_outcome: byOutFin,
      };
    }
  }
  return any ? out : null;
}

function missingFrequency(rows: { aux: TradeScoreAuxiliary | undefined }[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const { aux } of rows) {
    const toks = aux?.missing_tokens ?? [];
    if (toks.length === 0) {
      freq["(none)"] = (freq["(none)"] ?? 0) + 1;
      continue;
    }
    for (const t of toks) {
      freq[t] = (freq[t] ?? 0) + 1;
    }
  }
  return freq;
}

function deriveDiagnosticFlags(
  a: TestEaScoreCalibrationBundleAnalysis,
  merged: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[],
): ScoreCalibrationDiagnosticFlag[] {
  const flags: ScoreCalibrationDiagnosticFlag[] = [];
  if (!a.ok || !a.score_stats || !a.relative_bands || !a.grades) return flags;

  const sumAbSummary = (a.grades.score_a_count ?? 0) + (a.grades.score_b_count ?? 0);
  let csvAbTrades = 0;
  for (const [k, v] of Object.entries(a.grades.grade_distribution_from_csv)) {
    const u = k.trim().toUpperCase();
    if ((u === "A" || u === "B") && v > 0) csvAbTrades += v;
  }
  if (sumAbSummary === 0 && csvAbTrades === 0) flags.push("SCORE_NO_A_B_GRADES");

  const smin = a.score_stats.score_min;
  const smax = a.score_stats.score_max;
  if (smin != null && smax != null && smax - smin < 12) flags.push("SCORE_RANGE_TOO_NARROW");

  const tc = a.general?.trade_count ?? 0;
  let tradesWithMissingToken = 0;
  for (const { aux } of merged) {
    if ((aux?.missing_tokens.length ?? 0) > 0) tradesWithMissingToken += 1;
  }
  if (tc > 0 && tradesWithMissingToken / tc > 0.55) flags.push("SCORE_MISSING_COMPONENTS_HIGH");

  const top = a.relative_bands.top_25_percent;
  const bot = a.relative_bands.bottom_25_percent;
  if (top && bot && top.counted_trades >= 3 && bot.counted_trades >= 3) {
    const eps = 1e-6;
    if (top.expectancy_r > bot.expectancy_r + eps) flags.push("TOP_QUARTILE_OUTPERFORMS");
    else flags.push("TOP_QUARTILE_DOES_NOT_OUTPERFORM");

    if (top.ambiguous_rate + eps < bot.ambiguous_rate) flags.push("TOP_QUARTILE_REDUCES_AMBIGUITY");
    else flags.push("TOP_QUARTILE_DOES_NOT_REDUCE_AMBIGUITY");
  }

  return flags;
}

/**
 * Analyze one bundle from in-memory summary JSON + trades CSV.
 */
export function analyzeTestEaScoreCalibrationFromTexts(
  input: TestEaScoreCalibrationBundleTextInput,
): TestEaScoreCalibrationBundleAnalysis {
  const empty: TestEaScoreCalibrationBundleAnalysis = {
    ok: false,
    bundleName: input.bundleName,
    errors: [],
    warnings: [],
    diagnostic_flags: [],
    import_errors: [],
    import_warnings: [],
    general: null,
    score_stats: null,
    grades: null,
    outcome_by_score: null,
    relative_bands: null,
    missing_component_frequency: {},
    component_stats: {},
    liquidity_quality_component_stats: null,
    liquidity_chain_component_stats: null,
    htf_structure_component_stats: null,
    mss_choch_component_stats: null,
  };

  let summary: Record<string, unknown>;
  try {
    summary = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    return { ...empty, errors: ["invalid JSON in summaryJsonText"] };
  }

  const strategyId = (readString(summary, "strategy_id") || "MZP_TESTEA") as StrategyId;
  const parameterSetId = (readString(summary, "parameter_set_id") || "default") as ParameterSetId;
  const canonicalSymbol = readString(summary, "canonical_symbol") || readString(summary, "symbol") || "XAUUSD";
  const runIdOpt =
    readString(summary, "effective_run_id").trim() || readString(summary, "run_id").trim() || undefined;

  const auxParse = parseTradeScoreAuxiliaryByTradeId(input.tradesCsvText);
  const hasLogic = readBooleanOrNull(summary, "has_entry_quality_score_logic");
  const hasCol = auxParse.hasEntryQualityScoreColumn;
  if (hasLogic !== true && !hasCol) {
    return {
      ...empty,
      ok: false,
      warnings: [
        "BUNDLE_SCORE_FIELDS_MISSING: summary has_entry_quality_score_logic is not true and trades CSV lacks entry_quality_score/score_total column — skipped calibration metrics.",
      ],
    };
  }
  if (hasLogic !== true && hasCol) {
    auxParse.warnings.push("SUMMARY_HAS_ENTRY_QUALITY_SCORE_LOGIC_FALSE_BUT_CSV_HAS_SCORE_COLUMNS");
  }

  const imp = importBacktestTradesFromCsv(input.tradesCsvText, {
    strategyId,
    parameterSetId,
    canonicalSymbol,
    datasetSplit: "full" as BacktestDatasetSplit,
    sourceType: "mapazapp_testea_csv" as BacktestSourceType,
    runId: runIdOpt as BacktestRunId | undefined,
  });

  if (!imp.ok) {
    const errors = imp.errors.map((e) => `${e.code}: ${e.message}`);
    return {
      ...empty,
      errors,
      import_errors: imp.errors,
      import_warnings: imp.warnings,
    };
  }

  const opt = asRecord(summary["optimization_parameters"]);
  const scoreEnabled =
    readBooleanOrNull(summary, "entry_quality_score_export_enabled") ??
    readBooleanOrNull(opt, "entry_quality_score_enabled") ??
    true;

  const merged: { trade: BacktestTrade; aux: TradeScoreAuxiliary | undefined }[] = [];
  for (const t of imp.trades) {
    const aux = auxParse.byTradeId.get(String(t.tradeId));
    merged.push({ trade: t, aux });
  }

  const scoreOf = (t: BacktestTrade): number | null => {
    const aux = auxParse.byTradeId.get(String(t.tradeId));
    if (aux?.score != null && Number.isFinite(aux.score)) return aux.score;
    if (t.scoreTotal != null && Number.isFinite(t.scoreTotal)) return t.scoreTotal;
    return null;
  };
  const ambOf = (t: BacktestTrade): number | null => {
    const aux = auxParse.byTradeId.get(String(t.tradeId));
    return aux?.ambiguous_risk ?? null;
  };

  const scores = imp.trades.map(scoreOf).filter((x): x is number => x != null && Number.isFinite(x));
  const ambRisks = imp.trades.map(ambOf).filter((x): x is number => x != null && Number.isFinite(x));
  const sortedScores = [...scores].sort((a, b) => a - b);
  const sortedAmb = [...ambRisks].sort((a, b) => a - b);

  const score_stats: TestEaScoreCalibrationScoreStats = {
    score_min: sortedScores.length ? sortedScores[0]! : null,
    score_max: sortedScores.length ? sortedScores[sortedScores.length - 1]! : null,
    score_average: average(scores),
    score_median: medianFromSorted(sortedScores),
    score_p10: percentileLinear(sortedScores, 0.1),
    score_p25: percentileLinear(sortedScores, 0.25),
    score_p50: percentileLinear(sortedScores, 0.5),
    score_p75: percentileLinear(sortedScores, 0.75),
    score_p90: percentileLinear(sortedScores, 0.9),
    ambiguous_risk_average: average(ambRisks),
    ambiguous_risk_p75: percentileLinear(sortedAmb, 0.75),
    ambiguous_risk_p90: percentileLinear(sortedAmb, 0.9),
  };

  const p10 = score_stats.score_p10;
  const p25 = score_stats.score_p25;
  const p50 = score_stats.score_p50;
  const p75 = score_stats.score_p75;
  const p90 = score_stats.score_p90;

  const gradeDist: Record<string, number> = {};
  for (const { aux } of merged) {
    const g = aux?.entry_quality_grade?.trim();
    if (!g) continue;
    const key = g;
    gradeDist[key] = (gradeDist[key] ?? 0) + 1;
  }

  const grades: TestEaScoreCalibrationGradeBlock = {
    score_a_count: readNumberOrNull(summary, "score_a_count"),
    score_b_count: readNumberOrNull(summary, "score_b_count"),
    score_c_count: readNumberOrNull(summary, "score_c_count"),
    score_rejected_count: readNumberOrNull(summary, "score_rejected_count"),
    grade_distribution_from_csv: gradeDist,
  };

  const ogroups: TestEaScoreOutcomeGroup[] = [
    "all",
    "wins",
    "losses",
    "ambiguous",
    "expired_unfilled",
    "expired_open",
    "unresolved",
    "invalid_risk",
    "other",
  ];
  const outcome_by_score: Partial<Record<TestEaScoreOutcomeGroup, TestEaScoreCalibrationOutcomeSlice>> = {};
  for (const g of ogroups) {
    const subset =
      g === "all"
        ? imp.trades
        : imp.trades.filter((t) => {
            const og = outcomeGroup(t);
            if (g === "wins") return og === "wins";
            if (g === "losses") return og === "losses";
            if (g === "other") return og === "other";
            return og === g;
          });
    outcome_by_score[g] = sliceMetrics(subset, scoreOf, ambOf);
  }

  const relative_bands: Partial<Record<TestEaScoreRelativeBandId, TestEaScoreCalibrationBandSlice>> = {};
  if (scores.length > 0 && p10 != null && p25 != null && p75 != null && p90 != null) {
    const top10 = imp.trades.filter((t) => {
      const s = scoreOf(t);
      return s != null && s >= p90;
    });
    const top25 = imp.trades.filter((t) => {
      const s = scoreOf(t);
      return s != null && s >= p75;
    });
    const mid = imp.trades.filter((t) => {
      const s = scoreOf(t);
      return s != null && s >= p25 && s <= p75;
    });
    const bot25 = imp.trades.filter((t) => {
      const s = scoreOf(t);
      return s != null && s <= p25;
    });
    const bot10 = imp.trades.filter((t) => {
      const s = scoreOf(t);
      return s != null && s <= p10;
    });
    relative_bands.top_10_percent = bandSlice(top10, scoreOf, ambOf);
    relative_bands.top_25_percent = bandSlice(top25, scoreOf, ambOf);
    relative_bands.middle_50_percent = bandSlice(mid, scoreOf, ambOf);
    relative_bands.bottom_25_percent = bandSlice(bot25, scoreOf, ambOf);
    relative_bands.bottom_10_percent = bandSlice(bot10, scoreOf, ambOf);
  }

  const general: TestEaScoreCalibrationBundleGeneral = {
    bundleName: input.bundleName,
    run_id: readString(summary, "run_id") || "unknown_run",
    campaign_id: (() => {
      const c = readString(summary, "campaign_id").trim();
      return c !== "" ? c : null;
    })(),
    parameter_set_id: readString(summary, "parameter_set_id") || "unknown_ps",
    effective_run_id: (() => {
      const e = readString(summary, "effective_run_id").trim();
      return e !== "" ? e : null;
    })(),
    fvgMin: extractFvgMin(summary),
    virtual_min_trade_fvg_points: readNumberOrNull(opt, "virtual_min_trade_fvg_points"),
    trade_count: imp.trades.length,
    score_enabled: Boolean(scoreEnabled),
    score_observation_only: readBooleanOrNull(summary, "score_observation_only"),
    score_gate_enabled: readBooleanOrNull(summary, "score_gate_enabled"),
    has_entry_quality_score_logic: hasLogic,
  };

  const analysis: TestEaScoreCalibrationBundleAnalysis = {
    ok: true,
    bundleName: input.bundleName,
    errors: [],
    warnings: [...auxParse.warnings.map((w) => `CSV_AUX: ${w}`)],
    diagnostic_flags: [],
    import_errors: imp.errors,
    import_warnings: imp.warnings,
    general,
    score_stats,
    grades,
    outcome_by_score,
    relative_bands,
    missing_component_frequency: missingFrequency(merged),
    component_stats: buildComponentStats(merged),
    liquidity_quality_component_stats: auxParse.hasLiquidityQualityColumns
      ? buildLiquidityQualityComponentStats(merged)
      : null,
    liquidity_chain_component_stats: auxParse.hasLiquidityChainColumns
      ? buildLiquidityChainComponentStats(merged)
      : null,
    htf_structure_component_stats: auxParse.hasHtfStructureScoreColumn
      ? buildHtfStructureComponentStats(merged)
      : null,
    mss_choch_component_stats: auxParse.hasMssChochScoreColumn ? buildMssChochComponentStats(merged) : null,
  };

  analysis.diagnostic_flags = deriveDiagnosticFlags(analysis, merged);

  return analysis;
}

/**
 * Analyze multiple bundles (in-memory).
 */
export function analyzeTestEaScoreCampaignCalibrationFromTexts(
  bundles: TestEaScoreCalibrationBundleTextInput[],
): TestEaScoreCalibrationCampaignAnalysis {
  return {
    bundles: bundles.map((b) => analyzeTestEaScoreCalibrationFromTexts(b)),
  };
}

function rowFromBundle(a: TestEaScoreCalibrationBundleAnalysis): TestEaScoreCalibrationSummaryRow | null {
  if (!a.ok || !a.general || !a.score_stats) return null;
  const amb = a.outcome_by_score?.all?.ambiguous_rate ?? null;
  return {
    bundleName: a.bundleName,
    fvgMin: a.general.fvgMin,
    trade_count: a.general.trade_count,
    score_average: a.score_stats.score_average,
    expectancy_r: a.outcome_by_score?.all?.expectancy_r ?? null,
    ambiguous_rate: amb,
    run_id: a.general.run_id,
    campaign_id: a.general.campaign_id,
    parameter_set_id: a.general.parameter_set_id,
    effective_run_id: a.general.effective_run_id,
  };
}

/**
 * Flatten campaign analyses into sortable summary rows (calibration bundles only).
 */
export function summarizeScoreCalibration(
  campaign: TestEaScoreCalibrationCampaignAnalysis,
  options?: SummarizeScoreCalibrationOptions,
): TestEaScoreCalibrationSummaryRow[] {
  const rows = campaign.bundles.map(rowFromBundle).filter((x): x is TestEaScoreCalibrationSummaryRow => x != null);
  const sortBy = options?.sortBy ?? "fvg";
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortBy === "fvg") {
      const fa = a.fvgMin ?? -1;
      const fb = b.fvgMin ?? -1;
      if (fa !== fb) return fa - fb;
    } else if (sortBy === "score") {
      const sa = a.score_average ?? -1;
      const sb = b.score_average ?? -1;
      if (sa !== sb) return sb - sa;
    } else if (sortBy === "expectancy") {
      const ea = a.expectancy_r ?? -Number.POSITIVE_INFINITY;
      const eb = b.expectancy_r ?? -Number.POSITIVE_INFINITY;
      if (ea !== eb) return eb - ea;
    } else if (sortBy === "ambiguous_rate") {
      const aa = a.ambiguous_rate ?? -1;
      const ab = b.ambiguous_rate ?? -1;
      if (aa !== ab) return ab - aa;
    }
    return a.bundleName.localeCompare(b.bundleName);
  });
  const max = options?.maxResults;
  if (max !== undefined && max >= 0) return copy.slice(0, max);
  return copy;
}
