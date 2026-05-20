/**
 * E5.18.2 — Setup Readiness Decision Calibration Audit (read-only research).
 * Audits score/grade vs final decision consistency without changing MQL5 or checklist logic.
 */

import { buildTestEaBundleImportOptions, importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade } from "./backtest-types";

export interface TestEaSetupReadinessDecisionCalibrationAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface SetupReadinessCalibrationCrossTabTable {
  rows: string[];
  columns: string[];
  counts: Record<string, Record<string, number>>;
}

export const SETUP_READINESS_SCORE_BANDS = ["0-44", "45-69", "70-84", "85-100"] as const;
export type SetupReadinessScoreBand = (typeof SETUP_READINESS_SCORE_BANDS)[number];

export const SETUP_READINESS_HIGH_SCORE_MIN = 70;
export const SETUP_READINESS_LOW_SCORE_MAX_EXCLUSIVE = 45;

export const SETUP_READINESS_CRITICAL_BLOCKERS = [
  "pd_conflict",
  "ifvg_conflict",
  "target_missing",
  "environment_weak",
  "overtrading_warning",
  "entry_fragile",
] as const;

export type SetupReadinessCriticalBlockerId = (typeof SETUP_READINESS_CRITICAL_BLOCKERS)[number];

export interface SetupReadinessOverallCounts {
  trade_count: number;
  average_setup_readiness_score: number | null;
  min_setup_readiness_score: number | null;
  max_setup_readiness_score: number | null;
  decision_counts: Record<string, number>;
  grade_counts: Record<string, number>;
  average_blocker_count: number | null;
  average_warning_count: number | null;
}

export interface SetupReadinessScoreDecisionBuckets {
  high_score_reject_count: number;
  high_score_wait_count: number;
  low_score_candidate_count: number;
  grade_a_reject_count: number;
  grade_b_reject_count: number;
  grade_weak_candidate_count: number;
  decision_override_count: number;
}

export interface SetupReadinessCriticalBlockerStats {
  blocker: SetupReadinessCriticalBlockerId;
  reject_as_primary_count: number;
  high_score_reject_as_primary_count: number;
}

export interface SetupReadinessDecisionCalibrationExample {
  category:
    | "high_score_reject"
    | "grade_ab_reject"
    | "low_score_candidate"
    | "candidate_many_warnings"
    | "wait_strong_blocker";
  trade_id: string;
  outcome: string;
  setup_readiness_score: number | null;
  setup_readiness_grade: string;
  setup_readiness_decision: string;
  setup_readiness_primary_blocker: string;
  setup_readiness_blocker_count: number | null;
  setup_readiness_warning_count: number | null;
  setup_readiness_reasons: string;
  checklist_target_grade: string;
  checklist_execution_environment_grade: string;
  checklist_discipline_grade: string;
  checklist_ifvg_grade: string;
  checklist_entry_candidate_family: string;
}

export interface TestEaSetupReadinessDecisionCalibrationAuditAnalysis {
  ok: boolean;
  bundleName: string;
  errors: string[];
  warnings: string[];
  overall: SetupReadinessOverallCounts;
  score_decision_buckets: SetupReadinessScoreDecisionBuckets;
  grade_by_decision: SetupReadinessCalibrationCrossTabTable;
  score_band_by_decision: SetupReadinessCalibrationCrossTabTable;
  primary_blocker_by_decision: SetupReadinessCalibrationCrossTabTable;
  primary_blocker_by_grade: SetupReadinessCalibrationCrossTabTable;
  primary_blocker_by_score_band: SetupReadinessCalibrationCrossTabTable;
  critical_blocker_stats: SetupReadinessCriticalBlockerStats[];
  candidate_with_warnings_count: number;
  outcome_by_setup_readiness_decision: SetupReadinessCalibrationCrossTabTable;
  outcome_by_setup_readiness_grade: SetupReadinessCalibrationCrossTabTable;
  outcome_by_high_score_reject: SetupReadinessCalibrationCrossTabTable;
  outcome_by_primary_blocker: SetupReadinessCalibrationCrossTabTable;
  interpretation_flags: string[];
  examples: SetupReadinessDecisionCalibrationExample[];
  research_only_note: string;
}

