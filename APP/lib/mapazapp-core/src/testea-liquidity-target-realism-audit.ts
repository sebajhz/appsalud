/**
 * E5.15.2 — Target Realism / TP vs Liquidity Distance Audit (read-only research).
 * Analyzes official fixed-RR TP vs exported liquidity-target diagnostics. Does not modify TP or outcomes.
 */

import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade } from "./backtest-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";

export type TargetRealismBucketId =
  | "conservative_tp_before_liquidity"
  | "aligned_tp_reaches_liquidity"
  | "extended_tp_beyond_liquidity"
  | "missing_liquidity_target"
  | "weak_target_quality"
  | "strong_target_quality";

export const TARGET_REALISM_BUCKET_IDS: TargetRealismBucketId[] = [
  "conservative_tp_before_liquidity",
  "aligned_tp_reaches_liquidity",
  "extended_tp_beyond_liquidity",
  "missing_liquidity_target",
  "weak_target_quality",
  "strong_target_quality",
];

export interface TestEaLiquidityTargetRealismAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface TargetRealismOverallCounts {
  trade_count: number;
  supported_count: number;
  missing_count: number;
  reached_by_tp_count: number;
  before_nearest_count: number;
  beyond_nearest_count: number;
  too_far_beyond_count: number;
  equal_level_count: number;
  swing_target_count: number;
  htf_external_count: number;
}

export interface CrossTabTable {
  rows: string[];
  columns: string[];
  counts: Record<string, Record<string, number>>;
}

export interface DistanceDistribution {
  count: number;
  average: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
}

export interface TargetRealismDistanceStats {
  official_tp_distance_points: DistanceDistribution;
  nearest_liquidity_distance_points: DistanceDistribution;
  liquidity_to_tp_distance_ratio: DistanceDistribution;
  tp_shortfall_to_nearest_when_before: DistanceDistribution;
  tp_excess_beyond_nearest_when_beyond: DistanceDistribution;
}

export interface TargetRealismExample {
  bucket: TargetRealismBucketId;
  trade_id: string;
  outcome: string;
  direction: string;
  official_tp_price: number | null;
  official_tp_distance_points: number | null;
  nearest_type: string;
  nearest_price: number | null;
  nearest_distance_points: number | null;
  liquidity_target_score: number | null;
  liquidity_target_grade: string;
  liquidity_target_reasons: string;
}

export interface TargetRealismBucketSummary {
  bucket: TargetRealismBucketId;
  count: number;
  examples: TargetRealismExample[];
}

export interface TestEaLiquidityTargetRealismAuditAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  overall: TargetRealismOverallCounts;
  outcome_by_grade: CrossTabTable;
  outcome_by_supported: CrossTabTable;
  outcome_by_reached_by_tp: CrossTabTable;
  outcome_by_before_nearest: CrossTabTable;
  outcome_by_beyond_nearest: CrossTabTable;
  distance_stats: TargetRealismDistanceStats;
  buckets: TargetRealismBucketSummary[];
  interpretation_flags: string[];
  research_only_note: string;
}

export interface TargetRealismAuditCsvRow {
  bundle: string;
  section: string;
  bucket: string;
  row_key: string;
  col_key: string;
  count: number;
  notes: string;
}

const RESEARCH_NOTE =
  "E5.15.2 research-only audit over exported bundle data. Does not change official TP, entry, outcomes, or approve any entry model.";

function defaultImportOptions(): ImportBacktestCsvOptions {
  return {
    strategyId: "MZP_TESTEA",
    parameterSetId: "default",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "lq-target-realism-audit",
    sourceType: "mapazapp_testea_csv",
    datasetSplit: "train",
  };
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const w = idx - lo;
  return sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w;
}

