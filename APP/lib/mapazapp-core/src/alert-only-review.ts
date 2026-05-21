/**
 * E5.21.1 — Alert-only review model + formatter (local queue only; no channels, no MT5, no trading).
 * Consumes dashboard_readonly_view.json — does not recalculate scores or decisions.
 */

import { randomUUID } from "node:crypto";
import {
  DASHBOARD_READONLY_VIEW_SCHEMA_VERSION,
  type DashboardDecisionKey,
  type DashboardReadonlyView,
  type DashboardTradeCardView,
} from "./dashboard-readonly-adapter";
import { parseDashboardReadonlyViewJson } from "./dashboard-readonly-mock";
import type { SetupReadinessReportLanguage } from "./testea-setup-readiness-report";

export { parseDashboardReadonlyViewJson };

export const ALERT_REVIEW_SCHEMA_VERSION = "mapazapp_alert_review_v1" as const;
export const ALERT_REVIEW_SUMMARY_SCHEMA_VERSION = "mapazapp_alert_review_summary_v1" as const;

export const ALERT_REVIEW_MODE = "read_only_review" as const;
export const ALERT_DELIVERY_STATUS = "queued_local_only" as const;

/** Full-campaign alerting (1697 trades) is intentionally out of scope for E5.21.1 — trade_cards[] example subset only. */
export const ALERT_REVIEW_TRADE_CARD_SCOPE_NOTE =
  "E5.21.1 generates at most one alert per trade_cards[] example row; full-campaign alerting is future work." as const;

export type AlertReviewType =
  | "candidate_review"
  | "candidate_with_warnings"
  | "wait_context"
  | "reject_explanation"
  | "high_score_reject_review"
  | "report_ready"
  | "validation_failed"
  | "missing_measurement_notice";

export type AlertReviewSeverity = "info" | "review" | "caution";

export interface AlertReviewRecord {
  schema_version: typeof ALERT_REVIEW_SCHEMA_VERSION;
  alert_id: string;
  created_at_utc: string;
  source_bundle: string;
  selected_bundle_id: string | null;
  symbol: string | null;
  timeframe: string | null;
  mode: typeof ALERT_REVIEW_MODE;
  alert_type: AlertReviewType;
  decision: DashboardDecisionKey | "n/a";
  decision_label: string;
  score: number | null;
  grade: string | null;
  blocker_or_main_reason: string | null;
  warning_count: number;
  top_reasons: string[];
  casebook_refs: string[];
  title: string;
  message: string;
  governance_footer: string[];
  severity: AlertReviewSeverity;
  delivery_status: typeof ALERT_DELIVERY_STATUS;
  trade_id?: string;
}

export interface AlertReviewSummary {
  schema_version: typeof ALERT_REVIEW_SUMMARY_SCHEMA_VERSION;
  ok: boolean;
  source_bundle: string;
  symbol: string | null;
  timeframe: string | null;
  alerts_generated: number;
  by_type: Partial<Record<AlertReviewType, number>>;
  by_decision: Partial<Record<DashboardDecisionKey | "n/a", number>>;
  read_only: true;
  no_live_trading: true;
  no_gates: true;
  errors: string[];
  warnings: string[];
  scope_note?: string;
  output_jsonl?: string;
  output_summary?: string;
}

export const FORBIDDEN_ALERT_WORDING: readonly string[] = [
  "Buy now",
  "Sell now",
  "Comprar ahora",
  "Vender ahora",
  "Execute",
  "Ejecutar",
  "Entry approved",
  "Entrada aprobada",
  "Signal confirmed",
  "Señal confirmada",
  "Guaranteed setup",
  "Setup garantizado",
  "Auto trade",
  "Operación automática",
  "Gate passed",
  "Gate aprobado",
  "Trade now",
  "Entrar ahora",
] as const;

const HIGH_SCORE_REJECT_THRESHOLD = 70;

type AlertCopy = { title: string; message: string };

type AlertCopySet = Record<
  Exclude<AlertReviewType, "validation_failed">,
  AlertCopy
> & {
  validation_failed: AlertCopy;
};

