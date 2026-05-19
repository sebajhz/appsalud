/**
 * E5.16.2 — Execution Environment Calibration Audit (read-only research).
 * Analyzes session/spread/volatility context and simulates alternative ATR thresholds without changing MQL5.
 */

import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade } from "./backtest-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";

export interface TestEaExecutionEnvironmentCalibrationAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

interface EnvCalibrationCrossTabTable {
  rows: string[];
  columns: string[];
  counts: Record<string, Record<string, number>>;
}

export interface DistributionStats {
  count: number;
  average: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  p95: number | null;
}

export interface EnvironmentOverallCounts {
  trade_count: number;
  session_buckets: Record<string, number>;
  spread_buckets: Record<string, number>;
  volatility_buckets: Record<string, number>;
  execution_environment_grades: Record<string, number>;
}

export interface VolatilityProfileBucketCounts {
  low_count: number;
  normal_count: number;
  high_count: number;
  extreme_count: number;
  unknown_count: number;
}

export type VolatilitySensitivityProfileId =
  | "mql5_v1_simulated"
  | "profile_xauusd_m15_candidate_a"
  | "profile_xauusd_m15_candidate_b"
  | "profile_xauusd_m15_candidate_c";

export const VOLATILITY_SENSITIVITY_PROFILE_IDS: VolatilitySensitivityProfileId[] = [
  "mql5_v1_simulated",
  "profile_xauusd_m15_candidate_a",
  "profile_xauusd_m15_candidate_b",
  "profile_xauusd_m15_candidate_c",
];

export interface VolatilityThresholdSensitivityEntry {
  profile: VolatilitySensitivityProfileId;
  description: string;
  thresholds: {
    low_below: number | null;
    high_at: number | null;
    extreme_at: number | null;
    percentile_low_p25?: number | null;
    percentile_high_p75?: number | null;
    percentile_extreme_p90?: number | null;
  };
  counts: VolatilityProfileBucketCounts;
}

export interface ExecutionEnvironmentCalibrationExample {
  category:
    | "current_extreme_volatility"
    | "normal_volatility"
    | "weak_none_environment_grade"
    | "ab_environment_grade";
  trade_id: string;
  outcome: string;
  session_bucket: string;
  spread_points: number | null;
  spread_bucket: string;
  volatility_atr_points: number | null;
  volatility_bucket: string;
  volatility_range_points: number | null;
  volatility_range_to_atr_ratio: number | null;
  execution_environment_score: number | null;
  execution_environment_grade: string;
  execution_environment_reasons: string;
}

export interface TestEaExecutionEnvironmentCalibrationAuditAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  overall: EnvironmentOverallCounts;
  outcome_by_session_bucket: EnvCalibrationCrossTabTable;
  outcome_by_spread_bucket: EnvCalibrationCrossTabTable;
  outcome_by_volatility_bucket: EnvCalibrationCrossTabTable;
  outcome_by_execution_environment_grade: EnvCalibrationCrossTabTable;
  atr_points_stats: DistributionStats;
  range_points_stats: DistributionStats;
  range_to_atr_ratio_stats: DistributionStats;
  threshold_sensitivity: VolatilityThresholdSensitivityEntry[];
  interpretation_flags: string[];
  examples: ExecutionEnvironmentCalibrationExample[];
  research_only_note: string;
}

export interface ExecutionEnvironmentCalibrationAuditCsvRow {
  bundle: string;
  section: string;
  bucket: string;
  row_key: string;
  col_key: string;
  count: number;
  notes: string;
}

const RESEARCH_NOTE =
  "E5.16.2 research-only audit over exported bundle data. Does not change MQL5 thresholds, official TP, entry, outcomes, or approve any entry model.";

const MQL5_V1_ATR_THRESHOLDS = { lowBelow: 80, highAt: 250, extremeAt: 400 };