function distStats(nums: number[]): DistanceDistribution {
  if (nums.length === 0) {
    return {
      count: 0,
      average: null,
      median: null,
      p25: null,
      p75: null,
      p90: null,
    };
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    count: nums.length,
    average: sum / nums.length,
    median: median(nums),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

function boolKey(v: boolean | undefined): string {
  if (v === true) return "true";
  if (v === false) return "false";
  return "unknown";
}

function gradeKey(t: BacktestTrade): string {
  return t.liquidityTargetGrade?.trim() || "unknown";
}

function hasNearestTarget(t: BacktestTrade): boolean {
  const d = t.liquidityTargetNearestDistancePoints;
  return d != null && Number.isFinite(d) && d >= 0;
}

function isMissingTarget(t: BacktestTrade): boolean {
  if (t.liquidityTargetReasons?.includes("liquidity_target_missing")) return true;
  if (!hasNearestTarget(t) && t.liquidityTargetHasSwingTarget !== true && t.liquidityTargetHasHtfExternalTarget !== true) {
    return true;
  }
  return false;
}

function classifyBuckets(t: BacktestTrade): TargetRealismBucketId[] {
  const out: TargetRealismBucketId[] = [];
  const missing = isMissingTarget(t);
  if (missing) out.push("missing_liquidity_target");

  const reached = t.liquidityTargetReachedByOfficialTp === true;
  const supported = t.liquidityTargetSupported === true;
  const before = t.liquidityTargetTpBeforeNearestLiquidity === true;
  const beyond = t.liquidityTargetTpBeyondNearestLiquidity === true;
  const tooFar = t.liquidityTargetTooFarBeyondNearestLiquidity === true;

  if (before && !reached && !supported) out.push("conservative_tp_before_liquidity");
  if (supported || reached) out.push("aligned_tp_reaches_liquidity");
  if (beyond && !tooFar) out.push("extended_tp_beyond_liquidity");

  const grade = (t.liquidityTargetGrade ?? "").trim();
  const score = t.liquidityTargetScore;
  if (grade === "Weak" || grade === "None" || (score != null && score <= 6)) {
    out.push("weak_target_quality");
  }
  if (grade === "A" || grade === "B") out.push("strong_target_quality");

  return out;
}

function addCross(
  table: CrossTabTable,
  row: string,
  col: string,
): void {
  if (!table.rows.includes(row)) table.rows.push(row);
  if (!table.columns.includes(col)) table.columns.push(col);
  if (!table.counts[row]) table.counts[row] = {};
  table.counts[row]![col] = (table.counts[row]![col] ?? 0) + 1;
}

function finalizeCrossTab(table: CrossTabTable): CrossTabTable {
  table.rows.sort();
  table.columns.sort();
  return table;
}

function buildExample(t: BacktestTrade, bucket: TargetRealismBucketId): TargetRealismExample {
  return {
    bucket,
    trade_id: t.tradeId,
    outcome: t.outcome ?? "unknown",
    direction: t.direction ?? "unknown",
    official_tp_price: t.liquidityTargetOfficialTpPrice ?? t.tp ?? null,
    official_tp_distance_points: t.liquidityTargetOfficialTpDistancePoints ?? null,
    nearest_type: t.liquidityTargetNearestType ?? "unknown",
    nearest_price: hasNearestTarget(t) ? (t.liquidityTargetNearestPrice ?? null) : null,
    nearest_distance_points: hasNearestTarget(t)
      ? (t.liquidityTargetNearestDistancePoints ?? null)
      : null,
    liquidity_target_score: t.liquidityTargetScore ?? null,
    liquidity_target_grade: t.liquidityTargetGrade ?? "unknown",
    liquidity_target_reasons: t.liquidityTargetReasons ?? "",
  };
}

function deriveInterpretationFlags(overall: TargetRealismOverallCounts): string[] {
  const flags: string[] = [];
  const n = overall.trade_count;
  if (n === 0) return flags;

  if (overall.before_nearest_count / n > 0.5) {
    flags.push("OFFICIAL_TP_OFTEN_CONSERVATIVE");
  }
  if (overall.supported_count / n < 0.35) {
    flags.push("LOW_SUPPORTED_TARGET_RATIO");
  }
  if (overall.beyond_nearest_count > overall.reached_by_tp_count) {
    flags.push("TARGET_LIQUIDITY_AVAILABLE_BUT_BEYOND_TP");
  }
  if (overall.too_far_beyond_count > 0) {
    flags.push("TARGET_EXCESS_BEYOND_NEAREST_PRESENT");
  }
  if (overall.missing_count / n > 0.05) {
    flags.push("MISSING_LIQUIDITY_TARGET_NONTRIVIAL");
  }
  if (flags.length === 0 || overall.before_nearest_count / n > 0.3) {
    flags.push("TARGET_REALISM_NEEDS_PROFILE_RESEARCH");
  }
  return [...new Set(flags)];
}

export function analyzeTestEaLiquidityTargetRealismAuditFromTexts(
  input: TestEaLiquidityTargetRealismAuditBundleTextInput,
  options?: { maxExamples?: number },
): TestEaLiquidityTargetRealismAuditAnalysis {
  const maxExamples = options?.maxExamples ?? 10;
  const errors: string[] = [];
  const warnings: string[] = [];

  let summaryJson: Record<string, unknown> = {};
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    errors.push("invalid JSON in summaryJsonText");
  }

  if (summaryJson["has_liquidity_target_quality_v1_logic"] !== true) {
    warnings.push("summary missing has_liquidity_target_quality_v1_logic=true (proceeding from trades CSV)");
  }

  const imported = importBacktestTradesFromCsv(input.tradesCsvText, defaultImportOptions());
  if (!imported.ok) {
    errors.push(...imported.errors.map((e) => e.message));
  }
  warnings.push(...imported.warnings.map((w) => w.message));

  const trades = imported.trades;
  if (trades.length === 0) {
    errors.push("no trades imported");
  }

  const sample = trades[0];
  if (sample && sample.liquidityTargetQualityEnabled === undefined) {
    errors.push("trades CSV missing liquidity_target_quality_enabled (E5.15 columns required)");
  }

  const overall: TargetRealismOverallCounts = {
    trade_count: trades.length,
    supported_count: 0,
    missing_count: 0,
    reached_by_tp_count: 0,
    before_nearest_count: 0,
    beyond_nearest_count: 0,
    too_far_beyond_count: 0,
    equal_level_count: 0,
    swing_target_count: 0,
    htf_external_count: 0,
  };

  const outcomeByGrade: CrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeBySupported: CrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByReached: CrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByBefore: CrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByBeyond: CrossTabTable = { rows: [], columns: [], counts: {} };

  const tpDist: number[] = [];
  const nearDist: number[] = [];
  const ratios: number[] = [];
  const shortfalls: number[] = [];
  const excesses: number[] = [];

  const bucketExamples = new Map<TargetRealismBucketId, TargetRealismExample[]>();
  const bucketCounts = new Map<TargetRealismBucketId, number>();
  for (const id of TARGET_REALISM_BUCKET_IDS) {
    bucketExamples.set(id, []);
    bucketCounts.set(id, 0);
  }

  let gradeC = 0;
  for (const t of trades) {
    const outcome = t.outcome?.trim() || "unknown";
    const grade = gradeKey(t);

    if (t.liquidityTargetSupported === true) overall.supported_count++;
    if (isMissingTarget(t)) overall.missing_count++;
    if (t.liquidityTargetReachedByOfficialTp === true) overall.reached_by_tp_count++;
    if (t.liquidityTargetTpBeforeNearestLiquidity === true) overall.before_nearest_count++;
    if (t.liquidityTargetTpBeyondNearestLiquidity === true) overall.beyond_nearest_count++;
    if (t.liquidityTargetTooFarBeyondNearestLiquidity === true) overall.too_far_beyond_count++;
    if (t.liquidityTargetHasEqualLevel === true) overall.equal_level_count++;
    if (t.liquidityTargetHasSwingTarget === true) overall.swing_target_count++;
    if (t.liquidityTargetHasHtfExternalTarget === true) overall.htf_external_count++;

    if (grade === "C") gradeC++;

    addCross(outcomeByGrade, outcome, grade);
    addCross(outcomeBySupported, outcome, boolKey(t.liquidityTargetSupported));
    addCross(outcomeByReached, outcome, boolKey(t.liquidityTargetReachedByOfficialTp));
    addCross(outcomeByBefore, outcome, boolKey(t.liquidityTargetTpBeforeNearestLiquidity));
    addCross(outcomeByBeyond, outcome, boolKey(t.liquidityTargetTpBeyondNearestLiquidity));

    const tpD = t.liquidityTargetOfficialTpDistancePoints;
    if (tpD != null && Number.isFinite(tpD) && tpD >= 0) tpDist.push(tpD);

    if (hasNearestTarget(t)) {
      const nD = t.liquidityTargetNearestDistancePoints!;
      nearDist.push(nD);
      if (tpD != null && Number.isFinite(tpD) && tpD > 0) {
        ratios.push(nD / tpD);
      }
      if (t.liquidityTargetTpBeforeNearestLiquidity === true && tpD != null && Number.isFinite(tpD)) {
        shortfalls.push(Math.max(0, nD - tpD));
      }
      if (t.liquidityTargetTpBeyondNearestLiquidity === true && tpD != null && Number.isFinite(tpD)) {
        excesses.push(Math.max(0, tpD - nD));
      }
    }

    for (const bucket of classifyBuckets(t)) {
      bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
      const ex = bucketExamples.get(bucket)!;
      if (ex.length < maxExamples) ex.push(buildExample(t, bucket));
    }
  }

  const buckets: TargetRealismBucketSummary[] = TARGET_REALISM_BUCKET_IDS.map((bucket) => ({
    bucket,
    count: bucketCounts.get(bucket) ?? 0,
    examples: bucketExamples.get(bucket) ?? [],
  }));

  const interpretation_flags = deriveInterpretationFlags(overall);
  if (trades.length > 0 && gradeC / trades.length > 0.5) {
    interpretation_flags.push("TARGET_QUALITY_DOMINATED_BY_GRADE_C");
  }

  return {
    ok: errors.length === 0,
    bundleName: input.bundleName,
    errors,
    warnings,
    overall,
    outcome_by_grade: finalizeCrossTab(outcomeByGrade),
    outcome_by_supported: finalizeCrossTab(outcomeBySupported),
    outcome_by_reached_by_tp: finalizeCrossTab(outcomeByReached),
    outcome_by_before_nearest: finalizeCrossTab(outcomeByBefore),
    outcome_by_beyond_nearest: finalizeCrossTab(outcomeByBeyond),
    distance_stats: {
      official_tp_distance_points: distStats(tpDist),
      nearest_liquidity_distance_points: distStats(nearDist),
      liquidity_to_tp_distance_ratio: distStats(ratios),
      tp_shortfall_to_nearest_when_before: distStats(shortfalls),
      tp_excess_beyond_nearest_when_beyond: distStats(excesses),
    },
    buckets,
    interpretation_flags: [...new Set(interpretation_flags)],
    research_only_note: RESEARCH_NOTE,
  };
}

export function flattenTargetRealismAuditCsvRows(
  analysis: TestEaLiquidityTargetRealismAuditAnalysis,
): TargetRealismAuditCsvRow[] {
  const rows: TargetRealismAuditCsvRow[] = [];
  const b = analysis.bundleName;
  const pushOverall = (key: string, count: number) => {
    rows.push({
      bundle: b,
      section: "overall",
      bucket: key,
      row_key: "",
      col_key: "",
      count,
      notes: "",
    });
  };
  pushOverall("trade_count", analysis.overall.trade_count);
  pushOverall("supported_count", analysis.overall.supported_count);
  pushOverall("missing_count", analysis.overall.missing_count);
  pushOverall("reached_by_tp_count", analysis.overall.reached_by_tp_count);
  pushOverall("before_nearest_count", analysis.overall.before_nearest_count);
  pushOverall("beyond_nearest_count", analysis.overall.beyond_nearest_count);
  pushOverall("too_far_beyond_count", analysis.overall.too_far_beyond_count);
  pushOverall("equal_level_count", analysis.overall.equal_level_count);
  pushOverall("swing_target_count", analysis.overall.swing_target_count);
  pushOverall("htf_external_count", analysis.overall.htf_external_count);

  for (const bucket of analysis.buckets) {
    rows.push({
      bundle: b,
      section: "bucket",
      bucket: bucket.bucket,
      row_key: "",
      col_key: "",
      count: bucket.count,
      notes: `${bucket.examples.length} examples capped`,
    });
  }

  const addCrossRows = (section: string, table: CrossTabTable) => {
    for (const row of table.rows) {
      for (const col of table.columns) {
        rows.push({
          bundle: b,
          section,
          bucket: "",
          row_key: row,
          col_key: col,
          count: table.counts[row]?.[col] ?? 0,
          notes: "",
        });
      }
    }
  };
  addCrossRows("outcome_by_grade", analysis.outcome_by_grade);
  addCrossRows("outcome_by_supported", analysis.outcome_by_supported);
  addCrossRows("outcome_by_reached_by_tp", analysis.outcome_by_reached_by_tp);
  addCrossRows("outcome_by_before_nearest", analysis.outcome_by_before_nearest);
  addCrossRows("outcome_by_beyond_nearest", analysis.outcome_by_beyond_nearest);

  return rows;
}
