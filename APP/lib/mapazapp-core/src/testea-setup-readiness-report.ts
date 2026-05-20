/**
 * E5.19 — Setup Readiness Report Prototype (read-only; no MT5, no live trading).
 * Consumes exported TestEA bundle and produces human-readable setup readiness reports.
 */

import {
  buildTestEaBundleImportOptions,
  importBacktestTradesFromCsv,
  resolveTestEaBundleLabel,
} from "./backtest-importer";
import type { BacktestTrade } from "./backtest-types";
import { findDuplicateCsvHeaders } from "./export-sample-validation";
import {
  analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts,
  isHighSetupReadinessScore,
  setupReadinessScoreBand,
  type SetupReadinessCalibrationCrossTabTable,
  type TestEaSetupReadinessDecisionCalibrationAuditAnalysis,
} from "./testea-setup-readiness-decision-calibration-audit";

export type SetupReadinessReportLanguage = "es" | "en";

export interface TestEaSetupReadinessReportBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface SetupReadinessReportHeader {
  /** Operator-facing bundle label (summary.bundle → effective_export_folder_label → folder basename). */
  bundle: string;
  bundle_name: string;
  ea_build: string | null;
  symbol: string | null;
  timeframe: string | null;
  campaign_id: string | null;
  parameter_set_id: string | null;
  trade_count: number;
  read_only: boolean;
  execution_enabled: boolean;
}

export interface SetupReadinessLeaderboardEntry {
  key: string;
  count: number;
  pct: number;
}

export interface SetupReadinessComponentSummaryRow {
  component: string;
  ok_count: number;
  warning_or_issue_count: number;
  notes: string;
}

export type SetupReadinessExampleCategory =
  | "candidate"
  | "wait"
  | "reject"
  | "high_score_reject"
  | "candidate_with_warnings";

export interface SetupReadinessReportTradeCard {
  /** E5.19.2: unique trade may belong to multiple example categories (badges). */
  categories: SetupReadinessExampleCategory[];
  /** @deprecated Presentation uses `categories`; kept for JSON consumers. */
  category: SetupReadinessExampleCategory;
  trade_id: string;
  entry_time: string | null;
  direction: string;
  outcome: string;
  setup_readiness_score: number | null;
  setup_readiness_grade: string;
  setup_readiness_decision: string;
  setup_readiness_primary_blocker: string;
  setup_readiness_blocker_count: number | null;
  setup_readiness_warning_count: number | null;
  top_reasons: string[];
  checklist_ifvg_grade: string;
  checklist_target_grade: string;
  checklist_execution_environment_grade: string;
  checklist_discipline_grade: string;
  checklist_entry_candidate_family: string;
  decision_display_label: string;
  /** `main_reason` when blocker_count=0 but primary is set; else `primary_blocker`. */
  primary_context_kind: "primary_blocker" | "main_reason";
  primary_context_label: string;
  primary_context_note: string | null;
}

export interface SetupReadinessReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  language: SetupReadinessReportLanguage;
  header: SetupReadinessReportHeader;
  /** E5.18.5: report always bundles decision + score + grade + blocker (never score-only). */
  minimum_display_unit_enforced: true;
  executive_summary: {
    average_setup_readiness_score: number | null;
    decision_counts: Record<string, number>;
    decision_pct: Record<string, number>;
    grade_counts: Record<string, number>;
    average_blocker_count: number | null;
    average_warning_count: number | null;
    top_blockers: SetupReadinessLeaderboardEntry[];
    top_warnings: SetupReadinessLeaderboardEntry[];
  };
  decision_distribution: {
    interpretation_es: string[];
    interpretation_en: string[];
  };
  score_grade_distribution: {
    min_score: number | null;
    max_score: number | null;
    average_score: number | null;
    grade_counts: Record<string, number>;
    high_score_reject_count: number;
    candidate_with_warnings_count: number;
    score_band_by_decision: SetupReadinessCalibrationCrossTabTable;
  };
  blocker_leaderboard: {
    primary_blocker_counts: SetupReadinessLeaderboardEntry[];
    high_score_reject_by_primary: SetupReadinessLeaderboardEntry[];
    primary_blocker_by_decision: SetupReadinessCalibrationCrossTabTable;
    critical_blocker_stats: TestEaSetupReadinessDecisionCalibrationAuditAnalysis["critical_blocker_stats"];
  };
  warning_leaderboard: SetupReadinessLeaderboardEntry[];
  component_summary: SetupReadinessComponentSummaryRow[];
  example_cards: SetupReadinessReportTradeCard[];
  outcome_research: {
    disclaimer_es: string;
    disclaimer_en: string;
    outcome_by_decision: SetupReadinessCalibrationCrossTabTable;
    outcome_by_grade: SetupReadinessCalibrationCrossTabTable;
    score_band_by_outcome: SetupReadinessCalibrationCrossTabTable;
  };
  governance_footer: string[];
  interpretation_flags: string[];
  research_only_note: string;
}