const COPY_ES: AlertCopySet = {
  candidate_with_warnings: {
    title: "Candidato — revisar advertencias",
    message:
      "El setup merece revisión, pero contiene advertencias. Confirmación discrecional requerida.",
  },
  candidate_review: {
    title: "Candidato — revisión manual",
    message: "El setup puede revisarse manualmente. Esto no es permiso de entrada.",
  },
  wait_context: {
    title: "Esperar — contexto incompleto",
    message: "El contexto aún no está completo. Observar sin entrar.",
  },
  reject_explanation: {
    title: "Rechazado — bloqueo crítico",
    message: "El setup fue rechazado por bloqueo o baja preparación. Revisar el motivo principal.",
  },
  high_score_reject_review: {
    title: "Puntaje alto, pero rechazado por bloqueo crítico",
    message:
      "Componentes fuertes, pero un bloqueo crítico invalida la aceptación. El puntaje no es permiso de entrada.",
  },
  missing_measurement_notice: {
    title: "Mediciones pendientes para humanización",
    message:
      "Hay casos del casebook que no pueden evaluarse todavía por falta de medición exportada.",
  },
  report_ready: {
    title: "Informe read-only listo",
    message: "El informe de revisión está disponible para análisis manual.",
  },
  validation_failed: {
    title: "Validación del informe con errores",
    message: "La vista read-only reportó errores. Revisar el informe fuente antes de confiar en alertas.",
  },
};

const COPY_EN: AlertCopySet = {
  candidate_with_warnings: {
    title: "Review candidate — warnings present",
    message: "The setup warrants review but has warnings. Discretionary confirmation required.",
  },
  candidate_review: {
    title: "Review candidate — manual review",
    message: "The setup may be reviewed manually. This is not permission to enter.",
  },
  wait_context: {
    title: "Wait — context incomplete",
    message: "Context is not yet complete. Observe without entering.",
  },
  reject_explanation: {
    title: "Rejected — critical blocker",
    message: "The setup was rejected due to blocker or low readiness. Review the primary reason.",
  },
  high_score_reject_review: {
    title: "High score but rejected by blocker",
    message:
      "Strong components, but a critical blocker invalidates acceptance. Score is not permission to enter.",
  },
  missing_measurement_notice: {
    title: "Pending measurements for humanization",
    message: "Some casebook cases cannot be evaluated yet due to missing exported measurements.",
  },
  report_ready: {
    title: "Read-only report ready",
    message: "The review report is available for manual analysis.",
  },
  validation_failed: {
    title: "Report validation errors",
    message: "The read-only view reported errors. Review the source report before relying on alerts.",
  },
};

function copyFor(language: SetupReadinessReportLanguage): AlertCopySet {
  return language === "es" ? COPY_ES : COPY_EN;
}

export function buildGovernanceFooter(language: SetupReadinessReportLanguage): string[] {
  if (language === "es") {
    return [
      "Solo revisión read-only.",
      "El puntaje no es permiso para operar.",
      "Sin trading en vivo.",
      "Sin gates de ejecución.",
      "Entrada oficial: 50% / CE.",
      "TP oficial: RR2.",
      "Edge / 25% / adaptive permanecen solo investigación.",
      "Revisión manual requerida.",
    ];
  }
  return [
    "Read-only review only.",
    "Score is not permission to trade.",
    "No live trading.",
    "No execution gates.",
    "Official entry: 50% / CE.",
    "Official TP: RR2.",
    "Edge / 25% / adaptive remain research-only.",
    "Manual review required.",
  ];
}

export function findForbiddenAlertWording(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_ALERT_WORDING) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

export function alertRecordContainsForbiddenWording(alert: AlertReviewRecord): string | null {
  const parts = [
    alert.title,
    alert.message,
    alert.decision_label,
    alert.blocker_or_main_reason ?? "",
    ...alert.top_reasons,
    ...alert.governance_footer,
  ];
  for (const p of parts) {
    const hit = findForbiddenAlertWording(p);
    if (hit) return hit;
  }
  return null;
}

function blockerOrMainReason(card: DashboardTradeCardView): string | null {
  if (card.primary_blocker && card.primary_blocker !== "none") return card.primary_blocker;
  return card.main_reason;
}

