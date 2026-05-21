/**
 * E5.20.3 — Dashboard read-only data adapter (presentation layer only; no MT5, no trading, no gates).
 * Consumes setup_readiness_report.json (+ optional latest_valid_report_result.json, bundles.index.json).
 */

import type { LatestValidReportResult } from "./testea-latest-valid-report";
import { parseBundleIndexJson } from "./testea-latest-valid-report";
import { isHighSetupReadinessScore } from "./testea-setup-readiness-decision-calibration-audit";
import type {
  SetupReadinessLeaderboardEntry,
  SetupReadinessReport,
  SetupReadinessReportLanguage,
  SetupReadinessReportTradeCard,
} from "./testea-setup-readiness-report";

export const DASHBOARD_READONLY_VIEW_SCHEMA_VERSION = "mapazapp_dashboard_readonly_view_v1" as const;

export type DashboardReadonlyMode = "backtest_research";

export type DashboardDecisionKey = "candidate" | "wait" | "reject" | "unknown";

export interface DashboardReadonlySourcePaths {
  report_json?: string;
  latest_result_json?: string;
  bundle_index_json?: string;
  output_json?: string;
}

export interface DashboardReadonlyAdapterInput {
  reportJsonText: string;
  latestResultJsonText?: string;
  indexJsonText?: string;
  language?: SetupReadinessReportLanguage;
  sourcePaths?: DashboardReadonlySourcePaths;
  strict?: boolean;
  nowUtc?: string;
}

export interface DashboardDisplayBadge {
  id: string;
  label: string;
  tooltip?: string;
  note?: string;
}

export interface DashboardTradeCardView {
  trade_id: string;
  setup_time: string | null;
  entry_time: string | null;
  direction: string;
  outcome?: string;
  decision: DashboardDecisionKey;
  decision_label: string;
  score: number;
  grade: string;
  primary_blocker: string;
  main_reason: string | null;
  blocker_count: number;
  warning_count: number;
  top_reasons: string[];
  categories: string[];
  component_grades: {
    ifvg: string;
    target: string;
    environment: string;
    discipline: string;
    entry_family: string;
  };
  display_badges: DashboardDisplayBadge[];
  warnings: string[];
  governance_notes: string[];
}

export interface DashboardDecisionSummaryRow {
  decision: DashboardDecisionKey;
  count: number;
  percent: number;
  label_es: string;
  label_en: string;
}

export interface DashboardCasebookAlignment {
  active_case_refs: string[];
  missing_measurement_case_refs: string[];
  policy_only_case_refs: string[];
  notes: string[];
}

export interface DashboardGovernance {
  read_only: true;
  no_live_trading: true;
  no_gates: true;
  official_entry: "50% / CE";
  official_tp: "RR2";
  edge_status: "research_only";
  p25_status: "research_only";
  adaptive_status: "research_only";
  score_is_not_permission: true;
  dashboard_is_not_execution_logic: true;
  humanized_acceptance_policy_required: true;
}

export interface DashboardReadonlyView {
  schema_version: typeof DASHBOARD_READONLY_VIEW_SCHEMA_VERSION;
  ok: boolean;
  generated_at_utc: string;
  mode: DashboardReadonlyMode;
  read_only: true;
  header: {
    bundle: string;
    bundle_name: string;
    selected_bundle_id: string | null;
    ea_build: string | null;
    symbol: string | null;
    timeframe: string | null;
    campaign_id: string | null;
    parameter_set_id: string | null;
    trade_count: number;
    source_paths: DashboardReadonlySourcePaths;
    valid_status_before_report: string | null;
  };
  campaign_summary: {
    average_setup_readiness_score: number | null;
    candidate_count: number;
    wait_count: number;
    reject_count: number;
    unknown_count: number;
    grade_distribution: Record<string, number>;
    average_blocker_count: number | null;
    average_warning_count: number | null;
    minimum_display_unit_enforced: boolean;
  };
  decision_summary: DashboardDecisionSummaryRow[];
  /** Example trade cards only (subset); not campaign totals. */
  trade_card_decision_summary: DashboardDecisionSummaryRow[];
  blocker_summary: {
    top_blockers: SetupReadinessLeaderboardEntry[];
    high_score_reject_by_primary: SetupReadinessLeaderboardEntry[];
  };
  warning_summary: {
    top_warnings: SetupReadinessLeaderboardEntry[];
  };
  trade_cards: DashboardTradeCardView[];
  casebook_alignment: DashboardCasebookAlignment;
  governance: DashboardGovernance;
  warnings: string[];
  errors: string[];
}