const RESEARCH_NOTE =
  "E5.19 read-only report prototype. No live trading, gates, MQL5 changes, or strategy approval.";

/** Maps export reason tokens → single canonical warning key (E5.19.2 display). */
const WARNING_ALIAS_TO_CANONICAL: Record<string, string> = {
  checklist_target_before_liquidity: "target_before_liquidity",
  target_before_liquidity: "target_before_liquidity",
  checklist_overtrading_warning: "overtrading_warning",
  overtrading_warning: "overtrading_warning",
  checklist_environment_weak: "environment_weak",
  environment_weak: "environment_weak",
  checklist_entry_fragile: "entry_fragile",
  entry_fragile: "entry_fragile",
  checklist_discipline: "discipline_warning",
  daily_loss_limit_warning: "discipline_warning",
};

const EXAMPLE_CATEGORY_PRIORITY: SetupReadinessExampleCategory[] = [
  "high_score_reject",
  "candidate_with_warnings",
  "reject",
  "wait",
  "candidate",
];

function normDecision(raw: string | undefined): string {
  const d = (raw ?? "").trim().toLowerCase();
  if (d === "candidate" || d === "wait" || d === "reject" || d === "unknown") return d;
  return d || "unknown";
}

function normBlocker(raw: string | undefined): string {
  const b = (raw ?? "").trim();
  if (!b || b === "-" || b.toLowerCase() === "none") return "none";
  return b;
}

/** Normalize a setup_readiness_reasons token to a canonical warning key, or null. */
export function normalizeSetupReadinessWarningToken(token: string): string | null {
  const t = token.trim();
  if (!t) return null;
  if (WARNING_ALIAS_TO_CANONICAL[t]) return WARNING_ALIAS_TO_CANONICAL[t]!;
  for (const [alias, canonical] of Object.entries(WARNING_ALIAS_TO_CANONICAL)) {
    if (t.includes(alias)) return canonical;
  }
  return null;
}

/** Per-trade deduped warning counts aggregated across the bundle (E5.19.2). */
export function countNormalizedSetupReadinessWarnings(trades: BacktestTrade[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of trades) {
    const seen = new Set<string>();
    for (const tok of parseReasonTokens(t.setupReadinessReasons)) {
      const canonical = normalizeSetupReadinessWarningToken(tok);
      if (canonical && !seen.has(canonical)) {
        seen.add(canonical);
        counts[canonical] = (counts[canonical] ?? 0) + 1;
      }
    }
  }
  return counts;
}

function parseReasonTokens(reasons: string | undefined): string[] {
  if (!reasons?.trim()) return [];
  return reasons
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pct(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function toLeaderboard(map: Record<string, number>, total: number): SetupReadinessLeaderboardEntry[] {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count, pct: pct(count, total) }))
    .sort((a, b) => b.count - a.count);
}