function severityForType(type: AlertReviewType): AlertReviewSeverity {
  switch (type) {
    case "report_ready":
      return "info";
    case "candidate_review":
    case "wait_context":
      return "review";
    default:
      return "caution";
  }
}

export function classifyTradeCardAlertType(
  card: DashboardTradeCardView,
): AlertReviewType | null {
  const decision = card.decision;
  if (decision === "candidate") {
    return card.warning_count > 0 ? "candidate_with_warnings" : "candidate_review";
  }
  if (decision === "wait") return "wait_context";
  if (decision === "reject") {
    return card.score >= HIGH_SCORE_REJECT_THRESHOLD
      ? "high_score_reject_review"
      : "reject_explanation";
  }
  return null;
}

function baseHeaderFields(view: DashboardReadonlyView) {
  return {
    source_bundle: view.header.bundle,
    selected_bundle_id: view.header.selected_bundle_id,
    symbol: view.header.symbol,
    timeframe: view.header.timeframe,
  };
}

function makeAlert(
  view: DashboardReadonlyView,
  params: {
    alert_type: AlertReviewType;
    decision: DashboardDecisionKey | "n/a";
    decision_label: string;
    score: number | null;
    grade: string | null;
    blocker_or_main_reason: string | null;
    warning_count: number;
    top_reasons: string[];
    casebook_refs: string[];
    trade_id?: string;
    created_at_utc?: string;
    language: SetupReadinessReportLanguage;
  },
): AlertReviewRecord {
  const language = params.language;
  const copy = copyFor(language)[params.alert_type];
  return {
    schema_version: ALERT_REVIEW_SCHEMA_VERSION,
    alert_id: randomUUID(),
    created_at_utc: params.created_at_utc ?? view.generated_at_utc,
    ...baseHeaderFields(view),
    mode: ALERT_REVIEW_MODE,
    alert_type: params.alert_type,
    decision: params.decision,
    decision_label: params.decision_label,
    score: params.score,
    grade: params.grade,
    blocker_or_main_reason: params.blocker_or_main_reason,
    warning_count: params.warning_count,
    top_reasons: params.top_reasons,
    casebook_refs: params.casebook_refs,
    title: copy.title,
    message: copy.message,
    governance_footer: buildGovernanceFooter(language),
    severity: severityForType(params.alert_type),
    delivery_status: ALERT_DELIVERY_STATUS,
    ...(params.trade_id ? { trade_id: params.trade_id } : {}),
  };
}

export interface GenerateAlertsFromViewOptions {
  language?: SetupReadinessReportLanguage;
  nowUtc?: string;
}

export interface GenerateAlertsFromViewResult {
  alerts: AlertReviewRecord[];
  warnings: string[];
}