function defaultImportOptions(): ImportBacktestCsvOptions {
  return {
    strategyId: "MZP_TESTEA",
    parameterSetId: "default",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "exec-env-calibration-audit",
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

function distStats(nums: number[]): DistributionStats {
  if (nums.length === 0) {
    return {
      count: 0,
      average: null,
      median: null,
      p25: null,
      p75: null,
      p90: null,
      p95: null,
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
    p95: percentile(sorted, 0.95),
  };
}

function addCross(table: EnvCalibrationCrossTabTable, row: string, col: string): void {
  if (!table.rows.includes(row)) table.rows.push(row);
  if (!table.columns.includes(col)) table.columns.push(col);
  if (!table.counts[row]) table.counts[row] = {};
  table.counts[row]![col] = (table.counts[row]![col] ?? 0) + 1;
}

function finalizeCrossTab(table: EnvCalibrationCrossTabTable): EnvCalibrationCrossTabTable {
  table.rows.sort();
  table.columns.sort();
  return table;
}

function incBucket(map: Record<string, number>, key: string): void {
  const k = key.trim() || "unknown";
  map[k] = (map[k] ?? 0) + 1;
}

function emptyVolCounts(): VolatilityProfileBucketCounts {
  return {
    low_count: 0,
    normal_count: 0,
    high_count: 0,
    extreme_count: 0,
    unknown_count: 0,
  };
}

export type VolatilityClass = "low" | "normal" | "high" | "extreme" | "unknown";

export function classifyVolatilityFromAtr(
  atr: number | null | undefined,
  thresholds: { lowBelow: number; highAt: number; extremeAt: number },
): VolatilityClass {
  if (atr == null || !Number.isFinite(atr)) return "unknown";
  if (atr < thresholds.lowBelow) return "low";
  if (atr < thresholds.highAt) return "normal";
  if (atr < thresholds.extremeAt) return "high";
  return "extreme";
}

function applyVolClass(counts: VolatilityProfileBucketCounts, c: VolatilityClass): void {
  if (c === "low") counts.low_count++;
  else if (c === "normal") counts.normal_count++;
  else if (c === "high") counts.high_count++;
  else if (c === "extreme") counts.extreme_count++;
  else counts.unknown_count++;
}

function buildExample(
  t: BacktestTrade,
  category: ExecutionEnvironmentCalibrationExample["category"],
): ExecutionEnvironmentCalibrationExample {
  return {
    category,
    trade_id: t.tradeId,
    outcome: t.outcome?.trim() || "unknown",
    session_bucket: t.sessionBucket?.trim() || "unknown",
    spread_points: t.spreadPoints ?? null,
    spread_bucket: t.spreadBucket?.trim() || "unknown",
    volatility_atr_points: t.volatilityAtrPoints ?? null,
    volatility_bucket: t.volatilityBucket?.trim() || "unknown",
    volatility_range_points: t.volatilityRangePoints ?? null,
    volatility_range_to_atr_ratio: t.volatilityRangeToAtrRatio ?? null,
    execution_environment_score: t.executionEnvironmentScore ?? null,
    execution_environment_grade: t.executionEnvironmentGrade?.trim() || "unknown",
    execution_environment_reasons: t.executionEnvironmentReasons ?? "",
  };
}

function deriveInterpretationFlags(
  overall: EnvironmentOverallCounts,
  thresholdSensitivity: VolatilityThresholdSensitivityEntry[],
  avgEnvScore: number | null,
): string[] {
  const flags: string[] = [];
  const n = overall.trade_count;
  if (n === 0) return flags;

  const vol = overall.volatility_buckets;
  const extremeShare = (vol["extreme"] ?? 0) / n;
  const spreadNormalShare = (overall.spread_buckets["normal"] ?? 0) / n;
  const offSessionShare = (overall.session_buckets["off_session"] ?? 0) / n;
  const weakNone =
    (overall.execution_environment_grades["Weak"] ?? 0) +
    (overall.execution_environment_grades["weak"] ?? 0) +
    (overall.execution_environment_grades["None"] ?? 0) +
    (overall.execution_environment_grades["none"] ?? 0);

  if (spreadNormalShare >= 0.95) flags.push("SPREAD_NOT_PRIMARY_ISSUE");
  if (offSessionShare >= 0.2) flags.push("OFF_SESSION_MATERIAL_COUNT");

  if (extremeShare >= 0.5) {
    flags.push("VOLATILITY_THRESHOLDS_TOO_LOW_FOR_XAUUSD_M15");
  }

  const mql5Sim = thresholdSensitivity.find((p) => p.profile === "mql5_v1_simulated");
  const candidateA = thresholdSensitivity.find((p) => p.profile === "profile_xauusd_m15_candidate_a");
  if (mql5Sim && extremeShare >= 0.5) {
    const simExtreme = mql5Sim.counts.extreme_count / n;
    if (Math.abs(simExtreme - extremeShare) < 0.05) {
      flags.push("EXPORTED_BUCKETS_MATCH_MQL5_V1_SIMULATION");
    }
  }

  let bestExtremeReduction = 0;
  for (const p of thresholdSensitivity) {
    if (p.profile === "mql5_v1_simulated") continue;
    const share = p.counts.extreme_count / n;
    bestExtremeReduction = Math.max(bestExtremeReduction, extremeShare - share);
  }
  if (bestExtremeReduction >= 0.2) flags.push("PROFILE_SPECIFIC_THRESHOLDS_RECOMMENDED");

  if (extremeShare >= 0.55 || (candidateA && candidateA.counts.extreme_count / n >= 0.4)) {
    flags.push("CURRENT_THRESHOLDS_USABLE_AS_STRESS_LABEL_ONLY");
  }

  if (weakNone / n >= 0.5 && extremeShare >= 0.5 && (avgEnvScore == null || avgEnvScore < 6)) {
    flags.push("ENV_SCORE_DOMINATED_BY_VOLATILITY");
  }

  return [...new Set(flags)];
}

export function analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
  input: TestEaExecutionEnvironmentCalibrationAuditBundleTextInput,
  options?: { maxExamples?: number },
): TestEaExecutionEnvironmentCalibrationAuditAnalysis {
  const maxExamples = options?.maxExamples ?? 10;
  const errors: string[] = [];
  const warnings: string[] = [];

  let summaryJson: Record<string, unknown> = {};
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    errors.push("invalid JSON in summaryJsonText");
  }

  if (summaryJson["has_session_spread_volatility_v1_logic"] !== true) {
    warnings.push(
      "summary missing has_session_spread_volatility_v1_logic=true (proceeding from trades CSV)",
    );
  }

  const imported = importBacktestTradesFromCsv(input.tradesCsvText, defaultImportOptions());
  if (!imported.ok) {
    errors.push(...imported.errors.map((e) => e.message));
  }
  warnings.push(...imported.warnings.map((w) => w.message));

  const trades = imported.trades;
  if (trades.length === 0) errors.push("no trades imported");

  const sample = trades[0];
  if (sample && sample.sessionSpreadVolatilityEnabled === undefined) {
    errors.push("trades CSV missing session_spread_volatility_enabled (E5.16 columns required)");
  }

  const overall: EnvironmentOverallCounts = {
    trade_count: trades.length,
    session_buckets: {},
    spread_buckets: {},
    volatility_buckets: {},
    execution_environment_grades: {},
  };

  const outcomeBySession: EnvCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeBySpread: EnvCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByVol: EnvCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByGrade: EnvCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };

  const atrNums: number[] = [];
  const rangeNums: number[] = [];
  const ratioNums: number[] = [];
  let envScoreSum = 0;
  let envScoreCount = 0;

  const profileCounts = new Map<VolatilitySensitivityProfileId, VolatilityProfileBucketCounts>();
  for (const id of VOLATILITY_SENSITIVITY_PROFILE_IDS) {
    profileCounts.set(id, emptyVolCounts());
  }

  const exampleBuckets = new Map<ExecutionEnvironmentCalibrationExample["category"], ExecutionEnvironmentCalibrationExample[]>();
  const exampleCats: ExecutionEnvironmentCalibrationExample["category"][] = [
    "current_extreme_volatility",
    "normal_volatility",
    "weak_none_environment_grade",
    "ab_environment_grade",
  ];
  for (const c of exampleCats) exampleBuckets.set(c, []);

  for (const t of trades) {
    const outcome = t.outcome?.trim() || "unknown";
    const session = t.sessionBucket?.trim() || "unknown";
    const spread = t.spreadBucket?.trim() || "unknown";
    const vol = t.volatilityBucket?.trim() || "unknown";
    const grade = t.executionEnvironmentGrade?.trim() || "unknown";

    incBucket(overall.session_buckets, session);
    incBucket(overall.spread_buckets, spread);
    incBucket(overall.volatility_buckets, vol);
    incBucket(overall.execution_environment_grades, grade);

    addCross(outcomeBySession, outcome, session);
    addCross(outcomeBySpread, outcome, spread);
    addCross(outcomeByVol, outcome, vol);
    addCross(outcomeByGrade, outcome, grade);

    const atr = t.volatilityAtrPoints;
    if (atr != null && Number.isFinite(atr)) atrNums.push(atr);

    const rng = t.volatilityRangePoints;
    if (rng != null && Number.isFinite(rng)) rangeNums.push(rng);

    const ratio = t.volatilityRangeToAtrRatio;
    if (ratio != null && Number.isFinite(ratio)) ratioNums.push(ratio);

    const score = t.executionEnvironmentScore;
    if (score != null && Number.isFinite(score)) {
      envScoreSum += score;
      envScoreCount++;
    }

    const mql5Counts = profileCounts.get("mql5_v1_simulated")!;
    applyVolClass(mql5Counts, classifyVolatilityFromAtr(atr, MQL5_V1_ATR_THRESHOLDS));

    const aCounts = profileCounts.get("profile_xauusd_m15_candidate_a")!;
    applyVolClass(
      aCounts,
      classifyVolatilityFromAtr(atr, { lowBelow: 150, highAt: 500, extremeAt: 900 }),
    );

    const bCounts = profileCounts.get("profile_xauusd_m15_candidate_b")!;
    applyVolClass(
      bCounts,
      classifyVolatilityFromAtr(atr, { lowBelow: 200, highAt: 700, extremeAt: 1200 }),
    );

    const volNorm = vol.toLowerCase();
    if (volNorm === "extreme") {
      const ex = exampleBuckets.get("current_extreme_volatility")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "current_extreme_volatility"));
    }
    if (volNorm === "normal") {
      const ex = exampleBuckets.get("normal_volatility")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "normal_volatility"));
    }
    const gradeNorm = grade.toLowerCase();
    if (gradeNorm === "weak" || gradeNorm === "none") {
      const ex = exampleBuckets.get("weak_none_environment_grade")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "weak_none_environment_grade"));
    }
    if (gradeNorm === "a" || gradeNorm === "b") {
      const ex = exampleBuckets.get("ab_environment_grade")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "ab_environment_grade"));
    }
  }

  const sortedAtr = [...atrNums].sort((a, b) => a - b);
  const p25 = percentile(sortedAtr, 0.25);
  const p75 = percentile(sortedAtr, 0.75);
  const p90 = percentile(sortedAtr, 0.9);

  const cCounts = profileCounts.get("profile_xauusd_m15_candidate_c")!;
  for (const t of trades) {
    const atr = t.volatilityAtrPoints;
    if (atr == null || !Number.isFinite(atr) || p25 == null || p75 == null || p90 == null) {
      cCounts.unknown_count++;
      continue;
    }
    if (atr < p25) applyVolClass(cCounts, "low");
    else if (atr < p75) applyVolClass(cCounts, "normal");
    else if (atr < p90) applyVolClass(cCounts, "high");
    else applyVolClass(cCounts, "extreme");
  }

  const threshold_sensitivity: VolatilityThresholdSensitivityEntry[] = [
    {
      profile: "mql5_v1_simulated",
      description: "MQL5 V1 defaults: low < 80, high >= 250, extreme >= 400 (re-simulated from exported ATR)",
      thresholds: {
        low_below: MQL5_V1_ATR_THRESHOLDS.lowBelow,
        high_at: MQL5_V1_ATR_THRESHOLDS.highAt,
        extreme_at: MQL5_V1_ATR_THRESHOLDS.extremeAt,
      },
      counts: profileCounts.get("mql5_v1_simulated")!,
    },
    {
      profile: "profile_xauusd_m15_candidate_a",
      description: "XAUUSD M15 candidate A: low < 150, high >= 500, extreme >= 900",
      thresholds: { low_below: 150, high_at: 500, extreme_at: 900 },
      counts: profileCounts.get("profile_xauusd_m15_candidate_a")!,
    },
    {
      profile: "profile_xauusd_m15_candidate_b",
      description: "XAUUSD M15 candidate B: low < 200, high >= 700, extreme >= 1200",
      thresholds: { low_below: 200, high_at: 700, extreme_at: 1200 },
      counts: profileCounts.get("profile_xauusd_m15_candidate_b")!,
    },
    {
      profile: "profile_xauusd_m15_candidate_c",
      description: "Percentile-based on bundle ATR: low < p25, normal p25–p75, high p75–p90, extreme >= p90",
      thresholds: {
        low_below: p25,
        high_at: p75,
        extreme_at: p90,
        percentile_low_p25: p25,
        percentile_high_p75: p75,
        percentile_extreme_p90: p90,
      },
      counts: profileCounts.get("profile_xauusd_m15_candidate_c")!,
    },
  ];

  const avgEnvScore = envScoreCount > 0 ? envScoreSum / envScoreCount : null;
  const interpretation_flags = deriveInterpretationFlags(overall, threshold_sensitivity, avgEnvScore);

  const examples: ExecutionEnvironmentCalibrationExample[] = [];
  for (const c of exampleCats) examples.push(...(exampleBuckets.get(c) ?? []));

  return {
    ok: errors.length === 0,
    bundleName: input.bundleName,
    errors,
    warnings,
    overall,
    outcome_by_session_bucket: finalizeCrossTab(outcomeBySession),
    outcome_by_spread_bucket: finalizeCrossTab(outcomeBySpread),
    outcome_by_volatility_bucket: finalizeCrossTab(outcomeByVol),
    outcome_by_execution_environment_grade: finalizeCrossTab(outcomeByGrade),
    atr_points_stats: distStats(atrNums),
    range_points_stats: distStats(rangeNums),
    range_to_atr_ratio_stats: distStats(ratioNums),
    threshold_sensitivity,
    interpretation_flags,
    examples,
    research_only_note: RESEARCH_NOTE,
  };
}