export interface SetupReadinessDecisionCalibrationAuditCsvRow {
  bundle: string;
  section: string;
  bucket: string;
  row_key: string;
  col_key: string;
  count: number;
  notes: string;
}

const RESEARCH_NOTE =
  "E5.18.2 research-only audit over exported bundle data. Does not change MQL5, checklist scoring, decision logic, entry, TP, or approve any edge.";

const CANDIDATE_MANY_WARNINGS_THRESHOLD = 3;
const WAIT_STRONG_BLOCKER_MIN = 2;

function addCross(
  table: SetupReadinessCalibrationCrossTabTable,
  row: string,
  col: string,
): void {
  if (!table.rows.includes(row)) table.rows.push(row);
  if (!table.columns.includes(col)) table.columns.push(col);
  if (!table.counts[row]) table.counts[row] = {};
  table.counts[row]![col] = (table.counts[row]![col] ?? 0) + 1;
}

function finalizeCrossTab(
  table: SetupReadinessCalibrationCrossTabTable,
): SetupReadinessCalibrationCrossTabTable {
  table.rows.sort();
  table.columns.sort();
  return table;
}

function incBucket(map: Record<string, number>, key: string): void {
  const k = key.trim() || "unknown";
  map[k] = (map[k] ?? 0) + 1;
}

function normDecision(raw: string | undefined): string {
  const d = (raw ?? "").trim().toLowerCase();
  if (d === "candidate" || d === "wait" || d === "reject" || d === "unknown") return d;
  return d || "unknown";
}

function normGrade(raw: string | undefined): string {
  const g = (raw ?? "").trim();
  if (!g) return "unknown";
  const lower = g.toLowerCase();
  if (lower === "a") return "A";
  if (lower === "b") return "B";
  if (lower === "c") return "C";
  if (lower === "weak") return "Weak";
  if (lower === "none") return "None";
  return g;
}

function normBlocker(raw: string | undefined): string {
  const b = (raw ?? "").trim();
  if (!b || b === "-" || b.toLowerCase() === "none") return "none";
  return b;
}

export function setupReadinessScoreBand(score: number | null | undefined): SetupReadinessScoreBand | "unknown" {
  if (score == null || !Number.isFinite(score)) return "unknown";
  if (score < 45) return "0-44";
  if (score < 70) return "45-69";
  if (score < 85) return "70-84";
  return "85-100";
}

export function expectedSetupReadinessDecisionFromScore(
  score: number | null | undefined,
  thresholds?: { minCandidate: number; minWait: number },
): "candidate" | "wait" | "reject" | "unknown" {
  if (score == null || !Number.isFinite(score)) return "unknown";
  const minCandidate = thresholds?.minCandidate ?? SETUP_READINESS_HIGH_SCORE_MIN;
  const minWait = thresholds?.minWait ?? SETUP_READINESS_LOW_SCORE_MAX_EXCLUSIVE;
  if (score >= minCandidate) return "candidate";
  if (score >= minWait) return "wait";
  return "reject";
}

export function isHighSetupReadinessScore(score: number | null | undefined): boolean {
  return score != null && Number.isFinite(score) && score >= SETUP_READINESS_HIGH_SCORE_MIN;
}

export function isLowSetupReadinessScore(score: number | null | undefined): boolean {
  return score != null && Number.isFinite(score) && score < SETUP_READINESS_LOW_SCORE_MAX_EXCLUSIVE;
}