export function generateAlertsFromDashboardView(
  view: DashboardReadonlyView,
  options: GenerateAlertsFromViewOptions = {},
): GenerateAlertsFromViewResult {
  const language = options.language ?? "es";
  const warnings: string[] = [];
  const alerts: AlertReviewRecord[] = [];
  const createdAt = options.nowUtc ?? view.generated_at_utc;
  const casebookRefs = view.casebook_alignment?.active_case_refs ?? [];

  if (!view.ok || (view.errors?.length ?? 0) > 0) {
    alerts.push(
      makeAlert(view, {
        alert_type: "validation_failed",
        decision: "n/a",
        decision_label: language === "es" ? "Validación" : "Validation",
        score: null,
        grade: null,
        blocker_or_main_reason: view.errors?.[0] ?? null,
        warning_count: view.warnings?.length ?? 0,
        top_reasons: view.errors?.slice(0, 5) ?? [],
        casebook_refs: casebookRefs,
        created_at_utc: createdAt,
        language,
      }),
    );
  }

  alerts.push(
    makeAlert(view, {
      alert_type: "report_ready",
      decision: "n/a",
      decision_label: language === "es" ? "Informe listo" : "Report ready",
      score: view.campaign_summary?.average_setup_readiness_score ?? null,
      grade: null,
      blocker_or_main_reason: null,
      warning_count: 0,
      top_reasons: [],
      casebook_refs: casebookRefs,
      created_at_utc: createdAt,
      language,
    }),
  );

  const missing = view.casebook_alignment?.missing_measurement_case_refs ?? [];
  if (missing.includes("HA-007") || missing.includes("HA-008")) {
    alerts.push(
      makeAlert(view, {
        alert_type: "missing_measurement_notice",
        decision: "n/a",
        decision_label: language === "es" ? "Medición pendiente" : "Missing measurement",
        score: null,
        grade: null,
        blocker_or_main_reason: null,
        warning_count: 0,
        top_reasons: missing.filter((r) => r === "HA-007" || r === "HA-008"),
        casebook_refs: missing.filter((r) => r === "HA-007" || r === "HA-008"),
        created_at_utc: createdAt,
        language,
      }),
    );
  }

  const tradeCards = view.trade_cards ?? [];
  const seenTradeIds = new Set<string>();
  for (const card of tradeCards) {
    if (seenTradeIds.has(card.trade_id)) {
      warnings.push(`Skipped duplicate trade_id in trade_cards: ${card.trade_id}`);
      continue;
    }
    seenTradeIds.add(card.trade_id);

    const alertType = classifyTradeCardAlertType(card);
    if (!alertType) {
      warnings.push(`Skipped trade card without alert mapping: ${card.trade_id} (${card.decision})`);
      continue;
    }

    alerts.push(
      makeAlert(view, {
        alert_type: alertType,
        decision: card.decision,
        decision_label: card.decision_label,
        score: card.score,
        grade: card.grade,
        blocker_or_main_reason: blockerOrMainReason(card),
        warning_count: card.warning_count,
        top_reasons: card.top_reasons?.slice(0, 5) ?? [],
        casebook_refs: [],
        trade_id: card.trade_id,
        created_at_utc: createdAt,
        language,
      }),
    );
  }

  for (const alert of alerts) {
    const forbidden = alertRecordContainsForbiddenWording(alert);
    if (forbidden) {
      throw new Error(`Forbidden alert wording detected: ${forbidden}`);
    }
  }

  return { alerts, warnings };
}

export function alertsToJsonl(alerts: AlertReviewRecord[]): string {
  return alerts.map((a) => JSON.stringify(a)).join("\n") + (alerts.length ? "\n" : "");
}

export function buildAlertReviewSummary(
  view: DashboardReadonlyView,
  alerts: AlertReviewRecord[],
  extra?: { warnings?: string[]; output_jsonl?: string; output_summary?: string },
): AlertReviewSummary {
  const by_type: Partial<Record<AlertReviewType, number>> = {};
  const by_decision: Partial<Record<DashboardDecisionKey | "n/a", number>> = {};

  for (const a of alerts) {
    by_type[a.alert_type] = (by_type[a.alert_type] ?? 0) + 1;
    by_decision[a.decision] = (by_decision[a.decision] ?? 0) + 1;
  }

  return {
    schema_version: ALERT_REVIEW_SUMMARY_SCHEMA_VERSION,
    ok: view.schema_version === DASHBOARD_READONLY_VIEW_SCHEMA_VERSION,
    source_bundle: view.header.bundle,
    symbol: view.header.symbol,
    timeframe: view.header.timeframe,
    alerts_generated: alerts.length,
    by_type,
    by_decision,
    read_only: true,
    no_live_trading: true,
    no_gates: true,
    errors: view.errors ?? [],
    warnings: [...(view.warnings ?? []), ...(extra?.warnings ?? [])],
    scope_note: ALERT_REVIEW_TRADE_CARD_SCOPE_NOTE,
    ...(extra?.output_jsonl ? { output_jsonl: extra.output_jsonl } : {}),
    ...(extra?.output_summary ? { output_summary: extra.output_summary } : {}),
  };
}

export function compactAlertReviewCliSummary(summary: AlertReviewSummary): Record<string, unknown> {
  return {
    schema_version: summary.schema_version,
    ok: summary.ok,
    source_bundle: summary.source_bundle,
    symbol: summary.symbol,
    timeframe: summary.timeframe,
    alerts_generated: summary.alerts_generated,
    by_type: summary.by_type,
    read_only: summary.read_only,
    no_live_trading: summary.no_live_trading,
    no_gates: summary.no_gates,
    errors: summary.errors,
    warnings: summary.warnings,
    delivery: ALERT_DELIVERY_STATUS,
  };
}