function strField(summary: Record<string, unknown>, key: string): string | null {
  const v = summary[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function boolField(summary: Record<string, unknown>, key: string, defaultVal: boolean): boolean {
  const v = summary[key];
  return typeof v === "boolean" ? v : defaultVal;
}

function resolvePrimaryContext(
  blockerCount: number | null,
  primaryBlocker: string,
  language: SetupReadinessReportLanguage,
): Pick<
  SetupReadinessReportTradeCard,
  "primary_context_kind" | "primary_context_label" | "primary_context_note"
> {
  const b = blockerCount ?? 0;
  const primary = normBlocker(primaryBlocker);
  if (b === 0 && primary !== "none") {
    return {
      primary_context_kind: "main_reason",
      primary_context_label: language === "es" ? "Motivo principal" : "Main reason",
      primary_context_note:
        language === "es"
          ? "Motivo mostrado por contexto; no contado como bloqueador duro."
          : "Reason shown for context; not counted as a hard blocker.",
    };
  }
  return {
    primary_context_kind: "primary_blocker",
    primary_context_label: language === "es" ? "Bloqueador principal" : "Primary blocker",
    primary_context_note: null,
  };
}

export function decisionDisplayLabel(
  decision: string,
  score: number | null,
  primaryBlocker: string,
  warningCount: number,
  language: SetupReadinessReportLanguage,
): string {
  const d = normDecision(decision);
  const high = isHighSetupReadinessScore(score);
  const blocker = normBlocker(primaryBlocker);
  if (language === "es") {
    if (d === "candidate") {
      return warningCount > 0
        ? "Candidato — revisar advertencias"
        : "Candidato — confirmación discrecional requerida";
    }
    if (d === "wait") return "Esperar — contexto incompleto o precaución";
    if (d === "reject") {
      if (high) return "Puntaje alto, pero rechazado por bloqueo crítico";
      return blocker !== "none" ? "Rechazado — bloqueo crítico" : "Rechazado";
    }
    return "Desconocido — datos diagnósticos insuficientes";
  }
  if (d === "candidate") {
    return warningCount > 0 ? "Candidate — review warnings" : "Candidate, discretionary confirmation required";
  }
  if (d === "wait") return "Wait — context incomplete or caution required";
  if (d === "reject") {
    if (high) return "High score, rejected by critical blocker";
    return blocker !== "none" ? "Reject — critical blocker" : "Reject";
  }
  return "Unknown — insufficient diagnostic data";
}

function classifyExampleCategories(t: BacktestTrade): SetupReadinessExampleCategory[] {
  const decision = normDecision(t.setupReadinessDecision);
  const warningsN = t.setupReadinessWarningCount ?? 0;
  const cats: SetupReadinessExampleCategory[] = [];
  if (decision === "candidate") cats.push("candidate");
  if (decision === "wait") cats.push("wait");
  if (decision === "reject") cats.push("reject");
  if (isHighSetupReadinessScore(t.setupReadinessScore) && decision === "reject") {
    cats.push("high_score_reject");
  }
  if (decision === "candidate" && warningsN > 0) cats.push("candidate_with_warnings");
  return cats;
}

/** E5.19.2: unique example cards with merged category badges. */
export function buildDedupedExampleCards(
  trades: BacktestTrade[],
  maxExamples: number,
  language: SetupReadinessReportLanguage,
): SetupReadinessReportTradeCard[] {
  const merged = new Map<string, { trade: BacktestTrade; categories: Set<SetupReadinessExampleCategory> }>();
  for (const t of trades) {
    const cats = classifyExampleCategories(t);
    if (cats.length === 0) continue;
    const prev = merged.get(t.tradeId);
    if (prev) {
      for (const c of cats) prev.categories.add(c);
    } else {
      merged.set(t.tradeId, { trade: t, categories: new Set(cats) });
    }
  }

  const selectedIds = new Set<string>();
  const ordered: SetupReadinessReportTradeCard[] = [];

  const tryPick = (cat: SetupReadinessExampleCategory) => {
    if (ordered.length >= maxExamples) return;
    for (const [id, { trade, categories }] of merged) {
      if (selectedIds.has(id) || !categories.has(cat)) continue;
      selectedIds.add(id);
      ordered.push(buildTradeCard(trade, [...categories], language));
      return;
    }
  };

  for (const cat of EXAMPLE_CATEGORY_PRIORITY) tryPick(cat);
  for (const [id, { trade, categories }] of merged) {
    if (ordered.length >= maxExamples) break;
    if (selectedIds.has(id)) continue;
    selectedIds.add(id);
    ordered.push(buildTradeCard(trade, [...categories], language));
  }

  return ordered;
}

function buildTradeCard(
  t: BacktestTrade,
  categories: SetupReadinessExampleCategory[],
  language: SetupReadinessReportLanguage,
): SetupReadinessReportTradeCard {
  const reasons = parseReasonTokens(t.setupReadinessReasons);
  const warningCount = t.setupReadinessWarningCount ?? 0;
  const decision = normDecision(t.setupReadinessDecision);
  const primaryCategory = categories[0] ?? "reject";
  const primaryCtx = resolvePrimaryContext(t.setupReadinessBlockerCount ?? null, t.setupReadinessPrimaryBlocker ?? "", language);
  return {
    categories,
    category: primaryCategory,
    trade_id: t.tradeId,
    entry_time: t.entryTime ?? null,
    direction: t.direction?.trim() || "unknown",
    outcome: t.outcome?.trim() || "unknown",
    setup_readiness_score: t.setupReadinessScore ?? null,
    setup_readiness_grade: (t.setupReadinessGrade ?? "").trim() || "unknown",
    setup_readiness_decision: decision,
    setup_readiness_primary_blocker: normBlocker(t.setupReadinessPrimaryBlocker),
    setup_readiness_blocker_count: t.setupReadinessBlockerCount ?? null,
    setup_readiness_warning_count: warningCount,
    top_reasons: reasons.slice(0, 3),
    checklist_ifvg_grade: t.checklistIfvgGrade?.trim() || "",
    checklist_target_grade: t.checklistTargetGrade?.trim() || "",
    checklist_execution_environment_grade: t.checklistExecutionEnvironmentGrade?.trim() || "",
    checklist_discipline_grade: t.checklistDisciplineGrade?.trim() || "",
    checklist_entry_candidate_family: t.checklistEntryCandidateFamily?.trim() || "",
    decision_display_label: decisionDisplayLabel(
      decision,
      t.setupReadinessScore ?? null,
      t.setupReadinessPrimaryBlocker ?? "",
      warningCount,
      language,
    ),
    ...primaryCtx,
  };
}

function buildComponentSummary(trades: BacktestTrade[]): SetupReadinessComponentSummaryRow[] {
  const n = trades.length;
  if (n === 0) return [];

  let biasOk = 0;
  let structureOk = 0;
  let liquidityOk = 0;
  let ifvgOk = 0;
  let mssOk = 0;
  let pdOk = 0;
  let entryFeasible = 0;
  let targetOk = 0;
  let envOk = 0;
  let disciplineOk = 0;
  let entryFragileWarn = 0;
  let overtradingWarn = 0;

  for (const t of trades) {
    if (t.checklistBiasAligned === true) biasOk++;
    if (t.checklistStructureOk === true) structureOk++;
    if (t.checklistLiquidityEventOk === true) liquidityOk++;
    if (t.checklistIfvgQualityOk === true) ifvgOk++;
    if (t.checklistMssChochOk === true) mssOk++;
    if (t.checklistPremiumDiscountOk === true) pdOk++;
    if (t.checklistEntryFeasible === true) entryFeasible++;
    if (t.checklistTargetOk === true) targetOk++;
    if (t.checklistExecutionEnvironmentOk === true) envOk++;
    if (t.checklistDisciplineOk === true) disciplineOk++;
    if (t.checklistEntryFragilityWarning === true) entryFragileWarn++;
    if (t.checklistOvertradingWarning === true) overtradingWarn++;
  }

  const row = (
    component: string,
    ok: number,
    issue: number,
    notes: string,
  ): SetupReadinessComponentSummaryRow => ({
    component,
    ok_count: ok,
    warning_or_issue_count: issue,
    notes,
  });

  return [
    row("bias_structure", biasOk, n - biasOk, "checklist_bias_aligned / structure_ok"),
    row("liquidity", liquidityOk, n - liquidityOk, "checklist_liquidity_event_ok"),
    row("ifvg_bisi_sibi", ifvgOk, n - ifvgOk, "checklist_ifvg_quality_ok + grade"),
    row("mss_choch", mssOk, n - mssOk, "checklist_mss_choch_ok"),
    row("premium_discount", pdOk, n - pdOk, "checklist_premium_discount_ok"),
    row("entry", entryFeasible, entryFragileWarn, "entry_feasible; fragile warnings"),
    row("target", targetOk, n - targetOk, "checklist_target_ok + grade"),
    row("execution_environment", envOk, n - envOk, "checklist_execution_environment_ok"),
    row("discipline", disciplineOk, overtradingWarn, "discipline_ok; overtrading_warning"),
  ];
}

function buildScoreBandByOutcome(trades: BacktestTrade[]): SetupReadinessCalibrationCrossTabTable {
  const table: SetupReadinessCalibrationCrossTabTable = { rows: [], columns: [], counts: {} };
  for (const t of trades) {
    const outcome = t.outcome?.trim() || "unknown";
    const band = setupReadinessScoreBand(t.setupReadinessScore);
    if (band === "unknown") continue;
    if (!table.rows.includes(outcome)) table.rows.push(outcome);
    if (!table.columns.includes(band)) table.columns.push(band);
    if (!table.counts[outcome]) table.counts[outcome] = {};
    table.counts[outcome]![band] = (table.counts[outcome]![band] ?? 0) + 1;
  }
  table.rows.sort();
  table.columns.sort();
  return table;
}

function governanceFooter(language: SetupReadinessReportLanguage): string[] {
  if (language === "es") {
    return [
      "Informe de solo lectura (research / backtest). Sin trading en vivo.",
      "Sin gates ni ejecución automática.",
      "No tomar el puntaje como permiso de entrada; los bloqueadores críticos pueden anular la readiness.",
      "Entry oficial: 50 % / CE. Edge / p25 / adaptive: solo investigación.",
      "TP oficial: RR2 fijo. Checklist: soporte de decisión read-only.",
    ];
  }
  return [
    "Read-only report (research / backtest). No live trading.",
    "No gates or automatic execution.",
    "Score is not permission to trade; critical blockers can override readiness.",
    "Official entry: 50% / CE. Edge / p25 / adaptive: research only.",
    "Official TP: fixed RR2. Checklist: read-only decision support.",
  ];
}

export function buildTestEaSetupReadinessReportFromTexts(
  input: TestEaSetupReadinessReportBundleTextInput,
  options?: { maxExamples?: number; language?: SetupReadinessReportLanguage },
): SetupReadinessReport {
  const maxExamples = options?.maxExamples ?? 10;
  const language = options?.language ?? "es";
  const errors: string[] = [];
  const warnings: string[] = [];

  let summaryJson: Record<string, unknown> = {};
  try {
    summaryJson = JSON.parse(input.summaryJsonText) as Record<string, unknown>;
  } catch {
    errors.push("invalid JSON in summaryJsonText");
  }

  const hasReadyLogic = summaryJson["has_setup_readiness_checklist_v1_logic"] === true;
  if (!hasReadyLogic) {
    errors.push("summary missing has_setup_readiness_checklist_v1_logic=true (Setup Readiness report requires E5.18 export)");
  }

  const headerLine = input.tradesCsvText.split(/\r?\n/)[0] ?? "";
  const dupHeaders = findDuplicateCsvHeaders(headerLine);
  if (dupHeaders.length > 0) {
    for (const d of dupHeaders) {
      errors.push(`duplicate CSV header: "${d.name}" appears ${d.count} times`);
    }
  }

  const bundleLabel = resolveTestEaBundleLabel(summaryJson, input.bundleName);

  const calibration = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
    {
      bundleName: input.bundleName,
      summaryJsonText: input.summaryJsonText,
      tradesCsvText: input.tradesCsvText,
    },
    { maxExamples: 0 },
  );
  errors.push(...calibration.errors);
  warnings.push(...calibration.warnings);

  const importOptions = buildTestEaBundleImportOptions(
    summaryJson,
    input.bundleName,
    "setup-readiness-report",
  );
  const imported = importBacktestTradesFromCsv(input.tradesCsvText, importOptions);
  const trades = imported.trades;

  if (!hasReadyLogic || dupHeaders.length > 0 || calibration.errors.length > 0) {
    const emptyHeader: SetupReadinessReportHeader = {
      bundle: bundleLabel,
      bundle_name: bundleLabel,
      ea_build: strField(summaryJson, "ea_build") ?? strField(summaryJson, "testea_build"),
      symbol: strField(summaryJson, "canonical_symbol") ?? strField(summaryJson, "symbol"),
      timeframe: strField(summaryJson, "timeframe"),
      campaign_id: strField(summaryJson, "campaign_id"),
      parameter_set_id: strField(summaryJson, "parameter_set_id"),
      trade_count: 0,
      read_only: true,
      execution_enabled: false,
    };
    return {
      ok: false,
      errors,
      warnings,
      language,
      header: emptyHeader,
      minimum_display_unit_enforced: true,
      executive_summary: {
        average_setup_readiness_score: null,
        decision_counts: {},
        decision_pct: {},
        grade_counts: {},
        average_blocker_count: null,
        average_warning_count: null,
        top_blockers: [],
        top_warnings: [],
      },
      decision_distribution: { interpretation_es: [], interpretation_en: [] },
      score_grade_distribution: {
        min_score: null,
        max_score: null,
        average_score: null,
        grade_counts: {},
        high_score_reject_count: 0,
        candidate_with_warnings_count: 0,
        score_band_by_decision: { rows: [], columns: [], counts: {} },
      },
      blocker_leaderboard: {
        primary_blocker_counts: [],
        high_score_reject_by_primary: [],
        primary_blocker_by_decision: { rows: [], columns: [], counts: {} },
        critical_blocker_stats: [],
      },
      warning_leaderboard: [],
      component_summary: [],
      example_cards: [],
      outcome_research: {
        disclaimer_es:
          "Esta sección es observacional. No aprueba señales, edge, entry ni gates.",
        disclaimer_en:
          "This section is observational. It does not approve signals, edge, entry, or gates.",
        outcome_by_decision: { rows: [], columns: [], counts: {} },
        outcome_by_grade: { rows: [], columns: [], counts: {} },
        score_band_by_outcome: { rows: [], columns: [], counts: {} },
      },
      governance_footer: governanceFooter(language),
      interpretation_flags: [],
      research_only_note: RESEARCH_NOTE,
    };
  }

  const n = calibration.overall.trade_count;
  const warningCounts = countNormalizedSetupReadinessWarnings(trades);

  const primaryBlockerMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(calibration.primary_blocker_by_decision.counts)) {
    let sum = 0;
    for (const col of Object.keys(v)) sum += v[col] ?? 0;
    if (sum > 0) primaryBlockerMap[k] = sum;
  }

  const highScoreRejectByPrimary: Record<string, number> = {};
  for (const c of calibration.critical_blocker_stats) {
    if (c.high_score_reject_as_primary_count > 0) {
      highScoreRejectByPrimary[c.blocker] = c.high_score_reject_as_primary_count;
    }
  }

  const decisionPct: Record<string, number> = {};
  for (const [k, v] of Object.entries(calibration.overall.decision_counts)) {
    decisionPct[k] = pct(v, n);
  }

  const example_cards = buildDedupedExampleCards(trades, maxExamples, language);

  const interpretation_es = [
    "Candidato — revisar advertencias; no implica trade perfecto.",
    "Rechazado — bloqueador crítico; puede ocurrir con puntaje alto.",
    "No tomar el puntaje como permiso de entrada.",
  ];
  const interpretation_en = [
    "Candidate does not mean a perfect trade; review warnings.",
    "Reject may occur with high score due to critical blocker.",
    "Do not treat score as permission to enter.",
  ];

  return {
    ok: errors.length === 0 && calibration.ok,
    errors,
    warnings,
    language,
    header: {
      bundle: bundleLabel,
      bundle_name: bundleLabel,
      ea_build: strField(summaryJson, "ea_build") ?? strField(summaryJson, "testea_build"),
      symbol: strField(summaryJson, "canonical_symbol") ?? strField(summaryJson, "symbol"),
      timeframe: strField(summaryJson, "timeframe"),
      campaign_id: strField(summaryJson, "campaign_id"),
      parameter_set_id: strField(summaryJson, "parameter_set_id"),
      trade_count: n,
      read_only: boolField(summaryJson, "read_only", true),
      execution_enabled: boolField(summaryJson, "execution_enabled", false),
    },
    minimum_display_unit_enforced: true,
    executive_summary: {
      average_setup_readiness_score: calibration.overall.average_setup_readiness_score,
      decision_counts: { ...calibration.overall.decision_counts },
      decision_pct: decisionPct,
      grade_counts: { ...calibration.overall.grade_counts },
      average_blocker_count: calibration.overall.average_blocker_count,
      average_warning_count: calibration.overall.average_warning_count,
      top_blockers: toLeaderboard(primaryBlockerMap, n).slice(0, 10),
      top_warnings: toLeaderboard(warningCounts, n).slice(0, 10),
    },
    decision_distribution: { interpretation_es, interpretation_en },
    score_grade_distribution: {
      min_score: calibration.overall.min_setup_readiness_score,
      max_score: calibration.overall.max_setup_readiness_score,
      average_score: calibration.overall.average_setup_readiness_score,
      grade_counts: { ...calibration.overall.grade_counts },
      high_score_reject_count: calibration.score_decision_buckets.high_score_reject_count,
      candidate_with_warnings_count: calibration.candidate_with_warnings_count,
      score_band_by_decision: calibration.score_band_by_decision,
    },
    blocker_leaderboard: {
      primary_blocker_counts: toLeaderboard(primaryBlockerMap, n),
      high_score_reject_by_primary: toLeaderboard(highScoreRejectByPrimary, n),
      primary_blocker_by_decision: calibration.primary_blocker_by_decision,
      critical_blocker_stats: calibration.critical_blocker_stats,
    },
    warning_leaderboard: toLeaderboard(warningCounts, n),
    component_summary: buildComponentSummary(trades),
    example_cards,
    outcome_research: {
      disclaimer_es:
        "Esta sección es observacional. No aprueba señales, edge, entry ni gates.",
      disclaimer_en:
        "This section is observational. It does not approve signals, edge, entry, or gates.",
      outcome_by_decision: calibration.outcome_by_setup_readiness_decision,
      outcome_by_grade: calibration.outcome_by_setup_readiness_grade,
      score_band_by_outcome: buildScoreBandByOutcome(trades),
    },
    governance_footer: governanceFooter(language),
    interpretation_flags: calibration.interpretation_flags,
    research_only_note: RESEARCH_NOTE,
  };
}