export function isSetupReadinessDecisionOverride(t: BacktestTrade): boolean {
  const score = t.setupReadinessScore;
  const expected = expectedSetupReadinessDecisionFromScore(score);
  const actual = normDecision(t.setupReadinessDecision);
  if (expected === "unknown" || actual === "unknown") return false;
  if (expected === actual) return false;
  const blockerCount = t.setupReadinessBlockerCount ?? 0;
  const primary = normBlocker(t.setupReadinessPrimaryBlocker);
  return primary !== "none" || blockerCount > 0;
}

function buildExample(
  t: BacktestTrade,
  category: SetupReadinessDecisionCalibrationExample["category"],
): SetupReadinessDecisionCalibrationExample {
  return {
    category,
    trade_id: t.tradeId,
    outcome: t.outcome?.trim() || "unknown",
    setup_readiness_score: t.setupReadinessScore ?? null,
    setup_readiness_grade: normGrade(t.setupReadinessGrade),
    setup_readiness_decision: normDecision(t.setupReadinessDecision),
    setup_readiness_primary_blocker: normBlocker(t.setupReadinessPrimaryBlocker),
    setup_readiness_blocker_count: t.setupReadinessBlockerCount ?? null,
    setup_readiness_warning_count: t.setupReadinessWarningCount ?? null,
    setup_readiness_reasons: t.setupReadinessReasons ?? "",
    checklist_target_grade: t.checklistTargetGrade?.trim() || "",
    checklist_execution_environment_grade: t.checklistExecutionEnvironmentGrade?.trim() || "",
    checklist_discipline_grade: t.checklistDisciplineGrade?.trim() || "",
    checklist_ifvg_grade: t.checklistIfvgGrade?.trim() || "",
    checklist_entry_candidate_family: t.checklistEntryCandidateFamily?.trim() || "",
  };
}

function deriveInterpretationFlags(
  overall: SetupReadinessOverallCounts,
  buckets: SetupReadinessScoreDecisionBuckets,
  criticalStats: SetupReadinessCriticalBlockerStats[],
): string[] {
  const flags: string[] = [];
  const n = overall.trade_count;
  if (n === 0) return flags;

  if (buckets.high_score_reject_count > 0) flags.push("HIGH_SCORE_REJECTS_PRESENT");
  if (buckets.low_score_candidate_count > 0) flags.push("LOW_SCORE_CANDIDATES_PRESENT");

  const overrideShare = buckets.decision_override_count / n;
  const criticalRejectTotal = criticalStats.reduce((s, c) => s + c.reject_as_primary_count, 0);
  if (buckets.decision_override_count > 0 && criticalRejectTotal > 0) {
    flags.push("CRITICAL_BLOCKERS_OVERRIDE_SCORE");
  }

  const pd = criticalStats.find((c) => c.blocker === "pd_conflict");
  if (pd && buckets.high_score_reject_count > 0) {
    const pdShare = pd.high_score_reject_as_primary_count / buckets.high_score_reject_count;
    if (pdShare >= 0.35) flags.push("PD_CONFLICT_HARD_OVERRIDE_SUSPECTED");
  }

  const inconsistent =
    buckets.high_score_reject_count +
    buckets.high_score_wait_count +
    buckets.low_score_candidate_count +
    buckets.grade_a_reject_count;
  if (inconsistent / n >= 0.05 || buckets.grade_a_reject_count >= 5) {
    flags.push("DECISION_SCORE_CALIBRATION_REVIEW_NEEDED");
  }

  if (
    buckets.high_score_reject_count > 0 &&
    overrideShare >= 0.1 &&
    flags.includes("CRITICAL_BLOCKERS_OVERRIDE_SCORE")
  ) {
    flags.push("CHECKLIST_READY_FOR_DASHBOARD_WITH_EXPLANATION");
  }

  return [...new Set(flags)];
}