const DECISION_LABELS_ES: Record<DashboardDecisionKey, string> = {
  candidate: "Candidato — revisar advertencias",
  wait: "Esperar — contexto incompleto o precaución",
  reject: "Rechazado — bloqueo crítico",
  unknown: "Desconocido — datos insuficientes",
};

const DECISION_LABELS_EN: Record<DashboardDecisionKey, string> = {
  candidate: "Candidate — review warnings",
  wait: "Wait — context incomplete or caution required",
  reject: "Reject — critical blocker",
  unknown: "Unknown — insufficient data",
};

const POLICY_ONLY_CASE_REFS = ["HA-001", "HA-002", "HA-010"] as const;

const ALWAYS_MISSING_MEASUREMENT_REFS = ["HA-007", "HA-008"] as const;

const NEWS_ACTIVE_TOKENS = [
  "news",
  "humanized_news_context",
  "humanized_news",
  "event_risk",
  "calendar_event",
  "news_context",
];

const CHASE_ACTIVE_TOKENS = [
  "late_entry",
  "chase",
  "humanized_no_chase",
  "checklist_mss_choch_late",
  "missed_entry",
  "no_chase",
  "late_entry_observe_only",
];

export const DASHBOARD_GOVERNANCE: DashboardGovernance = {
  read_only: true,
  no_live_trading: true,
  no_gates: true,
  official_entry: "50% / CE",
  official_tp: "RR2",
  edge_status: "research_only",
  p25_status: "research_only",
  adaptive_status: "research_only",
  score_is_not_permission: true,
  dashboard_is_not_execution_logic: true,
  humanized_acceptance_policy_required: true,
};

function normDecision(raw: string | undefined): DashboardDecisionKey {
  const d = (raw ?? "").trim().toLowerCase();
  if (d === "candidate" || d === "wait" || d === "reject") return d;
  if (d === "unknown") return "unknown";
  return "unknown";
}

function normToken(t: string): string {
  return t.trim().toLowerCase();
}

function normBlocker(raw: string | undefined): string {
  const b = (raw ?? "").trim();
  if (!b || b === "-" || b.toLowerCase() === "none") return "none";
  return b;
}

function isHardBlocker(primaryBlocker: string, blockerCount: number): boolean {
  return blockerCount > 0 && normBlocker(primaryBlocker) !== "none";
}

export type MainReasonFallbackId =
  | "candidate_with_warnings"
  | "candidate_manual_review_required"
  | "wait_context_incomplete"
  | "reject_reason_unspecified"
  | "reason_not_available";

export interface ResolvedTradeCardReason {
  primary_blocker: string;
  main_reason: string | null;
  reason_is_hard_blocker: boolean;
}

function decisionFallbackMainReason(
  decision: DashboardDecisionKey,
  warningCount: number,
): string {
  if (decision === "candidate") {
    return warningCount > 0 ? "candidate_with_warnings" : "candidate_manual_review_required";
  }
  if (decision === "wait") return "wait_context_incomplete";
  if (decision === "reject") return "reject_reason_unspecified";
  return "reason_not_available";
}

/** E5.20.3.0.1 — contextual main_reason when no hard blocker (never score-only). */
export function resolveTradeCardReasonContext(
  card: SetupReadinessReportTradeCard,
): ResolvedTradeCardReason {
  const decision = normDecision(card.setup_readiness_decision);
  const blockerCount = card.setup_readiness_blocker_count ?? 0;
  const warningCount = card.setup_readiness_warning_count ?? 0;
  const rawPrimary = normBlocker(card.setup_readiness_primary_blocker);
  const hard = isHardBlocker(rawPrimary, blockerCount);

  if (hard) {
    return {
      primary_blocker: rawPrimary,
      main_reason: null,
      reason_is_hard_blocker: true,
    };
  }

  const existingMain =
    card.primary_context_kind === "main_reason" ? (card.primary_context_label ?? "").trim() : "";
  if (existingMain) {
    return {
      primary_blocker: "none",
      main_reason: existingMain,
      reason_is_hard_blocker: false,
    };
  }

  if (rawPrimary !== "none") {
    return {
      primary_blocker: "none",
      main_reason: rawPrimary,
      reason_is_hard_blocker: false,
    };
  }

  const topReason = (card.top_reasons ?? []).map((r) => r.trim()).find(Boolean);
  if (topReason) {
    return {
      primary_blocker: "none",
      main_reason: topReason,
      reason_is_hard_blocker: false,
    };
  }

  return {
    primary_blocker: "none",
    main_reason: decisionFallbackMainReason(decision, warningCount),
    reason_is_hard_blocker: false,
  };
}