export function flattenExecutionEnvironmentCalibrationAuditCsvRows(
  analysis: TestEaExecutionEnvironmentCalibrationAuditAnalysis,
): ExecutionEnvironmentCalibrationAuditCsvRow[] {
  const rows: ExecutionEnvironmentCalibrationAuditCsvRow[] = [];
  const b = analysis.bundleName;

  const push = (
    section: string,
    bucket: string,
    row_key: string,
    col_key: string,
    count: number,
    notes = "",
  ) => {
    rows.push({ bundle: b, section, bucket, row_key, col_key, count, notes });
  };

  push("overall", "trade_count", "", "", analysis.overall.trade_count);

  for (const [k, v] of Object.entries(analysis.overall.session_buckets)) {
    push("session_bucket", k, "", "", v);
  }
  for (const [k, v] of Object.entries(analysis.overall.spread_buckets)) {
    push("spread_bucket", k, "", "", v);
  }
  for (const [k, v] of Object.entries(analysis.overall.volatility_buckets)) {
    push("volatility_bucket", k, "", "", v);
  }
  for (const [k, v] of Object.entries(analysis.overall.execution_environment_grades)) {
    push("execution_environment_grade", k, "", "", v);
  }

  const addCrossRows = (section: string, table: EnvCalibrationCrossTabTable) => {
    for (const row of table.rows) {
      for (const col of table.columns) {
        push(section, "", row, col, table.counts[row]?.[col] ?? 0);
      }
    }
  };
  addCrossRows("outcome_by_session_bucket", analysis.outcome_by_session_bucket);
  addCrossRows("outcome_by_spread_bucket", analysis.outcome_by_spread_bucket);
  addCrossRows("outcome_by_volatility_bucket", analysis.outcome_by_volatility_bucket);
  addCrossRows("outcome_by_execution_environment_grade", analysis.outcome_by_execution_environment_grade);

  for (const p of analysis.threshold_sensitivity) {
    push("threshold_sensitivity", p.profile, "low_count", "", p.counts.low_count);
    push("threshold_sensitivity", p.profile, "normal_count", "", p.counts.normal_count);
    push("threshold_sensitivity", p.profile, "high_count", "", p.counts.high_count);
    push("threshold_sensitivity", p.profile, "extreme_count", "", p.counts.extreme_count);
    push("threshold_sensitivity", p.profile, "unknown_count", "", p.counts.unknown_count);
  }

  for (const flag of analysis.interpretation_flags) {
    push("interpretation_flag", flag, "", "", 1);
  }

  return rows;
}