export function analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
  input: TestEaSetupReadinessDecisionCalibrationAuditBundleTextInput,
  options?: { maxExamples?: number },
): TestEaSetupReadinessDecisionCalibrationAuditAnalysis {
  const maxExamples = options?.maxExamples ?? 10;
  const errors: string[] = [];
  const warnings: string[] = [];

  let summaryJson: Record<string, unknown> = {};
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    errors.push("invalid JSON in summaryJsonText");
  }

  if (summaryJson["has_setup_readiness_checklist_v1_logic"] !== true) {
    warnings.push(
      "summary missing has_setup_readiness_checklist_v1_logic=true (proceeding from trades CSV)",
    );
  }

  const importOptions = buildTestEaBundleImportOptions(
    summaryJson,
    input.bundleName,
    "setup-readiness-decision-cal-audit",
  );
  const imported = importBacktestTradesFromCsv(input.tradesCsvText, importOptions);
  if (!imported.ok) {
    errors.push(...imported.errors.map((e) => e.message));
  }
  warnings.push(...imported.warnings.map((w) => w.message));

  const trades = imported.trades;
  if (trades.length === 0) errors.push("no trades imported");

  const sample = trades[0];
  if (sample && sample.setupReadinessChecklistEnabled === undefined) {
    errors.push("trades CSV missing setup_readiness_checklist_enabled (E5.18 columns required)");
  }

  const overall: SetupReadinessOverallCounts = {
    trade_count: trades.length,
    average_setup_readiness_score: null,
    min_setup_readiness_score: null,
    max_setup_readiness_score: null,
    decision_counts: {},
    grade_counts: {},
    average_blocker_count: null,
    average_warning_count: null,
  };

  const score_decision_buckets: SetupReadinessScoreDecisionBuckets = {
    high_score_reject_count: 0,
    high_score_wait_count: 0,
    low_score_candidate_count: 0,
    grade_a_reject_count: 0,
    grade_b_reject_count: 0,
    grade_weak_candidate_count: 0,
    decision_override_count: 0,
  };

  const gradeByDecision: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const bandByDecision: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const blockerByDecision: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const blockerByGrade: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const blockerByBand: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByDecision: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByGrade: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByHighReject: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  const outcomeByBlocker: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };

  const criticalMap = new Map<SetupReadinessCriticalBlockerId, SetupReadinessCriticalBlockerStats>();
  for (const b of SETUP_READINESS_CRITICAL_BLOCKERS) {
    criticalMap.set(b, { blocker: b, reject_as_primary_count: 0, high_score_reject_as_primary_count: 0 });
  }

  let scoreSum = 0;
  let scoreCount = 0;
  let blockerSum = 0;
  let blockerCountN = 0;
  let warningSum = 0;
  let warningCountN = 0;
  let candidateWithWarnings = 0;

  const exampleCats: SetupReadinessDecisionCalibrationExample["category"][] = [
    "high_score_reject",
    "grade_ab_reject",
    "low_score_candidate",
    "candidate_many_warnings",
    "wait_strong_blocker",
  ];
  const exampleBuckets = new Map<
    SetupReadinessDecisionCalibrationExample["category"],
    SetupReadinessDecisionCalibrationExample[]
  >();
  for (const c of exampleCats) exampleBuckets.set(c, []);

  for (const t of trades) {
    const outcome = t.outcome?.trim() || "unknown";
    const decision = normDecision(t.setupReadinessDecision);
    const grade = normGrade(t.setupReadinessGrade);
    const score = t.setupReadinessScore;
    const band = setupReadinessScoreBand(score);
    const primary = normBlocker(t.setupReadinessPrimaryBlocker);
    const warningCount = t.setupReadinessWarningCount ?? 0;
    const blockerCount = t.setupReadinessBlockerCount ?? 0;

    incBucket(overall.decision_counts, decision);
    incBucket(overall.grade_counts, grade);

    if (score != null && Number.isFinite(score)) {
      scoreSum += score;
      scoreCount++;
      if (overall.min_setup_readiness_score == null || score < overall.min_setup_readiness_score) {
        overall.min_setup_readiness_score = score;
      }
      if (overall.max_setup_readiness_score == null || score > overall.max_setup_readiness_score) {
        overall.max_setup_readiness_score = score;
      }
    }

    if (t.setupReadinessBlockerCount != null && Number.isFinite(t.setupReadinessBlockerCount)) {
      blockerSum += t.setupReadinessBlockerCount;
      blockerCountN++;
    }
    if (t.setupReadinessWarningCount != null && Number.isFinite(t.setupReadinessWarningCount)) {
      warningSum += t.setupReadinessWarningCount;
      warningCountN++;
    }

    addCross(gradeByDecision, grade, decision);
    if (band !== "unknown") addCross(bandByDecision, band, decision);
    addCross(blockerByDecision, primary, decision);
    addCross(blockerByGrade, primary, grade);
    if (band !== "unknown") addCross(blockerByBand, primary, band);

    addCross(outcomeByDecision, outcome, decision);
    addCross(outcomeByGrade, outcome, grade);
    addCross(outcomeByBlocker, outcome, primary);

    const highReject = isHighSetupReadinessScore(score) && decision === "reject";
    addCross(outcomeByHighReject, outcome, highReject ? "high_score_reject" : "other");

    if (highReject) score_decision_buckets.high_score_reject_count++;
    if (isHighSetupReadinessScore(score) && decision === "wait") {
      score_decision_buckets.high_score_wait_count++;
    }
    if (isLowSetupReadinessScore(score) && decision === "candidate") {
      score_decision_buckets.low_score_candidate_count++;
    }
    if (grade === "A" && decision === "reject") score_decision_buckets.grade_a_reject_count++;
    if (grade === "B" && decision === "reject") score_decision_buckets.grade_b_reject_count++;
    if (grade === "Weak" && decision === "candidate") score_decision_buckets.grade_weak_candidate_count++;

    if (isSetupReadinessDecisionOverride(t)) score_decision_buckets.decision_override_count++;

    if (decision === "candidate" && warningCount > 0) candidateWithWarnings++;

    for (const cb of SETUP_READINESS_CRITICAL_BLOCKERS) {
      if (primary !== cb) continue;
      const st = criticalMap.get(cb)!;
      if (decision === "reject") st.reject_as_primary_count++;
      if (highReject) st.high_score_reject_as_primary_count++;
    }

    if (highReject) {
      const ex = exampleBuckets.get("high_score_reject")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "high_score_reject"));
    }
    if ((grade === "A" || grade === "B") && decision === "reject") {
      const ex = exampleBuckets.get("grade_ab_reject")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "grade_ab_reject"));
    }
    if (isLowSetupReadinessScore(score) && decision === "candidate") {
      const ex = exampleBuckets.get("low_score_candidate")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "low_score_candidate"));
    }
    if (decision === "candidate" && warningCount >= CANDIDATE_MANY_WARNINGS_THRESHOLD) {
      const ex = exampleBuckets.get("candidate_many_warnings")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "candidate_many_warnings"));
    }
    if (
      decision === "wait" &&
      (blockerCount >= WAIT_STRONG_BLOCKER_MIN ||
        SETUP_READINESS_CRITICAL_BLOCKERS.includes(primary as SetupReadinessCriticalBlockerId))
    ) {
      const ex = exampleBuckets.get("wait_strong_blocker")!;
      if (ex.length < maxExamples) ex.push(buildExample(t, "wait_strong_blocker"));
    }
  }

  overall.average_setup_readiness_score = scoreCount > 0 ? scoreSum / scoreCount : null;
  overall.average_blocker_count = blockerCountN > 0 ? blockerSum / blockerCountN : null;
  overall.average_warning_count = warningCountN > 0 ? warningSum / warningCountN : null;

  const critical_blocker_stats = [...criticalMap.values()];
  const interpretation_flags = deriveInterpretationFlags(
    overall,
    score_decision_buckets,
    critical_blocker_stats,
  );

  if (candidateWithWarnings > 0 && !interpretation_flags.includes("CANDIDATES_WITH_WARNINGS_PRESENT")) {
    interpretation_flags.push("CANDIDATES_WITH_WARNINGS_PRESENT");
  }

  const examples: SetupReadinessDecisionCalibrationExample[] = [];
  for (const c of exampleCats) examples.push(...(exampleBuckets.get(c) ?? []));

  return {
    ok: errors.length === 0,
    bundleName: input.bundleName,
    errors,
    warnings,
    overall,
    score_decision_buckets,
    grade_by_decision: finalizeCrossTab(gradeByDecision),
    score_band_by_decision: finalizeCrossTab(bandByDecision),
    primary_blocker_by_decision: finalizeCrossTab(blockerByDecision),
    primary_blocker_by_grade: finalizeCrossTab(blockerByGrade),
    primary_blocker_by_score_band: finalizeCrossTab(blockerByBand),
    critical_blocker_stats,
    candidate_with_warnings_count: candidateWithWarnings,
    outcome_by_setup_readiness_decision: finalizeCrossTab(outcomeByDecision),
    outcome_by_setup_readiness_grade: finalizeCrossTab(outcomeByGrade),
    outcome_by_high_score_reject: finalizeCrossTab(outcomeByHighReject),
    outcome_by_primary_blocker: finalizeCrossTab(outcomeByBlocker),
    interpretation_flags,
    examples,
    research_only_note: RESEARCH_NOTE,
  };
}