function renderCrossTabMarkdown(
  title: string,
  table: SetupReadinessCalibrationCrossTabTable,
): string {
  if (table.rows.length === 0 || table.columns.length === 0) return `### ${title}\n\n_(sin datos)_\n\n`;
  const header = `| | ${table.columns.join(" | ")} |`;
  const sep = `| --- | ${table.columns.map(() => "---").join(" | ")} |`;
  const body = table.rows.map((row) => {
    const cells = table.columns.map((col) => String(table.counts[row]?.[col] ?? 0));
    return `| ${row} | ${cells.join(" | ")} |`;
  });
  return `### ${title}\n\n${header}\n${sep}\n${body.join("\n")}\n\n`;
}

function formatWarningLeaderboardKey(key: string, language: SetupReadinessReportLanguage): string {
  if (language === "es") {
    const labels: Record<string, string> = {
      target_before_liquidity: "TP antes que liquidez",
      overtrading_warning: "Sobreoperación",
      environment_weak: "Entorno débil",
      entry_fragile: "Entrada frágil",
      discipline_warning: "Disciplina / riesgo",
    };
    return labels[key] ?? key;
  }
  return key;
}

function renderLeaderboardMarkdown(
  title: string,
  entries: SetupReadinessLeaderboardEntry[],
  options?: { formatKey?: (key: string) => string },
): string {
  const formatKey = options?.formatKey ?? ((k) => k);
  if (entries.length === 0) {
    if (!title.trim()) return "";
    return `### ${title}\n\n_(sin datos)_\n\n`;
  }
  const lines = entries.map((e) => `- **${formatKey(e.key)}**: ${e.count} (${e.pct.toFixed(1)} %)`);
  if (!title.trim()) return `${lines.join("\n")}\n\n`;
  return `### ${title}\n\n${lines.join("\n")}\n\n`;
}

