/**
 * E5.22.2 — Setup Performance Baseline Audit (read-only research).
 * Analyzes official and diagnostic dimensions from TestEA bundle export without changing strategy.
 */

import { buildTestEaBundleImportOptions, importBacktestTradesFromCsv } from "./backtest-importer";
import {
  calculateExpectancyR,
  calculateMaxDrawdownR,
  calculateTotalR,
} from "./backtest-metrics";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";
import {
  isHighSetupReadinessScore,
  SETUP_READINESS_HIGH_SCORE_MIN,
} from "./testea-setup-readiness-decision-calibration-audit";

export const SETUP_PERFORMANCE_BASELINE_AUDIT_SCHEMA = "mapazapp_setup_performance_baseline_audit_v1";

export interface TestEaSetupPerformanceBaselineAuditBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface SetupPerformanceGroupStats {
  key: string;
  count: number;
  win_count: number;
  loss_count: number;
  ambiguous_count: number;
  expired_unfilled_count: number;
  expired_open_count: number;
  total_r: number;
  avg_r: number;
  winrate: number;
  expectancy_r: number;
  avg_setup_readiness_score: number | null;
  avg_warning_count: number | null;
  avg_blocker_count: number | null;
}

export interface GroupedPerformanceSection {
  groups: SetupPerformanceGroupStats[];
  notes: string[];
}

export interface OfficialPerformanceSnapshot {
  trade_count: number;
  win_count: number;
  loss_count: number;
  ambiguous_count: number;
  expired_unfilled_count: number;
  expired_open_count: number;
  total_r: number;
  avg_r: number;
  min_r: number;
  max_r: number;
  winrate: number;
  expectancy_r: number;
  max_drawdown_r: number | null;
  total_result_r: number | null;
  official_entry: string;
  official_tp: string;
}

export interface BlockerPerformanceSection extends GroupedPerformanceSection {
  positive_avg_r_blockers: string[];
  negative_avg_r_blockers: string[];
  high_score_reject_wins: number;
  high_score_reject_losses: number;
  rejected_trades_positive_r_count: number;
  candidate_trades_negative_r_count: number;
}

export interface VariantResearchMetrics {
  variant_id: string;
  research_only: boolean;
  filled_count: number | null;
  win_count: number | null;
  loss_count: number | null;
  ambiguous_count: number | null;
  not_filled_count: number | null;
  winrate: number | null;
  expectancy_r: number | null;
  total_r: number | null;
  invalid_risk_count: number | null;
  fragile_count: number | null;
  effective_rr_avg: number | null;
  source: "summary" | "trades_csv" | "mixed";
  notes: string[];
}

export interface AmbiguityAnalysisSection {
  ambiguous_count: number;
  ambiguous_rate: number;
  ambiguous_total_r: number;
  ambiguous_avg_r: number;
  decisive_excluding_ambiguous_winrate: number | null;
  by_readiness_decision: GroupedPerformanceSection;
  by_primary_blocker: GroupedPerformanceSection;
  by_session_bucket: GroupedPerformanceSection;
  by_volatility_bucket: GroupedPerformanceSection;
  notes: string[];
}

export interface OvertradingAnalysisSection {
  from_summary: Record<string, number | null>;
  daily_stats: {
    day_count: number;
    days_negative: number;
    days_positive: number;
    days_above_trade_limit: number;
    worst_daily_r: number | null;
    best_daily_r: number | null;
    avg_r_on_over_limit_days: number | null;
    avg_r_on_normal_days: number | null;
  };
  overtrading_risk_group: GroupedPerformanceSection;
  revenge_trade_risk_group: GroupedPerformanceSection;
  notes: string[];
}

export interface DrawdownDailyRAnalysis {
  max_drawdown_r: number;
  daily_r_by_date: { date: string; trade_count: number; total_r: number }[];
  notes: string[];
}

export interface SetupPerformanceBaselineExample {
  category: string;
  trade_id: string;
  outcome: string;
  result_r: number;
  setup_readiness_decision: string;
  setup_readiness_score: number | null;
  setup_readiness_grade: string;
  setup_readiness_primary_blocker: string;
  ifvg_grade: string;
  target_grade: string;
  environment_grade: string;
  discipline_grade: string;
  session_bucket: string;
  volatility_bucket: string;
  top_reasons: string;
}

export interface TestEaSetupPerformanceBaselineAuditResult {
  ok: boolean;
  schema_version: string;
  bundle: string;
  ea_build: string;
  symbol: string;
  timeframe: string;
  trade_count: number;
  official_performance: OfficialPerformanceSnapshot;
  outcome_distribution: Record<string, number>;
  readiness_performance: {
    by_decision: GroupedPerformanceSection;
    by_grade: GroupedPerformanceSection;
  };
  blocker_performance: BlockerPerformanceSection;
  grade_performance: {
    ifvg_bisi_sibi_grade: GroupedPerformanceSection;
    liquidity_target_grade: GroupedPerformanceSection;
    execution_environment_grade: GroupedPerformanceSection;
    discipline_grade: GroupedPerformanceSection;
    entry_fill_feasibility_grade: GroupedPerformanceSection;
    premium_discount_grade: GroupedPerformanceSection;
  };
  target_performance: GroupedPerformanceSection & {
    by_supported: GroupedPerformanceSection;
    by_reached_by_tp: GroupedPerformanceSection;
    by_tp_before_nearest: GroupedPerformanceSection;
    by_tp_beyond_nearest: GroupedPerformanceSection;
    by_nearest_type: GroupedPerformanceSection;
  };
  environment_performance: {
    by_session_bucket: GroupedPerformanceSection;
    by_session_phase: GroupedPerformanceSection;
    by_spread_bucket: GroupedPerformanceSection;
    by_volatility_bucket: GroupedPerformanceSection;
    by_execution_environment_grade: GroupedPerformanceSection;
  };
  discipline_performance: {
    by_discipline_grade: GroupedPerformanceSection;
    by_overtrading_risk: GroupedPerformanceSection;
    by_revenge_trade_risk: GroupedPerformanceSection;
    by_daily_loss_limit_reached: GroupedPerformanceSection;
    by_session_trade_limit_reached: GroupedPerformanceSection;
    by_daily_trade_limit_reached: GroupedPerformanceSection;
  };
  ifvg_performance: {
    by_ifvg_grade: GroupedPerformanceSection;
    by_ifvg_conflict: GroupedPerformanceSection;
    by_ifvg_valid_for_direction: GroupedPerformanceSection;
    by_inversion_confirmed_close: GroupedPerformanceSection;
    by_retest_detected: GroupedPerformanceSection;
  };
  session_performance: GroupedPerformanceSection;
  volatility_performance: GroupedPerformanceSection;
  entry_fill_performance: GroupedPerformanceSection;
  near_miss_performance: GroupedPerformanceSection;
  variant_research_comparison: {
    variants: VariantResearchMetrics[];
    notes: string[];
  };
  ambiguity_analysis: AmbiguityAnalysisSection;
  overtrading_analysis: OvertradingAnalysisSection;
  drawdown_daily_r_analysis: DrawdownDailyRAnalysis;
  hypotheses: string[];
  flags: string[];
  examples: Record<string, SetupPerformanceBaselineExample[]>;
  errors: string[];
  warnings: string[];
  research_only_note: string;
}