function countDecisionsFromExampleCards(cards: SetupReadinessReportTradeCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    const d = normDecision(card.setup_readiness_decision);
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts;
}

function resolveCampaignDecisionCounts(
  report: SetupReadinessReport,
  latest: LatestValidReportResult | null,
): Record<string, number> {
  const fromReport = report.executive_summary?.decision_counts ?? {};
  const fromLatest = latest?.decision_counts;
  if (fromLatest && Object.keys(fromLatest).length > 0) {
    return { ...fromReport, ...fromLatest };
  }
  return { ...fromReport };
}

function collectAlignmentTokens(
  report: SetupReadinessReport,
  cards: DashboardTradeCardView[],
): string[] {
  const tokens = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (!s) return;
    const t = normToken(s);
    if (t && t !== "none") tokens.add(t);
  };

  for (const e of report.executive_summary.top_blockers) add(e.key);
  for (const e of report.executive_summary.top_warnings) add(e.key);
  for (const e of report.blocker_leaderboard.high_score_reject_by_primary) add(e.key);

  for (const card of cards) {
    add(card.primary_blocker);
    add(card.main_reason ?? undefined);
    for (const r of card.top_reasons) add(r);
    for (const c of card.categories) add(c);
    add(card.component_grades.entry_family);
  }

  return [...tokens];
}

function hasEdgeContext(tokens: string[], cards: DashboardTradeCardView[]): boolean {
  if (tokens.some((t) => t.includes("edge") || t.includes("entry_variant"))) return true;
  return cards.some(
    (c) =>
      c.categories.some((cat) => cat.includes("edge")) ||
      c.component_grades.entry_family.toLowerCase().includes("edge"),
  );
}

export function alignHumanizedCasebook(tokens: string[], cards: DashboardTradeCardView[]): DashboardCasebookAlignment {
  const active = new Set<string>();
  const missing = new Set<string>(ALWAYS_MISSING_MEASUREMENT_REFS);
  const policyOnly = new Set<string>(POLICY_ONLY_CASE_REFS);
  const notes: string[] = [];

  const hasNewsMeasurement = tokens.some((t) => NEWS_ACTIVE_TOKENS.some((n) => t.includes(n)));
  const hasChaseMeasurement = tokens.some((t) => CHASE_ACTIVE_TOKENS.some((n) => t.includes(n)));

  if (hasNewsMeasurement) {
    missing.delete("HA-008");
    active.add("HA-008");
    notes.push("HA-008: referencia activa por token explícito de contexto news/event.");
  } else {
    notes.push("HA-008: missing_measurement — sin feed news/canonical en export V1.");
  }

  if (hasChaseMeasurement) {
    missing.delete("HA-007");
    active.add("HA-007");
    notes.push("HA-007: referencia activa por token explícito late/chase.");
  } else {
    notes.push("HA-007: missing_measurement — sin late_entry/chase en fila trade oficial.");
  }

  for (const t of tokens) {
    if (t.includes("pd_conflict")) active.add("HA-004");
    if (t.includes("ifvg_conflict")) active.add("HA-009");
    if (t.includes("target_missing")) active.add("HA-006");
    if (t.includes("overtrading_warning") || t.includes("discipline")) active.add("HA-005");
    if (
      (t.includes("edge_research_only") || t.includes("official_ce_not_filled")) &&
      hasEdgeContext(tokens, cards)
    ) {
      active.add("HA-003");
    }
    if (t.includes("setup_incomplete") || t.includes("humanized_wait_for_completion")) {
      policyOnly.delete("HA-010");
      active.add("HA-010");
    }
    if (t.includes("humanized_near_miss_ce") || t.includes("entry_near_miss") || t.includes("near_miss")) {
      policyOnly.delete("HA-001");
      active.add("HA-001");
    }
    if (t.includes("humanized_near_miss_weak_reaction") || t.includes("weak_reaction")) {
      policyOnly.delete("HA-002");
      active.add("HA-002");
    }
  }

  for (const ref of active) policyOnly.delete(ref);

  return {
    active_case_refs: [...active].sort(),
    missing_measurement_case_refs: [...missing].sort(),
    policy_only_case_refs: [...policyOnly].sort(),
    notes,
  };
}