export function flattenSetupReadinessDecisionCalibrationAuditCsvRows(
  analysis: TestEaSetupReadinessDecisionCalibrationAuditAnalysis,
): SetupReadinessDecisionCalibrationAuditCsvRow[] {
  const rows: SetupReadinessDecisionCalibrationAuditCsvRow[] = [];
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
  if (analysis.overall.average_setup_readiness_score != null) {
    push(
      "overall",
      "average_setup_readiness_score",
      "",
      "",
      Math.round(analysis.overall.average_setup_readiness_score * 1e6),
      String(analysis.overall.average_setup_readiness_score),
    );
  }

  for (const [k, v] of Object.entries(analysis.overall.decision_counts)) {
    push("decision_count", k, "", "", v);
  }
  for (const [k, v] of Object.entries(analysis.overall.grade_counts)) {
    push("grade_count", k, "", "", v);
  }

  for (const [k, v] of Object.entries(analysis.score_decision_buckets)) {
    if (typeof v === "number") push("score_decision_bucket", k, "", "", v);
  }

  const addCrossRows = (section: string, table: SetupReadinessCalibrationCrossTabTable) => {
    for (const row of table.rows) {
      for (const col of table.columns) {
        push(section, "", row, col, table.counts[row]?.[col] ?? 0);
      }
    }
  };
  addCrossRows("grade_by_decision", analysis.grade_by_decision);
  addCrossRows("score_band_by_decision", analysis.score_band_by_decision);
  addCrossRows("primary_blocker_by_decision", analysis.primary_blocker_by_decision);
  addCrossRows("outcome_by_setup_readiness_decision", analysis.outcome_by_setup_readiness_decision);
  addCrossRows("outcome_by_high_score_reject", analysis.outcome_by_high_score_reject);

  for (const c of analysis.critical_blocker_stats) {
    push("critical_blocker", c.blocker, "reject_as_primary", "", c.reject_as_primary_count);
    push(
      "critical_blocker",
      c.blocker,
      "high_score_reject_as_primary",
      "",
      c.high_score_reject_as_primary_count,
    );
  }

  push(
    "overall",
    "candidate_with_warnings_count",
    "",
    "",
    analysis.candidate_with_warnings_count,
  );

  for (const flag of analysis.interpretation_flags) {
    push("interpretation_flag", flag, "", "", 1);
  }

  return rows;
}