export interface SetupPerformanceBaselineAuditCsvRow {
  section: string;
  key: string;
  count: number;
  win_count: number;
  loss_count: number;
  ambiguous_count: number;
  expired_unfilled_count: number;
  total_r: number;
  avg_r: number;
  winrate: number;
  notes: string;
}

const RESEARCH_NOTE =
  "E5.22.2 research-only baseline audit. Does not approve edge/25/adaptive, change entry/TP, add gates, or authorize live trading.";

function readSummaryString(summary: Record<string, unknown>, key: string): string | undefined {
  const v = summary[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function readSummaryNumber(summary: Record<string, unknown>, key: string): number | null {
  const v = summary[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function normOutcome(raw: string | undefined): string {
  const o = (raw ?? "").trim().toLowerCase();
  return o || "unknown";
}

function normGrade(raw: string | undefined): string {
  const g = (raw ?? "").trim();
  if (!g) return "None";
  const lower = g.toLowerCase();
  if (lower === "a") return "A";
  if (lower === "b") return "B";
  if (lower === "c") return "C";
  if (lower === "weak") return "Weak";
  if (lower === "none") return "None";
  return g;
}

function normDecision(raw: string | undefined): string {
  const d = (raw ?? "").trim().toLowerCase();
  if (d === "candidate" || d === "wait" || d === "reject" || d === "unknown") return d;
  return d || "unknown";
}

function normBlocker(raw: string | undefined): string {
  const b = (raw ?? "").trim();
  if (!b || b === "-" || b.toLowerCase() === "none" || b.toLowerCase() === "blank") return "none";
  return b;
}

function boolKey(v: boolean | undefined): string {
  if (v === true) return "true";
  if (v === false) return "false";
  return "unknown";
}

function buildGroupStats(key: string, trades: BacktestTrade[]): SetupPerformanceGroupStats {
  let win = 0;
  let loss = 0;
  let amb = 0;
  let expUnfilled = 0;
  let expOpen = 0;
  let totalR = 0;
  let scoreSum = 0;
  let scoreN = 0;
  let warnSum = 0;
  let warnN = 0;
  let blockSum = 0;
  let blockN = 0;
  let minR = 0;
  let maxR = 0;
  let first = true;

  for (const t of trades) {
    const o = normOutcome(t.outcome);
    if (o === "win") win++;
    else if (o === "loss") loss++;
    else if (o === "ambiguous") amb++;
    else if (o === "expired_unfilled") expUnfilled++;
    else if (o === "expired_open") expOpen++;

    totalR += t.resultR;
    if (first) {
      minR = t.resultR;
      maxR = t.resultR;
      first = false;
    } else {
      if (t.resultR < minR) minR = t.resultR;
      if (t.resultR > maxR) maxR = t.resultR;
    }

    if (t.setupReadinessScore != null && Number.isFinite(t.setupReadinessScore)) {
      scoreSum += t.setupReadinessScore;
      scoreN++;
    }
    if (t.setupReadinessWarningCount != null && Number.isFinite(t.setupReadinessWarningCount)) {
      warnSum += t.setupReadinessWarningCount;
      warnN++;
    }
    if (t.setupReadinessBlockerCount != null && Number.isFinite(t.setupReadinessBlockerCount)) {
      blockSum += t.setupReadinessBlockerCount;
      blockN++;
    }
  }

  const n = trades.length;
  const decisive = win + loss;
  return {
    key,
    count: n,
    win_count: win,
    loss_count: loss,
    ambiguous_count: amb,
    expired_unfilled_count: expUnfilled,
    expired_open_count: expOpen,
    total_r: totalR,
    avg_r: n > 0 ? totalR / n : 0,
    winrate: decisive > 0 ? win / decisive : 0,
    expectancy_r: n > 0 ? totalR / n : 0,
    avg_setup_readiness_score: scoreN > 0 ? scoreSum / scoreN : null,
    avg_warning_count: warnN > 0 ? warnSum / warnN : null,
    avg_blocker_count: blockN > 0 ? blockSum / blockN : null,
  };
}

function groupTrades(trades: BacktestTrade[], keyFn: (t: BacktestTrade) => string): Map<string, BacktestTrade[]> {
  const map = new Map<string, BacktestTrade[]>();
  for (const t of trades) {
    const k = keyFn(t);
    const arr = map.get(k);
    if (arr) arr.push(t);
    else map.set(k, [t]);
  }
  return map;
}

function buildGroupedSection(
  trades: BacktestTrade[],
  keyFn: (t: BacktestTrade) => string,
  notes: string[] = [],
): GroupedPerformanceSection {
  const map = groupTrades(trades, keyFn);
  const groups = [...map.entries()]
    .map(([key, rows]) => buildGroupStats(key, rows))
    .sort((a, b) => b.count - a.count);
  return { groups, notes };
}

function buildExample(t: BacktestTrade): SetupPerformanceBaselineExample {
  return {
    category: "",
    trade_id: t.tradeId,
    outcome: normOutcome(t.outcome),
    result_r: t.resultR,
    setup_readiness_decision: normDecision(t.setupReadinessDecision),
    setup_readiness_score: t.setupReadinessScore ?? null,
    setup_readiness_grade: normGrade(t.setupReadinessGrade),
    setup_readiness_primary_blocker: normBlocker(t.setupReadinessPrimaryBlocker),
    ifvg_grade: normGrade(t.ifvgBisiSibiGrade ?? t.checklistIfvgGrade),
    target_grade: normGrade(t.liquidityTargetGrade ?? t.checklistTargetGrade),
    environment_grade: normGrade(t.executionEnvironmentGrade ?? t.checklistExecutionEnvironmentGrade),
    discipline_grade: normGrade(t.disciplineGrade ?? t.checklistDisciplineGrade),
    session_bucket: (t.sessionBucket ?? t.disciplineSessionBucket ?? "unknown").trim() || "unknown",
    volatility_bucket: (t.volatilityBucket ?? "unknown").trim() || "unknown",
    top_reasons: (t.setupReadinessReasons ?? t.ifvgBisiSibiReasons ?? "").slice(0, 200),
  };
}

function pushExample(
  buckets: Map<string, SetupPerformanceBaselineExample[]>,
  category: string,
  t: BacktestTrade,
  maxExamples: number,
): void {
  const list = buckets.get(category) ?? [];
  if (list.length >= maxExamples) return;
  const ex = buildExample(t);
  ex.category = category;
  list.push(ex);
  buckets.set(category, list);
}

function variantSlotFromTrade(
  t: BacktestTrade,
  id: "edge" | "25" | "50" | "75" | "adaptive",
): EntryVariantOutcomeSimSlot | undefined {
  const sim = t.entryVariantOutcomeSim;
  if (!sim?.enabled) return undefined;
  if (id === "edge") return sim.edge;
  if (id === "25") return sim.p25;
  if (id === "50") return sim.p50;
  if (id === "75") return sim.p75;
  return sim.adaptive;
}

function variantStatusClass(status: string | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return "other";
  if (s === "win" || s === "loss" || s === "ambiguous" || s === "not_filled" || s === "invalid_risk") return s;
  if (s === "expired_unfilled" || s === "expired_open") return "not_filled";
  return s;
}

function aggregateVariantFromTrades(
  trades: BacktestTrade[],
  variantId: "edge" | "25" | "50" | "75" | "adaptive",
): VariantResearchMetrics | null {
  let hasAny = false;
  let filled = 0;
  let win = 0;
  let loss = 0;
  let amb = 0;
  let notFilled = 0;
  let invalid = 0;
  let totalR = 0;
  let rrSum = 0;
  let rrN = 0;

  for (const t of trades) {
    const slot = variantSlotFromTrade(t, variantId);
    if (!slot?.status) continue;
    hasAny = true;
    const st = variantStatusClass(slot.status);
    const r = slot.resultR ?? 0;
    if (st !== "not_filled" && st !== "invalid_risk") filled++;
    if (st === "win") win++;
    else if (st === "loss") loss++;
    else if (st === "ambiguous") amb++;
    else if (st === "not_filled") notFilled++;
    else if (st === "invalid_risk") invalid++;
    if (st !== "not_filled") totalR += r;
    if (slot.effectiveRr != null && Number.isFinite(slot.effectiveRr)) {
      rrSum += slot.effectiveRr;
      rrN++;
    }
  }

  if (!hasAny) return null;
  const decisive = win + loss;
  return {
    variant_id: variantId,
    research_only: variantId !== "50",
    filled_count: filled,
    win_count: win,
    loss_count: loss,
    ambiguous_count: amb,
    not_filled_count: notFilled,
    winrate: decisive > 0 ? win / decisive : null,
    expectancy_r: filled > 0 ? totalR / filled : null,
    total_r: totalR,
    invalid_risk_count: invalid,
    fragile_count: null,
    effective_rr_avg: rrN > 0 ? rrSum / rrN : null,
    source: "trades_csv",
    notes: [],
  };
}

function variantFromSummary(
  summary: Record<string, unknown>,
  variantId: string,
  prefix: string,
): VariantResearchMetrics {
  const win = readSummaryNumber(summary, `${prefix}win_count`);
  const loss = readSummaryNumber(summary, `${prefix}loss_count`);
  const amb = readSummaryNumber(summary, `${prefix}ambiguous_count`);
  const filled = readSummaryNumber(summary, `${prefix}filled_count`);
  const notFilled = readSummaryNumber(summary, `${prefix}not_filled_count`);
  const winrate = readSummaryNumber(summary, `${prefix}winrate`);
  const expectancy = readSummaryNumber(summary, `${prefix}expectancy_r`);
  const decisive = (win ?? 0) + (loss ?? 0);
  return {
    variant_id: variantId,
    research_only: variantId !== "50",
    filled_count: filled,
    win_count: win,
    loss_count: loss,
    ambiguous_count: amb,
    not_filled_count: notFilled,
    winrate: winrate ?? (decisive > 0 && win != null ? win / decisive : null),
    expectancy_r: expectancy,
    total_r: null,
    invalid_risk_count: readSummaryNumber(summary, `${prefix}invalid_risk_count`),
    fragile_count: readSummaryNumber(summary, `${prefix}fragile_count`),
    effective_rr_avg: readSummaryNumber(summary, `${prefix}effective_rr_avg`),
    source: "summary",
    notes: [],
  };
}

function buildOfficialPerformance(
  summary: Record<string, unknown>,
  trades: BacktestTrade[],
): OfficialPerformanceSnapshot {
  const win = readSummaryNumber(summary, "win_count") ?? trades.filter((t) => normOutcome(t.outcome) === "win").length;
  const loss =
    readSummaryNumber(summary, "loss_count") ?? trades.filter((t) => normOutcome(t.outcome) === "loss").length;
  const amb =
    readSummaryNumber(summary, "ambiguous_count") ??
    trades.filter((t) => normOutcome(t.outcome) === "ambiguous").length;
  const expUnfilled =
    readSummaryNumber(summary, "expired_unfilled") ??
    readSummaryNumber(summary, "expired_unfilled_count") ??
    trades.filter((t) => normOutcome(t.outcome) === "expired_unfilled").length;
  const expOpen =
    readSummaryNumber(summary, "expired_open") ??
    readSummaryNumber(summary, "expired_open_count") ??
    trades.filter((t) => normOutcome(t.outcome) === "expired_open").length;
  const n = readSummaryNumber(summary, "trade_count") ?? trades.length;
  const totalR = readSummaryNumber(summary, "total_r") ?? readSummaryNumber(summary, "total_result_r") ?? calculateTotalR(trades);
  const avgR = readSummaryNumber(summary, "avg_r") ?? readSummaryNumber(summary, "expectancy_r") ?? (n > 0 ? totalR / n : 0);
  const decisive = win + loss;
  const winrate = readSummaryNumber(summary, "winrate") ?? (decisive > 0 ? win / decisive : 0);

  let minR = readSummaryNumber(summary, "min_r");
  let maxR = readSummaryNumber(summary, "max_r");
  if (minR == null || maxR == null) {
    for (const t of trades) {
      if (minR == null || t.resultR < minR) minR = t.resultR;
      if (maxR == null || t.resultR > maxR) maxR = t.resultR;
    }
  }

  const sorted = [...trades].sort((a, b) => a.entryTime.localeCompare(b.entryTime));

  return {
    trade_count: n,
    win_count: win,
    loss_count: loss,
    ambiguous_count: amb,
    expired_unfilled_count: expUnfilled,
    expired_open_count: expOpen,
    total_r: totalR,
    avg_r: avgR,
    min_r: minR ?? 0,
    max_r: maxR ?? 0,
    winrate,
    expectancy_r: readSummaryNumber(summary, "expectancy_r") ?? calculateExpectancyR(trades),
    max_drawdown_r: readSummaryNumber(summary, "max_drawdown_r") ?? calculateMaxDrawdownR(sorted),
    total_result_r: readSummaryNumber(summary, "total_result_r") ?? totalR,
    official_entry: "50% / CE",
    official_tp: "RR2",
  };
}

function buildBlockerPerformance(trades: BacktestTrade[]): BlockerPerformanceSection {
  const byBlocker = buildGroupedSection(trades, (t) => normBlocker(t.setupReadinessPrimaryBlocker));
  const positive = byBlocker.groups.filter((g) => g.count >= 5 && g.avg_r > 0).map((g) => g.key);
  const negative = byBlocker.groups.filter((g) => g.count >= 5 && g.avg_r < 0).map((g) => g.key);

  let highScoreRejectWins = 0;
  let highScoreRejectLosses = 0;
  let rejectedPositiveR = 0;
  let candidateNegativeR = 0;

  for (const t of trades) {
    const decision = normDecision(t.setupReadinessDecision);
    const highReject = isHighSetupReadinessScore(t.setupReadinessScore) && decision === "reject";
    const o = normOutcome(t.outcome);
    if (highReject && o === "win") highScoreRejectWins++;
    if (highReject && o === "loss") highScoreRejectLosses++;
    if (decision === "reject" && t.resultR > 0) rejectedPositiveR++;
    if (decision === "candidate" && t.resultR < 0) candidateNegativeR++;
  }

  return {
    ...byBlocker,
    positive_avg_r_blockers: positive,
    negative_avg_r_blockers: negative,
    high_score_reject_wins: highScoreRejectWins,
    high_score_reject_losses: highScoreRejectLosses,
    rejected_trades_positive_r_count: rejectedPositiveR,
    candidate_trades_negative_r_count: candidateNegativeR,
    notes: [
      "Blockers with positive avg_r may be noisy labels or mixed with winning official outcomes.",
      `High-score rejects (score>=${SETUP_READINESS_HIGH_SCORE_MIN}): wins=${highScoreRejectWins} losses=${highScoreRejectLosses}.`,
    ],
  };
}

function buildAmbiguityAnalysis(trades: BacktestTrade[]): AmbiguityAnalysisSection {
  const ambTrades = trades.filter((t) => normOutcome(t.outcome) === "ambiguous");
  const ambCount = ambTrades.length;
  const ambTotalR = ambTrades.reduce((s, t) => s + t.resultR, 0);
  const decisive = trades.filter((t) => {
    const o = normOutcome(t.outcome);
    return o === "win" || o === "loss";
  });
  const decisiveWins = decisive.filter((t) => normOutcome(t.outcome) === "win").length;

  return {
    ambiguous_count: ambCount,
    ambiguous_rate: trades.length > 0 ? ambCount / trades.length : 0,
    ambiguous_total_r: ambTotalR,
    ambiguous_avg_r: ambCount > 0 ? ambTotalR / ambCount : 0,
    decisive_excluding_ambiguous_winrate:
      decisive.length > 0 ? decisiveWins / decisive.length : null,
    by_readiness_decision: buildGroupedSection(ambTrades, (t) => normDecision(t.setupReadinessDecision)),
    by_primary_blocker: buildGroupedSection(ambTrades, (t) => normBlocker(t.setupReadinessPrimaryBlocker)),
    by_session_bucket: buildGroupedSection(
      ambTrades,
      (t) => (t.sessionBucket ?? "unknown").trim() || "unknown",
    ),
    by_volatility_bucket: buildGroupedSection(
      ambTrades,
      (t) => (t.volatilityBucket ?? "unknown").trim() || "unknown",
    ),
    notes: [
      "Ambiguous trades use result_r per virtual contract (often 0); review E5.6 ambiguity modes separately.",
    ],
  };
}

function buildOvertradingAnalysis(
  summary: Record<string, unknown>,
  trades: BacktestTrade[],
): OvertradingAnalysisSection {
  const dailyMap = new Map<string, { trades: BacktestTrade[]; totalR: number }>();
  for (const t of trades) {
    const date = (t.disciplineTradeDate ?? t.entryTime.slice(0, 10)).trim() || "unknown";
    const cur = dailyMap.get(date) ?? { trades: [], totalR: 0 };
    cur.trades.push(t);
    cur.totalR += t.resultR;
    dailyMap.set(date, cur);
  }

  const tradeLimit = readSummaryNumber(summary, "discipline_max_trades_per_day") ?? 8;
  let daysNeg = 0;
  let daysPos = 0;
  let daysOver = 0;
  let worstR: number | null = null;
  let bestR: number | null = null;
  let overLimitRSum = 0;
  let overLimitN = 0;
  let normalRSum = 0;
  let normalN = 0;

  for (const [, day] of dailyMap) {
    if (day.totalR < 0) daysNeg++;
    if (day.totalR > 0) daysPos++;
    if (worstR == null || day.totalR < worstR) worstR = day.totalR;
    if (bestR == null || day.totalR > bestR) bestR = day.totalR;
    const over = day.trades.length > tradeLimit;
    if (over) {
      daysOver++;
      overLimitRSum += day.totalR;
      overLimitN++;
    } else {
      normalRSum += day.totalR;
      normalN++;
    }
  }

  const summaryKeys = [
    "discipline_average_trades_per_day",
    "discipline_max_trades_in_day",
    "discipline_days_over_trade_limit_count",
    "discipline_trades_over_daily_limit_count",
    "discipline_overtrading_risk_count",
    "discipline_revenge_trade_risk_count",
    "discipline_daily_loss_limit_warning_count",
    "discipline_worst_daily_r",
    "discipline_best_daily_r",
    "discipline_total_result_r",
    "discipline_average_daily_r",
  ] as const;

  const fromSummary: Record<string, number | null> = {};
  for (const k of summaryKeys) fromSummary[k] = readSummaryNumber(summary, k);

  return {
    from_summary: fromSummary,
    daily_stats: {
      day_count: dailyMap.size,
      days_negative: daysNeg,
      days_positive: daysPos,
      days_above_trade_limit: daysOver,
      worst_daily_r: worstR,
      best_daily_r: bestR,
      avg_r_on_over_limit_days: overLimitN > 0 ? overLimitRSum / overLimitN : null,
      avg_r_on_normal_days: normalN > 0 ? normalRSum / normalN : null,
    },
    overtrading_risk_group: buildGroupedSection(trades, (t) => boolKey(t.disciplineOvertradingRisk)),
    revenge_trade_risk_group: buildGroupedSection(trades, (t) => boolKey(t.disciplineRevengeTradeRisk)),
    notes: ["Overtrading labels are diagnostic; no trade blocking in official benchmark."],
  };
}

function deriveFlags(
  official: OfficialPerformanceSnapshot,
  blocker: BlockerPerformanceSection,
  amb: AmbiguityAnalysisSection,
  variants: VariantResearchMetrics[],
  readiness: { by_decision: GroupedPerformanceSection },
  target: { by_tp_before_nearest: GroupedPerformanceSection },
  env: { by_volatility_bucket: GroupedPerformanceSection },
  overtradingRiskCount: number | null,
): string[] {
  const flags: string[] = [];
  if (official.total_r > 0 && official.expectancy_r > 0) {
    flags.push("OFFICIAL_EDGE_POSITIVE_BUT_NOT_APPROVED");
  }
  if (amb.ambiguous_count >= 100 || amb.ambiguous_rate >= 0.2) flags.push("HIGH_AMBIGUITY_COUNT");
  if (variants.length > 0) flags.push("ENTRY_VARIANTS_REQUIRE_ROBUSTNESS_AUDIT");
  const edge = variants.find((v) => v.variant_id === "edge");
  if (edge?.winrate != null && edge.winrate > 0.7) flags.push("EDGE_VARIANT_SIMULATION_RISK");
  const reject = readiness.by_decision.groups.find((g) => g.key === "reject");
  if (reject && official.trade_count > 0 && reject.count / official.trade_count >= 0.5) {
    flags.push("READINESS_REJECTS_DOMINATE");
  }
  if (blocker.high_score_reject_wins > 0 || blocker.rejected_trades_positive_r_count > 10) {
    flags.push("BLOCKER_CALIBRATION_NEEDED");
  }
  const beforeNearest = target.by_tp_before_nearest.groups.find((g) => g.key === "true");
  if (beforeNearest && beforeNearest.count >= official.trade_count * 0.4) {
    flags.push("TARGET_BEFORE_LIQUIDITY_DOMINANT");
  }
  const extreme = env.by_volatility_bucket.groups.find((g) => g.key === "extreme");
  if (extreme && extreme.count >= official.trade_count * 0.5) flags.push("VOLATILITY_V1_STRESS_LABEL");
  if (overtradingRiskCount != null && overtradingRiskCount > official.trade_count * 0.5) {
    flags.push("OVERTRADING_PRESSURE_HIGH");
  }
  return [...new Set(flags)];
}

function deriveHypotheses(
  official: OfficialPerformanceSnapshot,
  flags: string[],
  blocker: BlockerPerformanceSection,
  variants: VariantResearchMetrics[],
): string[] {
  const hyps: string[] = [];
  hyps.push(
    "Official 50%/CE remains positive in R but noisy (winrate ~45%, material ambiguity and unfilled trades).",
  );
  const edge = variants.find((v) => v.variant_id === "edge");
  const v25 = variants.find((v) => v.variant_id === "25");
  if (edge?.winrate != null && edge.winrate > official.winrate + 0.2) {
    hyps.push("Edge/25/adaptive show stronger simulated metrics; require robustness/OOS/WF before any entry change.");
  } else if (v25?.winrate != null && v25.winrate > official.winrate) {
    hyps.push("25%/adaptive simulated winrates exceed official; audit simulation assumptions before promotion.");
  }
  if (flags.includes("OVERTRADING_PRESSURE_HIGH") || blocker.candidate_trades_negative_r_count > 100) {
    hyps.push("Overtrading pressure is high; operational frequency control may help even without MQL5 gates yet.");
  }
  if (flags.includes("VOLATILITY_V1_STRESS_LABEL")) {
    hyps.push("Volatility V1 labels most XAUUSD M15 trades as extreme; recalibrate as stress label not hard gate.");
  }
  if (blocker.negative_avg_r_blockers.includes("ifvg_conflict") || blocker.negative_avg_r_blockers.includes("structure_conflict")) {
    hyps.push("IFVG/structure/PD conflicts dominate rejects; outcome-by-blocker review should guide calibration.");
  }
  if (flags.includes("TARGET_BEFORE_LIQUIDITY_DOMINANT")) {
    hyps.push("Target-before-liquidity is common; not automatically bad for RR2 but worth segmenting in E5.22.2.1 evidence.");
  }
  return hyps;
}

export function analyzeTestEaSetupPerformanceBaselineAuditFromTexts(
  input: TestEaSetupPerformanceBaselineAuditBundleTextInput,
  options?: { maxExamples?: number },
): TestEaSetupPerformanceBaselineAuditResult {
  const maxExamples = options?.maxExamples ?? 10;
  const errors: string[] = [];
  const warnings: string[] = [];

  let summary: Record<string, unknown> = {};
  try {
    summary = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    errors.push("invalid JSON in summaryJsonText");
  }

  const importOptions = buildTestEaBundleImportOptions(
    summary,
    input.bundleName,
    "setup-performance-baseline-audit",
  );
  const imported = importBacktestTradesFromCsv(input.tradesCsvText, importOptions);
  if (!imported.ok) errors.push(...imported.errors.map((e) => e.message));
  warnings.push(...imported.warnings.map((w) => w.message));

  const trades = imported.trades;
  if (trades.length === 0) errors.push("no trades imported");

  const official = buildOfficialPerformance(summary, trades);
  const outcome_distribution: Record<string, number> = {};
  for (const t of trades) {
    const o = normOutcome(t.outcome);
    outcome_distribution[o] = (outcome_distribution[o] ?? 0) + 1;
  }

  const readiness_performance = {
    by_decision: buildGroupedSection(trades, (t) => normDecision(t.setupReadinessDecision)),
    by_grade: buildGroupedSection(trades, (t) => normGrade(t.setupReadinessGrade)),
  };

  const blocker_performance = buildBlockerPerformance(trades);

  const grade_performance = {
    ifvg_bisi_sibi_grade: buildGroupedSection(trades, (t) => normGrade(t.ifvgBisiSibiGrade ?? t.checklistIfvgGrade)),
    liquidity_target_grade: buildGroupedSection(trades, (t) => normGrade(t.liquidityTargetGrade ?? t.checklistTargetGrade)),
    execution_environment_grade: buildGroupedSection(trades, (t) =>
      normGrade(t.executionEnvironmentGrade ?? t.checklistExecutionEnvironmentGrade),
    ),
    discipline_grade: buildGroupedSection(trades, (t) => normGrade(t.disciplineGrade ?? t.checklistDisciplineGrade)),
    entry_fill_feasibility_grade: buildGroupedSection(trades, (t) => normGrade(t.entryFillFeasibilityGrade)),
    premium_discount_grade: buildGroupedSection(trades, (t) => normGrade(t.premiumDiscountGrade)),
  };

  const target_performance = {
    ...buildGroupedSection(trades, (t) => normGrade(t.liquidityTargetGrade ?? t.checklistTargetGrade)),
    by_supported: buildGroupedSection(trades, (t) => boolKey(t.liquidityTargetSupported)),
    by_reached_by_tp: buildGroupedSection(trades, (t) => boolKey(t.liquidityTargetReachedByOfficialTp)),
    by_tp_before_nearest: buildGroupedSection(trades, (t) => boolKey(t.liquidityTargetTpBeforeNearestLiquidity)),
    by_tp_beyond_nearest: buildGroupedSection(trades, (t) => boolKey(t.liquidityTargetTpBeyondNearestLiquidity)),
    by_nearest_type: buildGroupedSection(trades, (t) => (t.liquidityTargetNearestType ?? "unknown").trim() || "unknown"),
    notes: ["Official TP remains RR2; target columns are diagnostic only."],
  };

  const environment_performance = {
    by_session_bucket: buildGroupedSection(trades, (t) => (t.sessionBucket ?? "unknown").trim() || "unknown"),
    by_session_phase: buildGroupedSection(trades, (t) => (t.sessionPhase ?? "unknown").trim() || "unknown"),
    by_spread_bucket: buildGroupedSection(trades, (t) => (t.spreadBucket ?? "unknown").trim() || "unknown"),
    by_volatility_bucket: buildGroupedSection(trades, (t) => (t.volatilityBucket ?? "unknown").trim() || "unknown"),
    by_execution_environment_grade: buildGroupedSection(trades, (t) =>
      normGrade(t.executionEnvironmentGrade ?? t.checklistExecutionEnvironmentGrade),
    ),
  };

  const discipline_performance = {
    by_discipline_grade: grade_performance.discipline_grade,
    by_overtrading_risk: buildGroupedSection(trades, (t) => boolKey(t.disciplineOvertradingRisk)),
    by_revenge_trade_risk: buildGroupedSection(trades, (t) => boolKey(t.disciplineRevengeTradeRisk)),
    by_daily_loss_limit_reached: buildGroupedSection(trades, (t) => boolKey(t.disciplineDailyLossLimitReached)),
    by_session_trade_limit_reached: buildGroupedSection(trades, (t) => boolKey(t.disciplineSessionTradeLimitReached)),
    by_daily_trade_limit_reached: buildGroupedSection(trades, (t) => boolKey(t.disciplineDailyTradeLimitReached)),
  };

  const ifvg_performance = {
    by_ifvg_grade: grade_performance.ifvg_bisi_sibi_grade,
    by_ifvg_conflict: buildGroupedSection(trades, (t) => boolKey(t.ifvgConflictWithTradeDirection)),
    by_ifvg_valid_for_direction: buildGroupedSection(trades, (t) => boolKey(t.ifvgValidForTradeDirection)),
    by_inversion_confirmed_close: buildGroupedSection(trades, (t) => boolKey(t.ifvgInversionConfirmedClose)),
    by_retest_detected: buildGroupedSection(trades, (t) => boolKey(t.ifvgRetestDetected)),
  };

  const session_performance = environment_performance.by_session_bucket;
  const volatility_performance = environment_performance.by_volatility_bucket;

  const entryFillGroups: SetupPerformanceGroupStats[] = [];
  const entryFillKeys: { label: string; fn: (t: BacktestTrade) => string }[] = [
    { label: "status", fn: (t) => (t.entryFillStatus ?? "unknown").trim() || "unknown" },
    { label: "near_miss", fn: (t) => boolKey(t.entryNearMiss) },
    { label: "missed_shallow_retrace", fn: (t) => boolKey(t.entryMissedShallowRetrace) },
    { label: "filled_fast", fn: (t) => boolKey(t.entryFilledFast) },
    { label: "filled_late", fn: (t) => boolKey(t.entryFilledLate) },
    { label: "invalidated_before_fill", fn: (t) => boolKey(t.entryInvalidatedBeforeFill) },
    { label: "expired_unfilled", fn: (t) => boolKey(t.entryExpiredUnfilled) },
  ];
  for (const { label, fn } of entryFillKeys) {
    const map = groupTrades(trades, (t) => `${label}:${fn(t)}`);
    for (const [key, rows] of map) entryFillGroups.push(buildGroupStats(key, rows));
  }
  entryFillGroups.sort((a, b) => b.count - a.count);
  const entry_fill_performance: GroupedPerformanceSection = {
    groups: entryFillGroups,
    notes: ["Entry fill fields are diagnostic; official fill remains 50%/CE policy."],
  };
  const near_miss_performance = buildGroupedSection(trades, (t) => boolKey(t.entryNearMiss));

  const variantDefs: { id: "50" | "25" | "75" | "adaptive" | "edge"; prefix: string }[] = [
    { id: "50", prefix: "entry_variant_50_sim_" },
    { id: "25", prefix: "entry_variant_25_sim_" },
    { id: "75", prefix: "entry_variant_75_sim_" },
    { id: "adaptive", prefix: "entry_variant_adaptive_sim_" },
    { id: "edge", prefix: "entry_variant_edge_sim_" },
  ];

  const variants: VariantResearchMetrics[] = [];
  for (const vd of variantDefs) {
    const fromSum = variantFromSummary(summary, vd.id, vd.prefix);
    const fromCsv = aggregateVariantFromTrades(trades, vd.id);
    if (fromCsv) {
      variants.push({
        ...fromSum,
        ...fromCsv,
        source: fromSum.win_count != null ? "mixed" : "trades_csv",
        notes: [
          ...(fromSum.notes ?? []),
          vd.id === "edge" ? "Edge is research-only; simulation may inflate vs official 50%/CE." : "Research-only variant.",
        ],
      });
    } else if (fromSum.win_count != null || fromSum.winrate != null) {
      variants.push(fromSum);
    }
  }

  const ambiguity_analysis = buildAmbiguityAnalysis(trades);
  const overtrading_analysis = buildOvertradingAnalysis(summary, trades);

  const sorted = [...trades].sort((a, b) => a.entryTime.localeCompare(b.entryTime));
  const dailyMap = new Map<string, { trade_count: number; total_r: number }>();
  for (const t of sorted) {
    const date = (t.disciplineTradeDate ?? t.entryTime.slice(0, 10)).trim() || "unknown";
    const cur = dailyMap.get(date) ?? { trade_count: 0, total_r: 0 };
    cur.trade_count += 1;
    cur.total_r += t.resultR;
    dailyMap.set(date, cur);
  }

  const drawdown_daily_r_analysis: DrawdownDailyRAnalysis = {
    max_drawdown_r: official.max_drawdown_r ?? calculateMaxDrawdownR(sorted),
    daily_r_by_date: [...dailyMap.entries()]
      .map(([date, v]) => ({ date, trade_count: v.trade_count, total_r: v.total_r }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    notes: [],
  };

  const exampleBuckets = new Map<string, SetupPerformanceBaselineExample[]>();
  for (const t of trades) {
    const decision = normDecision(t.setupReadinessDecision);
    const o = normOutcome(t.outcome);
    if (decision === "candidate" && o === "loss") pushExample(exampleBuckets, "candidate_loss", t, maxExamples);
    if (decision === "candidate" && o === "win") pushExample(exampleBuckets, "candidate_win", t, maxExamples);
    if (decision === "reject" && o === "win") pushExample(exampleBuckets, "reject_win", t, maxExamples);
    if (
      isHighSetupReadinessScore(t.setupReadinessScore) &&
      decision === "reject" &&
      o === "win"
    ) {
      pushExample(exampleBuckets, "high_score_reject_win", t, maxExamples);
    }
    if (
      isHighSetupReadinessScore(t.setupReadinessScore) &&
      decision === "reject" &&
      o === "loss"
    ) {
      pushExample(exampleBuckets, "high_score_reject_loss", t, maxExamples);
    }
    if (normBlocker(t.setupReadinessPrimaryBlocker) === "pd_conflict" && o === "win") {
      pushExample(exampleBuckets, "pd_conflict_win", t, maxExamples);
    }
    if (t.ifvgConflictWithTradeDirection === true && o === "win") {
      pushExample(exampleBuckets, "ifvg_conflict_win", t, maxExamples);
    }
    if (t.entryNearMiss === true && o === "win") pushExample(exampleBuckets, "near_miss_win", t, maxExamples);
    if (t.entryNearMiss === true && o === "loss") pushExample(exampleBuckets, "near_miss_loss", t, maxExamples);

    const edgeSlot = variantSlotFromTrade(t, "edge");
    const officialBad = o === "loss" || o === "ambiguous";
    if (officialBad && variantStatusClass(edgeSlot?.status) === "win") {
      pushExample(exampleBuckets, "edge_variant_win_where_official_lost", t, maxExamples);
    }
  }

  const examples: Record<string, SetupPerformanceBaselineExample[]> = {};
  for (const [k, v] of exampleBuckets) examples[k] = v;

  const flags = deriveFlags(
    official,
    blocker_performance,
    ambiguity_analysis,
    variants,
    readiness_performance,
    target_performance,
    environment_performance,
    readSummaryNumber(summary, "discipline_overtrading_risk_count"),
  );

  const hypotheses = deriveHypotheses(official, flags, blocker_performance, variants);

  if (!readSummaryString(summary, "ea_build") && trades.length > 0) {
    warnings.push("summary missing ea_build; using bundle label only");
  }

  return {
    ok: errors.length === 0,
    schema_version: SETUP_PERFORMANCE_BASELINE_AUDIT_SCHEMA,
    bundle: readSummaryString(summary, "bundle") ?? input.bundleName,
    ea_build: readSummaryString(summary, "ea_build") ?? readSummaryString(summary, "TESTEA_BUILD") ?? "unknown",
    symbol: readSummaryString(summary, "symbol") ?? readSummaryString(summary, "canonical_symbol") ?? "unknown",
    timeframe: readSummaryString(summary, "execution_timeframe") ?? "unknown",
    trade_count: official.trade_count,
    official_performance: official,
    outcome_distribution,
    readiness_performance,
    blocker_performance,
    grade_performance,
    target_performance,
    environment_performance,
    discipline_performance,
    ifvg_performance,
    session_performance,
    volatility_performance,
    entry_fill_performance,
    near_miss_performance,
    variant_research_comparison: {
      variants,
      notes: [
        "Variant metrics are hypothetical simulation columns; not approved for official entry.",
        "Do not change entry/TP based on this audit alone.",
      ],
    },
    ambiguity_analysis,
    overtrading_analysis,
    drawdown_daily_r_analysis,
    hypotheses,
    flags,
    examples,
    errors,
    warnings,
    research_only_note: RESEARCH_NOTE,
  };
}

export function flattenSetupPerformanceBaselineAuditCsvRows(
  result: TestEaSetupPerformanceBaselineAuditResult,
): SetupPerformanceBaselineAuditCsvRow[] {
  const rows: SetupPerformanceBaselineAuditCsvRow[] = [];

  const pushGroup = (section: string, g: SetupPerformanceGroupStats, notes = "") => {
    rows.push({
      section,
      key: g.key,
      count: g.count,
      win_count: g.win_count,
      loss_count: g.loss_count,
      ambiguous_count: g.ambiguous_count,
      expired_unfilled_count: g.expired_unfilled_count,
      total_r: g.total_r,
      avg_r: g.avg_r,
      winrate: g.winrate,
      notes,
    });
  };

  const pushSection = (section: string, sec: GroupedPerformanceSection) => {
    for (const g of sec.groups) pushGroup(section, g, sec.notes.join("|"));
  };

  pushGroup("official_performance", {
    key: "official",
    count: result.official_performance.trade_count,
    win_count: result.official_performance.win_count,
    loss_count: result.official_performance.loss_count,
    ambiguous_count: result.official_performance.ambiguous_count,
    expired_unfilled_count: result.official_performance.expired_unfilled_count,
    expired_open_count: result.official_performance.expired_open_count,
    total_r: result.official_performance.total_r,
    avg_r: result.official_performance.avg_r,
    winrate: result.official_performance.winrate,
    expectancy_r: result.official_performance.expectancy_r,
    avg_setup_readiness_score: null,
    avg_warning_count: null,
    avg_blocker_count: null,
  });

  for (const [k, v] of Object.entries(result.outcome_distribution)) {
    rows.push({
      section: "outcome_distribution",
      key: k,
      count: v,
      win_count: 0,
      loss_count: 0,
      ambiguous_count: 0,
      expired_unfilled_count: 0,
      total_r: 0,
      avg_r: 0,
      winrate: 0,
      notes: "",
    });
  }

  pushSection("readiness_by_decision", result.readiness_performance.by_decision);
  pushSection("readiness_by_grade", result.readiness_performance.by_grade);
  pushSection("blocker_by_primary", result.blocker_performance);

  for (const g of result.grade_performance.ifvg_bisi_sibi_grade.groups) {
    pushGroup("grade_ifvg", g);
  }

  pushSection("session_bucket", result.session_performance);
  pushSection("volatility_bucket", result.volatility_performance);

  for (const v of result.variant_research_comparison.variants) {
    rows.push({
      section: "variant_research",
      key: v.variant_id,
      count: v.filled_count ?? 0,
      win_count: v.win_count ?? 0,
      loss_count: v.loss_count ?? 0,
      ambiguous_count: v.ambiguous_count ?? 0,
      expired_unfilled_count: v.not_filled_count ?? 0,
      total_r: v.total_r ?? 0,
      avg_r: v.expectancy_r ?? 0,
      winrate: v.winrate ?? 0,
      notes: v.research_only ? "research-only" : "official-sim-50",
    });
  }

  for (const flag of result.flags) {
    rows.push({
      section: "flag",
      key: flag,
      count: 1,
      win_count: 0,
      loss_count: 0,
      ambiguous_count: 0,
      expired_unfilled_count: 0,
      total_r: 0,
      avg_r: 0,
      winrate: 0,
      notes: "",
    });
  }

  for (const h of result.hypotheses) {
    rows.push({
      section: "hypothesis",
      key: h.slice(0, 80),
      count: 1,
      win_count: 0,
      loss_count: 0,
      ambiguous_count: 0,
      expired_unfilled_count: 0,
      total_r: 0,
      avg_r: 0,
      winrate: 0,
      notes: h,
    });
  }

  return rows;
}