export function parseSetupReadinessReportJson(text: string): SetupReadinessReport | null {
  try {
    const parsed = JSON.parse(text) as SetupReadinessReport;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.header || !parsed.executive_summary) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseLatestValidReportResultJson(text: string): LatestValidReportResult | null {
  try {
    const parsed = JSON.parse(text) as LatestValidReportResult;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function decisionLabel(decision: DashboardDecisionKey, language: SetupReadinessReportLanguage): string {
  return language === "es" ? DECISION_LABELS_ES[decision] : DECISION_LABELS_EN[decision];
}

function buildDisplayBadges(
  decision: DashboardDecisionKey,
  score: number,
  warningCount: number,
  language: SetupReadinessReportLanguage,
): DashboardDisplayBadge[] {
  const badges: DashboardDisplayBadge[] = [];
  if (isHighSetupReadinessScore(score) && decision === "reject") {
    badges.push({
      id: "high_score_reject",
      label:
        language === "es"
          ? "Puntaje alto, pero rechazado por bloqueo crítico"
          : "High score, rejected by critical blocker",
      tooltip:
        language === "es"
          ? "El puntaje no es permiso de entrada; un bloqueo crítico puede anular la aceptación."
          : "Score is not permission to trade; critical blockers can override readiness.",
    });
  }
  if (decision === "candidate" && warningCount > 0) {
    badges.push({
      id: "candidate_with_warnings",
      label: language === "es" ? "Candidato — revisar advertencias" : "Candidate — review warnings",
      note:
        language === "es"
          ? "Confirmación discrecional requerida."
          : "Discretionary confirmation required.",
    });
  }
  return badges;
}

export function validateTradeCardViewMinimumDisplay(view: DashboardTradeCardView): string | null {
  const grade = (view.grade ?? "").trim();
  const hasBlocker = normBlocker(view.primary_blocker) !== "none";
  const hasMainReason = !!(view.main_reason ?? "").trim();
  const reasons = view.top_reasons ?? [];

  if (!view.decision) return `trade ${view.trade_id}: missing decision`;
  if (!Number.isFinite(view.score)) return `trade ${view.trade_id}: missing score`;
  if (!grade) return `trade ${view.trade_id}: missing grade`;
  if (!hasBlocker && !hasMainReason) return `trade ${view.trade_id}: missing blocker or main reason`;
  if (!Number.isFinite(view.warning_count)) return `trade ${view.trade_id}: missing warning_count`;
  if (!reasons.length) return `trade ${view.trade_id}: missing reasons`;
  return null;
}

/** @deprecated Prefer validateTradeCardViewMinimumDisplay after mapTradeCard. */
export function validateTradeCardMinimumDisplay(card: SetupReadinessReportTradeCard): string | null {
  const view = mapTradeCard(card, "es", "backtest_research");
  return validateTradeCardViewMinimumDisplay(view);
}

function mapTradeCard(
  card: SetupReadinessReportTradeCard,
  language: SetupReadinessReportLanguage,
  mode: DashboardReadonlyMode,
): DashboardTradeCardView {
  const decision = normDecision(card.setup_readiness_decision);
  const score = card.setup_readiness_score ?? 0;
  const warningCount = card.setup_readiness_warning_count ?? 0;
  const resolved = resolveTradeCardReasonContext(card);

  const governanceNotes = [
    language === "es"
      ? "Vista read-only; no ejecuta trades ni gates."
      : "Read-only view; does not execute trades or gates.",
  ];
  if (!resolved.reason_is_hard_blocker && resolved.main_reason) {
    governanceNotes.push(
      language === "es"
        ? "Motivo principal contextual; no es bloqueador duro."
        : "Contextual main reason; not a hard blocker.",
    );
  }

  const view: DashboardTradeCardView = {
    trade_id: card.trade_id,
    setup_time: card.entry_time,
    entry_time: card.entry_time,
    direction: card.direction,
    decision,
    decision_label: decisionLabel(decision, language),
    score,
    grade: card.setup_readiness_grade,
    primary_blocker: resolved.primary_blocker,
    main_reason: resolved.main_reason,
    blocker_count: card.setup_readiness_blocker_count ?? 0,
    warning_count: warningCount,
    top_reasons: [...(card.top_reasons ?? [])],
    categories: [...(card.categories ?? [card.category].filter(Boolean))],
    component_grades: {
      ifvg: card.checklist_ifvg_grade ?? "",
      target: card.checklist_target_grade ?? "",
      environment: card.checklist_execution_environment_grade ?? "",
      discipline: card.checklist_discipline_grade ?? "",
      entry_family: card.checklist_entry_candidate_family ?? "",
    },
    display_badges: buildDisplayBadges(decision, score, warningCount, language),
    warnings: [],
    governance_notes: governanceNotes,
  };

  if (mode === "backtest_research") {
    view.outcome = card.outcome;
  }

  return view;
}

function buildDecisionSummary(
  counts: Record<string, number>,
  tradeCount: number,
): DashboardDecisionSummaryRow[] {
  const keys: DashboardDecisionKey[] = ["candidate", "wait", "reject", "unknown"];
  return keys.map((decision) => {
    const count = counts[decision] ?? 0;
    const percent = tradeCount > 0 ? (count / tradeCount) * 100 : 0;
    return {
      decision,
      count,
      percent,
      label_es: DECISION_LABELS_ES[decision],
      label_en: DECISION_LABELS_EN[decision],
    };
  });
}

export function buildDashboardReadonlyView(input: DashboardReadonlyAdapterInput): DashboardReadonlyView {
  const language = input.language ?? "es";
  const nowUtc = input.nowUtc ?? new Date().toISOString();
  const sourcePaths = input.sourcePaths ?? {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = input.strict === true;

  const report = parseSetupReadinessReportJson(input.reportJsonText);
  if (!report) {
    return {
      schema_version: DASHBOARD_READONLY_VIEW_SCHEMA_VERSION,
      ok: false,
      generated_at_utc: nowUtc,
      mode: "backtest_research",
      read_only: true,
      header: {
        bundle: "",
        bundle_name: "",
        selected_bundle_id: null,
        ea_build: null,
        symbol: null,
        timeframe: null,
        campaign_id: null,
        parameter_set_id: null,
        trade_count: 0,
        source_paths: sourcePaths,
        valid_status_before_report: null,
      },
      campaign_summary: {
        average_setup_readiness_score: null,
        candidate_count: 0,
        wait_count: 0,
        reject_count: 0,
        unknown_count: 0,
        grade_distribution: {},
        average_blocker_count: null,
        average_warning_count: null,
        minimum_display_unit_enforced: false,
      },
      decision_summary: buildDecisionSummary({}, 0),
      trade_card_decision_summary: buildDecisionSummary({}, 0),
      blocker_summary: { top_blockers: [], high_score_reject_by_primary: [] },
      warning_summary: { top_warnings: [] },
      trade_cards: [],
      casebook_alignment: alignHumanizedCasebook([], []),
      governance: DASHBOARD_GOVERNANCE,
      warnings,
      errors: ["setup_readiness_report.json could not be parsed"],
    };
  }

  if (!report.ok) {
    errors.push("setup_readiness_report.json reports ok=false");
  }
  warnings.push(...(report.warnings ?? []));

  let selectedBundleId: string | null = null;
  let validStatusBeforeReport: string | null = null;
  let headerTimeframe = report.header.timeframe;
  let latestResult: LatestValidReportResult | null = null;

  if (input.latestResultJsonText) {
    latestResult = parseLatestValidReportResultJson(input.latestResultJsonText);
    if (!latestResult) {
      warnings.push("latest_valid_report_result.json could not be parsed");
    } else {
      selectedBundleId = latestResult.selected_bundle_id;
      validStatusBeforeReport = latestResult.valid_status_before_report ?? null;
      if (latestResult.timeframe) headerTimeframe = latestResult.timeframe;
      if (!latestResult.ok) warnings.push("latest_valid_report_result.json reports ok=false");
    }
  }

  if (input.indexJsonText) {
    try {
      parseBundleIndexJson(input.indexJsonText);
    } catch {
      warnings.push("bundles.index.json could not be parsed");
    }
  }

  const mode: DashboardReadonlyMode = "backtest_research";
  const tradeCards: DashboardTradeCardView[] = [];
  const cardErrors: string[] = [];

  const exampleCards = report.example_cards ?? [];
  for (const card of exampleCards) {
    const view = mapTradeCard(card, language, mode);
    const validationErr = validateTradeCardViewMinimumDisplay(view);
    if (validationErr) {
      cardErrors.push(validationErr);
      continue;
    }
    tradeCards.push(view);
  }

  if (cardErrors.length) {
    errors.push(...cardErrors);
  }

  const minimumOk = cardErrors.length === 0 && tradeCards.length > 0 && exampleCards.length > 0;

  if (!minimumOk && exampleCards.length) {
    errors.push("minimum display unit not satisfied for one or more trade cards");
  }

  const exec = report.executive_summary;
  const campaignDecisionCounts = resolveCampaignDecisionCounts(report, latestResult);
  const tradeCount = report.header.trade_count ?? 0;
  const exampleDecisionCounts = countDecisionsFromExampleCards(exampleCards);
  const exampleCardCount = exampleCards.length;

  const tokens = collectAlignmentTokens(report, tradeCards);
  const casebook = alignHumanizedCasebook(tokens, tradeCards);

  const ok =
    report.ok &&
    minimumOk &&
    (strict ? errors.length === 0 && warnings.length === 0 : errors.length === 0);

  return {
    schema_version: DASHBOARD_READONLY_VIEW_SCHEMA_VERSION,
    ok,
    generated_at_utc: nowUtc,
    mode,
    read_only: true,
    header: {
      bundle: report.header.bundle,
      bundle_name: report.header.bundle_name,
      selected_bundle_id: selectedBundleId,
      ea_build: report.header.ea_build,
      symbol: report.header.symbol,
      timeframe: headerTimeframe,
      campaign_id: report.header.campaign_id,
      parameter_set_id: report.header.parameter_set_id,
      trade_count: tradeCount,
      source_paths: sourcePaths,
      valid_status_before_report: validStatusBeforeReport,
    },
    campaign_summary: {
      average_setup_readiness_score: exec.average_setup_readiness_score,
      candidate_count: campaignDecisionCounts.candidate ?? 0,
      wait_count: campaignDecisionCounts.wait ?? 0,
      reject_count: campaignDecisionCounts.reject ?? 0,
      unknown_count: campaignDecisionCounts.unknown ?? 0,
      grade_distribution: { ...exec.grade_counts },
      average_blocker_count: exec.average_blocker_count,
      average_warning_count: exec.average_warning_count,
      minimum_display_unit_enforced: minimumOk,
    },
    decision_summary: buildDecisionSummary(campaignDecisionCounts, tradeCount),
    trade_card_decision_summary: buildDecisionSummary(exampleDecisionCounts, exampleCardCount),
    blocker_summary: {
      top_blockers: report.blocker_leaderboard?.primary_blocker_counts ?? exec.top_blockers ?? [],
      high_score_reject_by_primary: report.blocker_leaderboard?.high_score_reject_by_primary ?? [],
    },
    warning_summary: {
      top_warnings: report.warning_leaderboard ?? exec.top_warnings ?? [],
    },
    trade_cards: tradeCards,
    casebook_alignment: casebook,
    governance: DASHBOARD_GOVERNANCE,
    warnings,
    errors,
  };
}

export function dashboardReadonlyViewToJson(view: DashboardReadonlyView): string {
  return JSON.stringify(view, null, 2);
}

export function compactDashboardReadonlyViewSummary(view: DashboardReadonlyView): Record<string, unknown> {
  return {
    schema_version: view.schema_version,
    ok: view.ok,
    generated_at_utc: view.generated_at_utc,
    mode: view.mode,
    bundle: view.header.bundle,
    trade_count: view.header.trade_count,
    candidate_count: view.campaign_summary.candidate_count,
    wait_count: view.campaign_summary.wait_count,
    reject_count: view.campaign_summary.reject_count,
    unknown_count: view.campaign_summary.unknown_count,
    trade_cards_count: view.trade_cards.length,
    minimum_display_unit_enforced: view.campaign_summary.minimum_display_unit_enforced,
    errors: view.errors,
    warnings: view.warnings,
  };
}
