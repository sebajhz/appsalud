/**
 * E5.20.4 — Dashboard read-only mock HTML generator (presentation only; no MT5, no trading, no gates).
 * Consumes dashboard_readonly_view.json only — does not recalculate scores or decisions.
 */

import {
  DASHBOARD_READONLY_VIEW_SCHEMA_VERSION,
  type DashboardDecisionSummaryRow,
  type DashboardReadonlyView,
  type DashboardTradeCardView,
} from "./dashboard-readonly-adapter";
import type {
  SetupReadinessLeaderboardEntry,
  SetupReadinessReportLanguage,
} from "./testea-setup-readiness-report";

export const DASHBOARD_READONLY_MOCK_GENERATOR_VERSION = "mapazapp_dashboard_readonly_mock_v1" as const;

export interface DashboardReadonlyMockRenderOptions {
  language?: SetupReadinessReportLanguage;
  title?: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function decisionLabel(row: DashboardDecisionSummaryRow, language: SetupReadinessReportLanguage): string {
  return language === "es" ? row.label_es : row.label_en;
}

type MockCopy = {
  title: string;
  readOnlyBadge: string;
  backtestBadge: string;
  noLive: string;
  noGates: string;
  officialEntry: string;
  officialTp: string;
  governanceTitle: string;
  governanceLines: string[];
  campaignTitle: string;
  tradeCardsExample: string;
  decisionDistTitle: string;
  exampleCardsOnly: string;
  blockersTitle: string;
  warningsTitle: string;
  tradeCardsTitle: string;
  casebookTitle: string;
  casebookDisclaimer: string;
  activeCases: string;
  missingMeasurement: string;
  policyOnly: string;
  noData: string;
  primaryBlocker: string;
  mainReason: string;
  warningsCount: string;
  topReasons: string;
  outcomeResearch: string;
  avgScore: string;
  tradeCardsCount: string;
  minDisplay: string;
  generatedAt: string;
  errorsTitle: string;
  adapterWarnings: string;
};

const COPY_ES: MockCopy = {
  title: "Mapazapp — Dashboard read-only (mock)",
  readOnlyBadge: "Solo lectura",
  backtestBadge: "Investigación / backtest",
  noLive: "Sin trading en vivo",
  noGates: "Sin gates",
  officialEntry: "Entrada oficial",
  officialTp: "TP oficial",
  governanceTitle: "Soporte de decisión read-only",
  governanceLines: [
    "El puntaje no es permiso para operar.",
    "Sin trading en vivo.",
    "Sin gates de ejecución.",
    "La entrada oficial sigue siendo 50 % / CE.",
    "El TP oficial sigue siendo RR2.",
    "Edge / 25 % / adaptive permanecen solo investigación.",
  ],
  campaignTitle: "Resumen de campaña",
  tradeCardsExample: "Tarjetas ejemplo",
  decisionDistTitle: "Distribución de decisiones (campaña)",
  exampleCardsOnly: "Solo tarjetas ejemplo (subconjunto)",
  blockersTitle: "Bloqueadores principales",
  warningsTitle: "Advertencias principales",
  tradeCardsTitle: "Tarjetas de trade (ejemplo)",
  casebookTitle: "Alineación casebook humanizado",
  casebookDisclaimer: "Referencia de política / casebook, no señal de entrada.",
  activeCases: "Casos activos (referencia)",
  missingMeasurement: "Medición ausente",
  policyOnly: "Solo política",
  noData: "Sin datos disponibles",
  primaryBlocker: "Bloqueador",
  mainReason: "Motivo principal",
  warningsCount: "Advertencias",
  topReasons: "Razones principales",
  outcomeResearch: "Outcome (solo investigación / backtest)",
  avgScore: "Puntaje medio",
  tradeCardsCount: "Tarjetas ejemplo",
  minDisplay: "Unidad mínima de display",
  generatedAt: "Generado (UTC)",
  errorsTitle: "Errores del adaptador",
  adapterWarnings: "Advertencias del adaptador",
};

const COPY_EN: MockCopy = {
  title: "Mapazapp — Read-only dashboard (mock)",
  readOnlyBadge: "Read-only",
  backtestBadge: "Research / backtest",
  noLive: "No live trading",
  noGates: "No gates",
  officialEntry: "Official entry",
  officialTp: "Official TP",
  governanceTitle: "Read-only decision support",
  governanceLines: [
    "Score is not permission to trade.",
    "No live trading.",
    "No execution gates.",
    "Official entry remains 50% / CE.",
    "Official TP remains RR2.",
    "Edge / 25% / adaptive remain research-only.",
  ],
  campaignTitle: "Campaign summary",
  tradeCardsExample: "Example cards",
  decisionDistTitle: "Decision distribution (campaign)",
  exampleCardsOnly: "Example cards only (subset)",
  blockersTitle: "Top blockers",
  warningsTitle: "Top warnings",
  tradeCardsTitle: "Trade cards (examples)",
  casebookTitle: "Humanized casebook alignment",
  casebookDisclaimer: "Policy / casebook reference, not an entry signal.",
  activeCases: "Active cases (reference)",
  missingMeasurement: "Missing measurement",
  policyOnly: "Policy only",
  noData: "No data available",
  primaryBlocker: "Blocker",
  mainReason: "Main reason",
  warningsCount: "Warnings",
  topReasons: "Top reasons",
  outcomeResearch: "Outcome (research / backtest only)",
  avgScore: "Average score",
  tradeCardsCount: "Example trade cards",
  minDisplay: "Minimum display unit",
  generatedAt: "Generated (UTC)",
  errorsTitle: "Adapter errors",
  adapterWarnings: "Adapter warnings",
};

function copyFor(language: SetupReadinessReportLanguage): MockCopy {
  return language === "es" ? COPY_ES : COPY_EN;
}

export function parseDashboardReadonlyViewJson(text: string): DashboardReadonlyView | null {
  try {
    const parsed = JSON.parse(text) as DashboardReadonlyView;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema_version !== DASHBOARD_READONLY_VIEW_SCHEMA_VERSION) return null;
    if (!parsed.header || !Array.isArray(parsed.decision_summary)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function renderLeaderboard(
  entries: SetupReadinessLeaderboardEntry[] | undefined,
  emptyLabel: string,
): string {
  if (!entries?.length) {
    return `<p class="muted">${escapeHtml(emptyLabel)}</p>`;
  }
  const rows = entries
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.key)}</td><td class="num">${e.count}</td><td class="num">${fmtNum(e.pct, 2)}%</td></tr>`,
    )
    .join("");
  return `<table class="data"><thead><tr><th>Key</th><th>Count</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDecisionCards(
  rows: DashboardDecisionSummaryRow[],
  language: SetupReadinessReportLanguage,
  cssClass: string,
): string {
  if (!rows.length) return "";
  return rows
    .map((row) => {
      const label = escapeHtml(decisionLabel(row, language));
      const pct = fmtNum(row.percent, 2);
      return `<div class="stat-card ${cssClass} dec-${escapeHtml(row.decision)}">
  <div class="stat-label">${label}</div>
  <div class="stat-value">${row.count}</div>
  <div class="stat-pct">${pct}%</div>
</div>`;
    })
    .join("\n");
}

function renderTradeCard(card: DashboardTradeCardView, copy: MockCopy): string {
  const showMainReason = card.primary_blocker === "none" && !!(card.main_reason ?? "").trim();
  const reasonLabel = showMainReason ? copy.mainReason : copy.primaryBlocker;
  const reasonValue = showMainReason
    ? escapeHtml(card.main_reason!)
    : escapeHtml(card.primary_blocker);

  const badges = (card.display_badges ?? [])
    .map((b) => {
      const note = b.note ? `<div class="badge-note">${escapeHtml(b.note)}</div>` : "";
      const tip = b.tooltip ? ` title="${escapeHtml(b.tooltip)}"` : "";
      return `<span class="badge badge-${escapeHtml(b.id)}"${tip}>${escapeHtml(b.label)}</span>${note}`;
    })
    .join("");

  const reasons = (card.top_reasons ?? [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");

  const govNotes = (card.governance_notes ?? [])
    .map((n) => `<li class="muted">${escapeHtml(n)}</li>`)
    .join("");

  const outcomeBlock =
    card.outcome != null
      ? `<div class="outcome-research"><strong>${escapeHtml(copy.outcomeResearch)}:</strong> ${escapeHtml(card.outcome)}</div>`
      : "";

  return `<article class="trade-card dec-${escapeHtml(card.decision)}">
  <header class="trade-card-header">
    <h3>${escapeHtml(card.trade_id)}</h3>
    <span class="decision-pill">${escapeHtml(card.decision_label)}</span>
  </header>
  <div class="trade-metrics">
    <span><strong>Score</strong> ${card.score}</span>
    <span><strong>Grade</strong> ${escapeHtml(card.grade)}</span>
    <span><strong>${escapeHtml(copy.warningsCount)}</strong> ${card.warning_count}</span>
    <span><strong>${escapeHtml(reasonLabel)}</strong> ${reasonValue}</span>
  </div>
  ${badges ? `<div class="badges">${badges}</div>` : ""}
  ${reasons ? `<div><strong>${escapeHtml(copy.topReasons)}</strong><ul>${reasons}</ul></div>` : ""}
  ${outcomeBlock}
  ${govNotes ? `<ul class="gov-notes">${govNotes}</ul>` : ""}
</article>`;
}

export function renderDashboardReadonlyMockHtml(
  view: DashboardReadonlyView,
  options: DashboardReadonlyMockRenderOptions = {},
): string {
  const language = options.language ?? "es";
  const copy = copyFor(language);
  const title = options.title ?? copy.title;
  const h = view.header;
  const cs = view.campaign_summary;
  const g = view.governance;

  const governanceBanner = `<section class="governance-banner" aria-label="${escapeHtml(copy.governanceTitle)}">
  <h2>${escapeHtml(copy.governanceTitle)}</h2>
  <ul>${copy.governanceLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
</section>`;

  const headerBadges = `
    <span class="pill pill-readonly">${escapeHtml(copy.readOnlyBadge)}</span>
    <span class="pill pill-backtest">${escapeHtml(copy.backtestBadge)}</span>
    <span class="pill pill-safe">${escapeHtml(copy.noLive)}</span>
    <span class="pill pill-safe">${escapeHtml(copy.noGates)}</span>`;

  const campaignStats = renderDecisionCards(view.decision_summary, language, "campaign");
  const exampleStats = renderDecisionCards(view.trade_card_decision_summary, language, "example");

  const errorsBlock =
    view.errors?.length ?
      `<section class="panel panel-error"><h2>${escapeHtml(copy.errorsTitle)}</h2><ul>${view.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></section>`
    : "";

  const warningsBlock =
    view.warnings?.length ?
      `<section class="panel panel-warn"><h2>${escapeHtml(copy.adapterWarnings)}</h2><ul>${view.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></section>`
    : "";

  const casebook = view.casebook_alignment;
  const caseList = (label: string, refs: string[]) =>
    refs.length ?
      `<div><strong>${escapeHtml(label)}</strong><p>${refs.map((r) => `<code>${escapeHtml(r)}</code>`).join(" ")}</p></div>`
    : `<div><strong>${escapeHtml(label)}</strong><p class="muted">—</p></div>`;

  const tradeCardsHtml = view.trade_cards.length
    ? view.trade_cards.map((c) => renderTradeCard(c, copy)).join("\n")
    : `<p class="muted">${escapeHtml(copy.noData)}</p>`;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)} — ${escapeHtml(h.bundle)}</title>
<style>
:root{--bg:#f4f5f8;--card:#fff;--text:#1a1a2e;--muted:#5c5c72;--accent:#2d4a7a;--warn:#8a5a00;--ok:#1e6b3a;--reject:#8b2635;--candidate:#1a5f8a;--wait:#6b5a1a}
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:var(--bg);color:var(--text);line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:1.25rem 1.5rem 3rem}
header.page-header{background:var(--card);border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
header.page-header h1{margin:0 0 .5rem;font-size:1.35rem}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.5rem .75rem;font-size:.92rem}
.pills{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.75rem}
.pill{font-size:.75rem;font-weight:600;padding:.2rem .55rem;border-radius:999px;border:1px solid #ccc}
.pill-readonly{background:#e8eef8;color:var(--accent)}
.pill-backtest{background:#eef6ea;color:var(--ok)}
.pill-safe{background:#f0f0f4;color:var(--muted)}
.governance-banner{background:#fff8e6;border:1px solid #e6d49a;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1rem}
.governance-banner h2{margin:0 0 .5rem;font-size:1.05rem;color:var(--warn)}
.governance-banner ul{margin:0;padding-left:1.2rem}
.panel{background:var(--card);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.panel h2{margin:0 0 .75rem;font-size:1.1rem;color:var(--accent)}
.panel-error{border-left:4px solid var(--reject)}
.panel-warn{border-left:4px solid var(--warn)}
.stats-row{display:flex;flex-wrap:wrap;gap:.75rem}
.stat-card{flex:1 1 140px;background:#f8f9fc;border-radius:8px;padding:.75rem 1rem;border:1px solid #e2e4ec}
.stat-card .stat-label{font-size:.82rem;color:var(--muted)}
.stat-card .stat-value{font-size:1.5rem;font-weight:700}
.stat-card .stat-pct{font-size:.85rem;color:var(--muted)}
.stat-card.dec-candidate{border-color:#9ecae8}
.stat-card.dec-wait{border-color:#d4c48a}
.stat-card.dec-reject{border-color:#d4a0a8}
.stat-card.dec-unknown{border-color:#ccc}
.stat-card.example{opacity:.92;border-style:dashed}
.muted{color:var(--muted);font-size:.9rem}
.subtitle{font-size:.85rem;color:var(--muted);margin:-.35rem 0 .75rem}
table.data{width:100%;border-collapse:collapse;font-size:.9rem}
table.data th,table.data td{border:1px solid #ddd;padding:.4rem .55rem;text-align:left}
table.data .num{text-align:right}
.trade-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
.trade-card{background:#fafbfe;border:1px solid #e0e4ef;border-radius:8px;padding:1rem}
.trade-card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.5rem}
.trade-card-header h3{margin:0;font-size:1rem}
.decision-pill{font-size:.78rem;font-weight:600;padding:.15rem .5rem;border-radius:6px;background:#e8eef8}
.trade-metrics{display:flex;flex-wrap:wrap;gap:.35rem .75rem;font-size:.88rem;margin-bottom:.5rem}
.badges{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0}
.badge{font-size:.75rem;background:#e8eef8;padding:.2rem .45rem;border-radius:4px}
.badge-note{font-size:.72rem;color:var(--muted);margin-top:.15rem}
.badge-high_score_reject{background:#fde8ea}
.badge-candidate_with_warnings{background:#e8f4fc}
.outcome-research{font-size:.82rem;color:var(--muted);margin-top:.5rem;font-style:italic}
.gov-notes{font-size:.78rem;margin:.35rem 0 0}
.casebook-disclaimer{font-size:.88rem;color:var(--warn);margin-bottom:.75rem}
footer.mock-footer{margin-top:2rem;font-size:.8rem;color:var(--muted);text-align:center}
</style>
</head>
<body>
<div class="wrap">
<header class="page-header">
  <h1>${escapeHtml(title)}</h1>
  <div class="pills">${headerBadges}</div>
  <div class="meta-grid" style="margin-top:1rem">
    <div><strong>Bundle</strong><br/>${escapeHtml(h.bundle)}</div>
    <div><strong>Build</strong><br/>${escapeHtml(h.ea_build ?? "—")}</div>
    <div><strong>Symbol / TF</strong><br/>${escapeHtml(h.symbol ?? "—")} / ${escapeHtml(h.timeframe ?? "—")}</div>
    <div><strong>Trades</strong><br/>${h.trade_count}</div>
    <div><strong>${escapeHtml(copy.officialEntry)}</strong><br/>${escapeHtml(g.official_entry)}</div>
    <div><strong>${escapeHtml(copy.officialTp)}</strong><br/>${escapeHtml(g.official_tp)}</div>
    <div><strong>${escapeHtml(copy.generatedAt)}</strong><br/>${escapeHtml(view.generated_at_utc)}</div>
    <div><strong>Schema</strong><br/><code>${escapeHtml(view.schema_version)}</code></div>
  </div>
</header>

${governanceBanner}
${errorsBlock}
${warningsBlock}

<section class="panel">
  <h2>${escapeHtml(copy.campaignTitle)}</h2>
  <div class="meta-grid" style="margin-bottom:1rem">
    <div><strong>${escapeHtml(copy.avgScore)}</strong><br/>${fmtNum(cs.average_setup_readiness_score, 2)}</div>
    <div><strong>${escapeHtml(copy.tradeCardsCount)}</strong><br/>${view.trade_cards.length}</div>
    <div><strong>${escapeHtml(copy.minDisplay)}</strong><br/>${cs.minimum_display_unit_enforced ? "✓" : "✗"}</div>
  </div>
  <h3 class="subtitle">${escapeHtml(copy.decisionDistTitle)}</h3>
  <div class="stats-row">${campaignStats}</div>
  <h3 class="subtitle">${escapeHtml(copy.exampleCardsOnly)}</h3>
  <div class="stats-row">${exampleStats}</div>
</section>

<section class="panel">
  <h2>${escapeHtml(copy.blockersTitle)}</h2>
  ${renderLeaderboard(view.blocker_summary?.top_blockers, copy.noData)}
  <h3 style="margin-top:1rem;font-size:1rem">${escapeHtml(language === "es" ? "Rechazo con puntaje alto por bloqueador" : "High-score reject by blocker")}</h3>
  ${renderLeaderboard(view.blocker_summary?.high_score_reject_by_primary, copy.noData)}
</section>

<section class="panel">
  <h2>${escapeHtml(copy.warningsTitle)}</h2>
  ${renderLeaderboard(view.warning_summary?.top_warnings, copy.noData)}
</section>

<section class="panel">
  <h2>${escapeHtml(copy.tradeCardsTitle)}</h2>
  <div class="trade-cards">${tradeCardsHtml}</div>
</section>

<section class="panel">
  <h2>${escapeHtml(copy.casebookTitle)}</h2>
  <p class="casebook-disclaimer">${escapeHtml(copy.casebookDisclaimer)}</p>
  ${caseList(copy.activeCases, casebook.active_case_refs)}
  ${caseList(copy.missingMeasurement, casebook.missing_measurement_case_refs)}
  ${caseList(copy.policyOnly, casebook.policy_only_case_refs)}
  ${casebook.notes?.length ? `<ul>${casebook.notes.map((n) => `<li class="muted">${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
</section>

<footer class="mock-footer">
  Mapazapp E5.20.4 — mock read-only · ${escapeHtml(DASHBOARD_READONLY_MOCK_GENERATOR_VERSION)} · ok=${String(view.ok)}
</footer>
</div>
</body>
</html>`;
}

export function compactDashboardReadonlyMockSummary(
  view: DashboardReadonlyView,
  outputHtml?: string,
): Record<string, unknown> {
  return {
    generator_version: DASHBOARD_READONLY_MOCK_GENERATOR_VERSION,
    schema_version: view.schema_version,
    ok: view.ok,
    bundle: view.header.bundle,
    trade_count: view.header.trade_count,
    trade_cards_rendered: view.trade_cards.length,
    output_html: outputHtml ?? null,
    read_only: view.read_only,
    no_live_trading: view.governance.no_live_trading,
    no_gates: view.governance.no_gates,
    has_governance_banner: true,
    has_trade_cards: view.trade_cards.length > 0,
    errors: view.errors,
    warnings: view.warnings,
  };
}