function formatExampleCategoryBadges(
  categories: SetupReadinessExampleCategory[],
  language: SetupReadinessReportLanguage,
): string {
  const labels =
    language === "es"
      ? {
          candidate: "candidato",
          wait: "esperar",
          reject: "rechazado",
          high_score_reject: "high_score_reject",
          candidate_with_warnings: "candidato_con_advertencias",
        }
      : {
          candidate: "candidate",
          wait: "wait",
          reject: "reject",
          high_score_reject: "high_score_reject",
          candidate_with_warnings: "candidate_with_warnings",
        };
  return categories.map((c) => labels[c]).join(", ");
}

export function renderSetupReadinessReportMarkdown(report: SetupReadinessReport): string {
  const es = report.language === "es";
  const h = report.header;
  const lines: string[] = [];

  lines.push(`# ${es ? "Informe Setup Readiness" : "Setup Readiness Report"}`);
  lines.push("");
  lines.push(`- **Bundle:** ${h.bundle}`);
  if (h.ea_build) lines.push(`- **Build:** ${h.ea_build}`);
  if (h.symbol) lines.push(`- **Símbolo / Symbol:** ${h.symbol}`);
  if (h.timeframe) lines.push(`- **Timeframe:** ${h.timeframe}`);
  if (h.campaign_id) lines.push(`- **Campaign:** ${h.campaign_id}`);
  if (h.parameter_set_id) lines.push(`- **Parameter set:** ${h.parameter_set_id}`);
  lines.push(`- **Trades:** ${h.trade_count}`);
  lines.push(`- **read_only:** ${h.read_only} | **execution_enabled:** ${h.execution_enabled}`);
  lines.push(`- **ok:** ${report.ok}`);
  lines.push("");

  if (!report.ok) {
    lines.push("## Errores / Errors");
    for (const e of report.errors) lines.push(`- ${e}`);
    lines.push("");
    if (report.warnings.length) {
      lines.push("## Advertencias / Warnings");
      for (const w of report.warnings) lines.push(`- ${w}`);
      lines.push("");
    }
    lines.push("## Gobernanza / Governance");
    for (const g of report.governance_footer) lines.push(`- ${g}`);
    return `${lines.join("\n")}\n`;
  }

  const ex = report.executive_summary;
  lines.push(`## ${es ? "Resumen ejecutivo" : "Executive summary"}`);
  lines.push("");
  lines.push(
    `| Métrica | Valor |\n| --- | --- |\n| Puntaje medio / Avg score | ${ex.average_setup_readiness_score?.toFixed(2) ?? "n/a"} |\n| Bloqueadores medio | ${ex.average_blocker_count?.toFixed(2) ?? "n/a"} |\n| Advertencias medio | ${ex.average_warning_count?.toFixed(2) ?? "n/a"} |`,
  );
  lines.push("");
  lines.push(es ? "### Decisiones" : "### Decisions");
  for (const [k, v] of Object.entries(ex.decision_counts)) {
    const p = ex.decision_pct[k]?.toFixed(1) ?? "0";
    const label =
      k === "candidate"
        ? es
          ? "Candidatos"
          : "Candidates"
        : k === "wait"
          ? es
            ? "Esperar"
            : "Wait"
          : k === "reject"
            ? es
              ? "Rechazados"
              : "Reject"
            : k;
    lines.push(`- **${label}** (\`${k}\`): ${v} (${p} %)`);
  }
  lines.push("");
  lines.push(renderLeaderboardMarkdown(
    es ? "Bloqueadores principales" : "Top blockers",
    ex.top_blockers,
  ));
  lines.push(renderLeaderboardMarkdown(
    es ? "Advertencias principales" : "Top warnings",
    ex.top_warnings,
    { formatKey: (k) => formatWarningLeaderboardKey(k, report.language) },
  ));

  lines.push(`## ${es ? "Distribución de decisiones" : "Decision distribution"}`);
  const interp = es ? report.decision_distribution.interpretation_es : report.decision_distribution.interpretation_en;
  for (const i of interp) lines.push(`- ${i}`);
  lines.push("");

  const sg = report.score_grade_distribution;
  lines.push(`## ${es ? "Puntaje y grade" : "Score and grade"}`);
  lines.push(`- Min: ${sg.min_score ?? "n/a"} | Max: ${sg.max_score ?? "n/a"} | Avg: ${sg.average_score?.toFixed(2) ?? "n/a"}`);
  lines.push(`- High-score reject: ${sg.high_score_reject_count}`);
  lines.push(`- Candidate with warnings: ${sg.candidate_with_warnings_count}`);
  lines.push("");
  for (const [g, c] of Object.entries(sg.grade_counts)) {
    lines.push(`- Grade **${g}**: ${c}`);
  }
  lines.push("");
  lines.push(renderCrossTabMarkdown(
    es ? "Banda de puntaje × decisión" : "Score band × decision",
    sg.score_band_by_decision,
  ));

  lines.push(`## ${es ? "Ranking de bloqueadores" : "Blocker leaderboard"}`);
  lines.push(renderLeaderboardMarkdown(
    es ? "Primary blocker" : "Primary blocker",
    report.blocker_leaderboard.primary_blocker_counts,
  ));
  lines.push(renderLeaderboardMarkdown(
    es ? "High-score reject por blocker" : "High-score reject by blocker",
    report.blocker_leaderboard.high_score_reject_by_primary,
  ));
  lines.push(renderCrossTabMarkdown(
    es ? "Blocker × decisión" : "Blocker × decision",
    report.blocker_leaderboard.primary_blocker_by_decision,
  ));

  lines.push(`## ${es ? "Ranking de advertencias" : "Warning leaderboard"}`);
  lines.push(
    es
      ? "_Claves normalizadas (sin duplicar alias checklist_*)._"
      : "_Normalized keys (checklist_* aliases merged)._",
  );
  lines.push("");
  lines.push(
    renderLeaderboardMarkdown(
      es ? "Advertencias agregadas" : "Aggregated warnings",
      report.warning_leaderboard,
      { formatKey: (k) => formatWarningLeaderboardKey(k, report.language) },
    ),
  );

  lines.push(`## ${es ? "Resumen de componentes" : "Component summary"}`);
  lines.push(
    es
      ? "_Salud por componente del checklist. Los bloqueadores principales se resumen en el ranking global; esta tabla no atribuye bloqueadores duros por componente._"
      : "_Per-component checklist health. Primary blockers are summarized globally; this table does not attribute hard blockers per component._",
  );
  lines.push("");
  lines.push(
    es
      ? "| Componente | OK | Advertencia o incidencia | Notas |"
      : "| Component | OK | Warning or issue | Notes |",
  );
  lines.push(es ? "| --- | ---: | ---: | --- |" : "| --- | ---: | ---: | --- |");
  for (const r of report.component_summary) {
    lines.push(`| ${r.component} | ${r.ok_count} | ${r.warning_or_issue_count} | ${r.notes} |`);
  }
  lines.push("");

  lines.push(`## ${es ? "Ejemplos de trades" : "Example trade cards"}`);
  lines.push(
    es
      ? "_Cada trade aparece una sola vez; las categorías son insignias informativas._"
      : "_Each trade appears once; categories are informational badges._",
  );
  lines.push("");
  for (const card of report.example_cards) {
    const badges = formatExampleCategoryBadges(card.categories, report.language);
    lines.push(`### ${card.trade_id} — ${card.decision_display_label}`);
    if (badges) {
      lines.push(`- **${es ? "Categorías" : "Categories"}:** ${badges}`);
    }
    lines.push(`- **Decisión / decision:** ${card.setup_readiness_decision} | **Score:** ${card.setup_readiness_score ?? "n/a"} | **Grade:** ${card.setup_readiness_grade}`);
    lines.push(
      `- **${card.primary_context_label}:** ${card.setup_readiness_primary_blocker} | **${es ? "Bloqueadores" : "Blockers"}:** ${card.setup_readiness_blocker_count ?? 0} | **${es ? "Advertencias" : "Warnings"}:** ${card.setup_readiness_warning_count ?? 0}`,
    );
    if (card.primary_context_note) lines.push(`- _${card.primary_context_note}_`);
    lines.push(`- **Outcome (research):** ${card.outcome} | **Direction:** ${card.direction} | **Entry:** ${card.entry_time ?? "n/a"}`);
    lines.push(`- **IFVG:** ${card.checklist_ifvg_grade} | **Target:** ${card.checklist_target_grade} | **Env:** ${card.checklist_execution_environment_grade} | **Discipline:** ${card.checklist_discipline_grade}`);
    lines.push(`- **Entry family:** ${card.checklist_entry_candidate_family}`);
    if (card.top_reasons.length) lines.push(`- **Reasons:** ${card.top_reasons.join(", ")}`);
    lines.push("");
  }

  lines.push(`## ${es ? "Investigación — outcome (solo backtest)" : "Research — outcome (backtest only)"}`);
  lines.push(`> ${es ? report.outcome_research.disclaimer_es : report.outcome_research.disclaimer_en}`);
  lines.push("");
  lines.push(renderCrossTabMarkdown("Outcome × decision", report.outcome_research.outcome_by_decision));
  lines.push(renderCrossTabMarkdown("Outcome × grade", report.outcome_research.outcome_by_grade));
  lines.push(renderCrossTabMarkdown("Score band × outcome", report.outcome_research.score_band_by_outcome));

  if (report.interpretation_flags.length) {
    lines.push("## Flags");
    for (const f of report.interpretation_flags) lines.push(`- \`${f}\``);
    lines.push("");
  }

  lines.push("## Gobernanza / Governance");
  for (const g of report.governance_footer) lines.push(`- ${g}`);
  lines.push("");
  lines.push(`_${report.research_only_note}_`);

  return `${lines.join("\n")}\n`;
}

export function renderSetupReadinessReportHtml(report: SetupReadinessReport): string {
  const md = renderSetupReadinessReportMarkdown(report);
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="${report.language}">
<head>
<meta charset="utf-8"/>
<title>Setup Readiness Report — ${report.header.bundle_name}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1.25rem 3rem;line-height:1.55;color:#1a1a2e}
h1{margin-top:0;padding-bottom:.5rem;border-bottom:2px solid #e0e0e8}
h2{margin-top:2rem;padding-top:.25rem}
h3{margin-top:1.25rem;color:#2d2d44}
pre{white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;font-size:.92rem;background:#fafafc;border:1px solid #e8e8ef;border-radius:6px;padding:1rem 1.1rem;line-height:1.45}
table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{border:1px solid #ccc;padding:.45rem .65rem;text-align:left}
blockquote{background:#f5f5f5;border-left:4px solid #666;padding:.5rem 1rem;margin:1rem 0}
li{margin:.35rem 0}
</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>
`;
}

export function setupReadinessReportToJson(report: SetupReadinessReport): string {
  return JSON.stringify(report, null, 2);
}
