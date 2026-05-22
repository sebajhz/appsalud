/**
 * E5.22.4.1 — Humanized casebook example selector (read-only research).
 * Selects representative SET001 trade IDs for HA-001…HA-010 and calibration categories.
 */

import { buildTestEaBundleImportOptions, importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestTrade, EntryVariantOutcomeSimSlot } from "./backtest-types";
import {
  isHighSetupReadinessScore,
  SETUP_READINESS_HIGH_SCORE_MIN,
} from "./testea-setup-readiness-decision-calibration-audit";

export const HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_SCHEMA =
  "mapazapp_humanized_casebook_example_selector_v1";

export interface TestEaHumanizedCasebookExampleSelectorBundleTextInput {
  bundleName: string;
  summaryJsonText: string;
  tradesCsvText: string;
}

export interface HumanizedCasebookExampleRecord {
  trade_id: string;
  case_id: string;
  category: string;
  direction: string;
  entry_time: string;
  session: string;
  outcome: string;
  result_r: number;
  setup_readiness_decision: string;
  setup_readiness_score: number | null;
  setup_readiness_grade: string;
  setup_readiness_primary_blocker: string;
  setup_readiness_reasons: string;
  ifvg_grade: string;
  ifvg_conflict: boolean | null;
  pd_conflict: boolean | null;
  target_grade: string;
  target_missing_proxy: boolean | null;
  environment_grade: string;
  volatility_bucket: string;
  spread_bucket: string;
  discipline_grade: string;
  overtrading_risk: boolean | null;
  revenge_trade_risk: boolean | null;
  entry_fill_status: string;
  entry_near_miss: boolean | null;
  entry_missed_shallow_retrace: boolean | null;
  entry_filled_late: boolean | null;
  entry_variant_edge_status: string;
  entry_variant_25_status: string;
  entry_variant_edge_result_r: number | null;
  reason_selected: string;
  current_interpretation: string;
  future_humanized_action: string;
  governance_note: string;
}

export interface FieldAvailabilityMap {
  news_event_fields: boolean;
  entry_filled_late: boolean;
  entry_near_miss: boolean;
  entry_missed_shallow_retrace: boolean;
  entry_fill_status: boolean;
  entry_variant_sim: boolean;
  setup_readiness_reasons: boolean;
  ifvg_conflict_with_trade_direction: boolean;
  pd_entry_zone_conflict: boolean;
  liquidity_target_reasons: boolean;
}

export interface TestEaHumanizedCasebookExampleSelectorResult {
  ok: boolean;
  schema_version: string;
  bundle: string;
  ea_build: string;
  symbol: string;
  timeframe: string;
  trade_count: number;
  examples_by_case: Record<string, HumanizedCasebookExampleRecord[]>;
  examples_by_calibration_category: Record<string, HumanizedCasebookExampleRecord[]>;
  missing_cases: string[];
  field_availability: FieldAvailabilityMap;
  warnings: string[];
  errors: string[];
  research_only_note: string;
}

export interface HumanizedCasebookExampleCsvRow {
  case_id: string;
  category: string;
  trade_id: string;
  outcome: string;
  result_r: number;
  decision: string;
  score: number | null;
  grade: string;
  primary_blocker: string;
  ifvg_grade: string;
  target_grade: string;
  environment_grade: string;
  discipline_grade: string;
  session: string;
  volatility: string;
  entry_status: string;
  reason_selected: string;
  interpretation: string;
  future_humanized_action: string;
  governance_note: string;
}

const RESEARCH_NOTE =
  "E5.22.4.1 research-only example selector. Does not approve gates, change entry/TP, promote edge/25/adaptive, or authorize live trading.";

const GOVERNANCE_NO_OFFICIAL_CHANGE =
  "Must not change official 50%/CE trade selection today — humanization is not active in MQL5.";

const GOVERNANCE_RESEARCH_ONLY =
  "Research and calibration review only; no gate or execution approval.";

type ScoredCandidate = { example: HumanizedCasebookExampleRecord; score: number };

function readSummaryString(summary: Record<string, unknown>, key: string): string | undefined {
  const v = summary[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
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

function variantSlotFromTrade(
  t: BacktestTrade,
  id: "edge" | "25" | "50" | "adaptive",
): EntryVariantOutcomeSimSlot | undefined {
  const sim = t.entryVariantOutcomeSim;
  if (!sim?.enabled) return undefined;
  if (id === "edge") return sim.edge;
  if (id === "25") return sim.p25;
  if (id === "50") return sim.p50;
  return sim.adaptive;
}

function variantStatus(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function isOfficialWeakOutcome(outcome: string): boolean {
  return outcome === "loss" || outcome === "ambiguous" || outcome === "expired_unfilled" || outcome === "expired_open";
}

function isNearMissTrade(t: BacktestTrade): boolean {
  const status = (t.entryFillStatus ?? "").trim().toLowerCase();
  return (
    t.entryNearMiss === true ||
    t.entryMissedShallowRetrace === true ||
    status === "near_miss" ||
    status === "missed_shallow_retrace"
  );
}

function isPdConflictTrade(t: BacktestTrade): boolean {
  return normBlocker(t.setupReadinessPrimaryBlocker) === "pd_conflict" || t.pdEntryZoneConflict === true;
}

function isTargetMissingTrade(t: BacktestTrade): boolean {
  if (normBlocker(t.setupReadinessPrimaryBlocker) === "target_missing") return true;
  const reasons = (t.liquidityTargetReasons ?? t.setupReadinessReasons ?? "").toLowerCase();
  if (reasons.includes("target_missing") || reasons.includes("liquidity_target_missing")) return true;
  const grade = normGrade(t.liquidityTargetGrade ?? t.checklistTargetGrade);
  return grade === "None" || grade === "Weak";
}

function isIfvgWeakTrade(t: BacktestTrade): boolean {
  const grade = normGrade(t.ifvgBisiSibiGrade ?? t.checklistIfvgGrade);
  return grade === "Weak";
}

function hasDisciplinePressure(t: BacktestTrade): boolean {
  const reasons = (t.setupReadinessReasons ?? "").toLowerCase();
  return (
    t.disciplineOvertradingRisk === true ||
    t.disciplineRevengeTradeRisk === true ||
    t.disciplineDailyLossLimitReached === true ||
    reasons.includes("overtrading") ||
    reasons.includes("daily_loss")
  );
}

function buildRecord(
  t: BacktestTrade,
  caseId: string,
  category: string,
  reasonSelected: string,
  interpretation: string,
  futureAction: string,
): HumanizedCasebookExampleRecord {
  const edge = variantSlotFromTrade(t, "edge");
  const v25 = variantSlotFromTrade(t, "25");
  return {
    trade_id: t.tradeId,
    case_id: caseId,
    category,
    direction: t.direction,
    entry_time: t.entryTime,
    session: (t.sessionBucket ?? t.disciplineSessionBucket ?? "unknown").trim() || "unknown",
    outcome: normOutcome(t.outcome),
    result_r: t.resultR,
    setup_readiness_decision: normDecision(t.setupReadinessDecision),
    setup_readiness_score: t.setupReadinessScore ?? null,
    setup_readiness_grade: normGrade(t.setupReadinessGrade),
    setup_readiness_primary_blocker: normBlocker(t.setupReadinessPrimaryBlocker),
    setup_readiness_reasons: (t.setupReadinessReasons ?? "").slice(0, 300),
    ifvg_grade: normGrade(t.ifvgBisiSibiGrade ?? t.checklistIfvgGrade),
    ifvg_conflict: t.ifvgConflictWithTradeDirection ?? null,
    pd_conflict: isPdConflictTrade(t) ? true : t.pdEntryZoneConflict === false ? false : null,
    target_grade: normGrade(t.liquidityTargetGrade ?? t.checklistTargetGrade),
    target_missing_proxy: isTargetMissingTrade(t) ? true : null,
    environment_grade: normGrade(t.executionEnvironmentGrade ?? t.checklistExecutionEnvironmentGrade),
    volatility_bucket: (t.volatilityBucket ?? "unknown").trim() || "unknown",
    spread_bucket: (t.spreadBucket ?? "unknown").trim() || "unknown",
    discipline_grade: normGrade(t.disciplineGrade ?? t.checklistDisciplineGrade),
    overtrading_risk: t.disciplineOvertradingRisk ?? null,
    revenge_trade_risk: t.disciplineRevengeTradeRisk ?? null,
    entry_fill_status: (t.entryFillStatus ?? "unknown").trim() || "unknown",
    entry_near_miss: t.entryNearMiss ?? null,
    entry_missed_shallow_retrace: t.entryMissedShallowRetrace ?? null,
    entry_filled_late: t.entryFilledLate ?? null,
    entry_variant_edge_status: variantStatus(edge?.status) || "unknown",
    entry_variant_25_status: variantStatus(v25?.status) || "unknown",
    entry_variant_edge_result_r: edge?.resultR ?? null,
    reason_selected: reasonSelected,
    current_interpretation: interpretation,
    future_humanized_action: futureAction,
    governance_note: `${GOVERNANCE_NO_OFFICIAL_CHANGE} ${GOVERNANCE_RESEARCH_ONLY}`,
  };
}

function upsertTop(
  bucket: ScoredCandidate[],
  candidate: ScoredCandidate,
  max: number,
): void {
  if (max <= 0) return;
  if (bucket.length < max) {
    bucket.push(candidate);
    bucket.sort((a, b) => b.score - a.score);
    return;
  }
  const min = bucket[bucket.length - 1]!.score;
  if (candidate.score <= min) return;
  bucket.push(candidate);
  bucket.sort((a, b) => b.score - a.score);
  bucket.length = max;
}

function finalizeBucket(bucket: ScoredCandidate[]): HumanizedCasebookExampleRecord[] {
  return bucket.map((c) => c.example);
}

function detectFieldAvailability(
  trades: BacktestTrade[],
  tradesCsvText: string,
): FieldAvailabilityMap {
  const header = tradesCsvText.split(/\r?\n/)[0]?.toLowerCase() ?? "";
  const sample = trades[0];
  const has = (col: string) => header.includes(col);
  return {
    news_event_fields:
      has("economic_calendar") ||
      has("news_event") ||
      has("event_minutes_since") ||
      has("news_context"),
    entry_filled_late: has("entry_filled_late") || sample?.entryFilledLate !== undefined,
    entry_near_miss: has("entry_near_miss") || sample?.entryNearMiss !== undefined,
    entry_missed_shallow_retrace:
      has("entry_missed_shallow_retrace") || sample?.entryMissedShallowRetrace !== undefined,
    entry_fill_status: has("entry_fill_status") || sample?.entryFillStatus !== undefined,
    entry_variant_sim: has("entry_variant_edge_sim_status") || sample?.entryVariantOutcomeSim?.enabled === true,
    setup_readiness_reasons:
      has("setup_readiness_reasons") || (sample?.setupReadinessReasons?.length ?? 0) > 0,
    ifvg_conflict_with_trade_direction:
      has("ifvg_conflict_with_trade_direction") || sample?.ifvgConflictWithTradeDirection !== undefined,
    pd_entry_zone_conflict: has("pd_entry_zone_conflict") || sample?.pdEntryZoneConflict !== undefined,
    liquidity_target_reasons:
      has("liquidity_target_reasons") || (sample?.liquidityTargetReasons?.length ?? 0) > 0,
  };
}

function selectExamples(
  trades: BacktestTrade[],
  maxPerCase: number,
  fieldAvailability: FieldAvailabilityMap,
): {
  byCase: Record<string, HumanizedCasebookExampleRecord[]>;
  byCalibration: Record<string, HumanizedCasebookExampleRecord[]>;
  missingCases: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const missingCases: string[] = [];

  const ha001: ScoredCandidate[] = [];
  const ha002: ScoredCandidate[] = [];
  const ha003: ScoredCandidate[] = [];
  const ha004Win: ScoredCandidate[] = [];
  const ha004Loss: ScoredCandidate[] = [];
  const ha005Win: ScoredCandidate[] = [];
  const ha005Loss: ScoredCandidate[] = [];
  const ha006Win: ScoredCandidate[] = [];
  const ha006Loss: ScoredCandidate[] = [];
  const ha007: ScoredCandidate[] = [];
  const ha009Loss: ScoredCandidate[] = [];
  const ha009Win: ScoredCandidate[] = [];
  const ha010Win: ScoredCandidate[] = [];
  const ha010Loss: ScoredCandidate[] = [];

  const cal: Record<string, ScoredCandidate[]> = {
    candidate_winner: [],
    candidate_loser: [],
    reject_winner: [],
    reject_loser: [],
    high_score_reject_winner: [],
    high_score_reject_loser: [],
    structure_conflict_winner: [],
    structure_conflict_loser: [],
    execution_environment_weak_winner: [],
    execution_environment_weak_loser: [],
    ifvg_weak_loser: [],
    ifvg_ab_winner: [],
  };

  for (const t of trades) {
    const outcome = normOutcome(t.outcome);
    const decision = normDecision(t.setupReadinessDecision);
    const blocker = normBlocker(t.setupReadinessPrimaryBlocker);

    if (isNearMissTrade(t)) {
      let score = 10;
      if (t.ifvgConflictWithTradeDirection !== true) score += 15;
      if (decision === "candidate" || decision === "wait") score += 10;
      if (outcome === "win") score += 5;
      const edge = variantSlotFromTrade(t, "edge");
      if (variantStatus(edge?.status) === "win") score += 20;
      upsertTop(
        ha001,
        {
          score,
          example: buildRecord(
            t,
            "HA-001",
            "near_miss_ce_acceptable",
            "Near-miss / shallow retrace with supportive checklist context (IFVG not conflict, readiness wait/candidate).",
            "Official CE may be unfilled (0R) but context may warrant manual near-miss review.",
            "Future: observe / accept-for-manual-review after tolerance + reaction_strength calibration.",
          ),
        },
        maxPerCase,
      );

      let weakScore = 10;
      if (t.ifvgConflictWithTradeDirection === true) weakScore += 25;
      if (isIfvgWeakTrade(t)) weakScore += 15;
      if (outcome === "loss") weakScore += 10;
      if (outcome === "ambiguous") weakScore += 5;
      upsertTop(
        ha002,
        {
          score: weakScore,
          example: buildRecord(
            t,
            "HA-002",
            "near_miss_weak_reaction",
            "Near-miss with weak proxies: IFVG conflict/weak grade or poor official outcome.",
            "Near-miss alone is insufficient; weak reaction proxies suggest no chase.",
            "Future: observe/reject near-miss without confirmation — requires reaction_strength export.",
          ),
        },
        maxPerCase,
      );
    }

    const officialWeak = isOfficialWeakOutcome(outcome);
    const edge = variantSlotFromTrade(t, "edge");
    const v25 = variantSlotFromTrade(t, "25");
    const edgeWin = variantStatus(edge?.status) === "win" && (edge?.resultR ?? 0) > 0;
    const v25Win = variantStatus(v25?.status) === "win" && (v25?.resultR ?? 0) > 0;
    if (officialWeak && (edgeWin || v25Win)) {
      let score = 20;
      if (edgeWin) score += (edge?.resultR ?? 0) * 5;
      if (v25Win) score += (v25?.resultR ?? 0) * 3;
      upsertTop(
        ha003,
        {
          score,
          example: buildRecord(
            t,
            "HA-003",
            "variant_research_better_than_official",
            `Official outcome=${outcome}; edge/25 sim shows stronger fill (${edgeWin ? "edge win" : ""}${v25Win ? " 25 win" : ""}).`,
            "Demonstrates research-only variant uplift — does not change official entry family.",
            "Future: remain research-candidate until E5.24 multi-bundle robustness; no edge/25 approval.",
          ),
        },
        maxPerCase,
      );
    }

    if (isPdConflictTrade(t)) {
      const score = outcome === "win" ? 30 + (t.resultR > 0 ? t.resultR * 5 : 0) : 20 + Math.abs(t.resultR);
      const bucket = outcome === "win" ? ha004Win : ha004Loss;
      upsertTop(
        bucket,
        {
          score,
          example: buildRecord(
            t,
            "HA-004",
            outcome === "win" ? "pd_conflict_winner" : "pd_conflict_loser",
            `PD conflict (${blocker}) with official outcome ${outcome} (${t.resultR}R).`,
            outcome === "win"
              ? "CE fill with PD conflict still produced win — hard reject PD would drop positive R in SET001."
              : "PD conflict with loss — supports caution but not score-only reject.",
            "Future: recalibrate PD severity / rescue rejects — not hard gate from one bundle.",
          ),
        },
        maxPerCase,
      );
    }

    if (hasDisciplinePressure(t)) {
      let score = 15;
      if (t.disciplineOvertradingRisk === true) score += 10;
      if (t.disciplineRevengeTradeRisk === true) score += 8;
      if (outcome === "win") score += t.resultR * 3;
      if (outcome === "loss") score += 5;
      const bucket = outcome === "win" ? ha005Win : ha005Loss;
      upsertTop(
        bucket,
        {
          score,
          example: buildRecord(
            t,
            "HA-005",
            outcome === "win" ? "discipline_pressure_winner" : "discipline_pressure_loser",
            "Discipline/overtrading/revenge flags present — diagnostic context, not gate.",
            "SET001 shows discipline labels may not degrade R; still operational no-trade context.",
            "Future: optional frequency reduction after forward account state — not ST gate today.",
          ),
        },
        maxPerCase,
      );
    }

    if (isTargetMissingTrade(t)) {
      let score = 10;
      if (outcome === "win") score += 20 + t.resultR * 2;
      if (outcome === "loss") score += 15;
      const bucket = outcome === "win" ? ha006Win : ha006Loss;
      upsertTop(
        bucket,
        {
          score,
          example: buildRecord(
            t,
            "HA-006",
            outcome === "win" ? "target_missing_winner" : "target_missing_loser",
            "Target missing/weak grade — RR2 TP may exist without defended liquidity objective.",
            "Target quality is diagnostic; does not clearly rank outcome in SET001.",
            "Future: downgrade or wait when target policy calibrated — not hard reject now.",
          ),
        },
        maxPerCase,
      );
    }

    const lateProxy =
      t.entryFilledLate === true ||
      (outcome === "expired_unfilled" && (t.missedEntryByPoints ?? 0) > 0) ||
      (t.entryFillStatus ?? "").toLowerCase().includes("late");
    if (lateProxy) {
      let score = 12;
      if (t.entryFilledLate === true) score += 20;
      if (outcome === "expired_unfilled") score += 8;
      upsertTop(
        ha007,
        {
          score,
          example: buildRecord(
            t,
            "HA-007",
            fieldAvailability.entry_filled_late ? "no_chase_late_entry" : "no_chase_proxy",
            fieldAvailability.entry_filled_late
              ? "entry_filled_late or late fill proxy detected."
              : "Proxy only: expired_unfilled / missed distance — missing explicit chase measurement.",
            "Movement may be valid but entry timing poor — no chase policy.",
            "Future: skip late/chase trades when no_chase_distance export exists.",
          ),
        },
        maxPerCase,
      );
    }

    if (t.ifvgConflictWithTradeDirection === true) {
      let score = outcome === "loss" ? 40 + Math.abs(t.resultR) * 5 : 25;
      if (outcome === "win") score += 50;
      const bucket = outcome === "win" ? ha009Win : ha009Loss;
      upsertTop(
        bucket,
        {
          score,
          example: buildRecord(
            t,
            "HA-009",
            outcome === "win" ? "ifvg_conflict_rare_winner" : "ifvg_conflict_loser",
            `IFVG conflict=true, outcome=${outcome}, result_r=${t.resultR}.`,
            outcome === "win"
              ? "Rare IFVG-conflict winner — gate would remove exceptional cases."
              : "IFVG conflict segment strongly negative in SET001 (-417R aggregate).",
            "Future: downgrade/skip IFVG-conflict after multi-bundle confirmation — not gate today.",
          ),
        },
        maxPerCase,
      );
    }

    if (decision === "wait") {
      let score = outcome === "win" ? 25 + t.resultR * 5 : 15;
      const bucket = outcome === "win" ? ha010Win : ha010Loss;
      upsertTop(
        bucket,
        {
          score,
          example: buildRecord(
            t,
            "HA-010",
            outcome === "win" ? "wait_winner" : "wait_loser",
            `setup_readiness_decision=wait, outcome=${outcome}.`,
            "Wait = incomplete context, not reject; SET001 wait segment is strong overall.",
            "Future: wait→candidate review possible — not auto-entry or gate from one bundle.",
          ),
        },
        maxPerCase,
      );
    }

    const pushCal = (key: string, score: number, rec: HumanizedCasebookExampleRecord) => {
      upsertTop(cal[key]!, { score, example: rec }, maxPerCase);
    };

    if (decision === "candidate" && outcome === "win") {
      pushCal(
        "candidate_winner",
        20 + t.resultR,
        buildRecord(t, "CAL", "candidate_winner", "candidate + win", "Strong readiness candidate with win.", "Calibration reference card — no gate."),
      );
    }
    if (decision === "candidate" && outcome === "loss") {
      pushCal(
        "candidate_loser",
        20,
        buildRecord(t, "CAL", "candidate_loser", "candidate + loss", "Candidate does not guarantee outcome.", "Calibration reference card — no gate."),
      );
    }
    if (decision === "reject" && outcome === "win") {
      pushCal(
        "reject_winner",
        25 + t.resultR,
        buildRecord(t, "CAL", "reject_winner", "reject + win", "Reject bucket still contains winners.", "Calibration reference — blocker review, no gate."),
      );
    }
    if (decision === "reject" && outcome === "loss") {
      pushCal(
        "reject_loser",
        15,
        buildRecord(t, "CAL", "reject_loser", "reject + loss", "Typical reject outcome.", "Calibration reference card — no gate."),
      );
    }
    if (
      isHighSetupReadinessScore(t.setupReadinessScore) &&
      decision === "reject" &&
      outcome === "win"
    ) {
      pushCal(
        "high_score_reject_winner",
        30 + (t.setupReadinessScore ?? 0),
        buildRecord(
          t,
          "CAL",
          "high_score_reject_winner",
          `score>=${SETUP_READINESS_HIGH_SCORE_MIN}, reject, win`,
          "High score reject win — score-only acceptance invalid.",
          "Calibration reference — high-score reject context, no gate.",
        ),
      );
    }
    if (
      isHighSetupReadinessScore(t.setupReadinessScore) &&
      decision === "reject" &&
      outcome === "loss"
    ) {
      pushCal(
        "high_score_reject_loser",
        25,
        buildRecord(
          t,
          "CAL",
          "high_score_reject_loser",
          `score>=${SETUP_READINESS_HIGH_SCORE_MIN}, reject, loss`,
          "High score reject loss — aligns with blocker override.",
          "Calibration reference — critical blocker policy, no gate.",
        ),
      );
    }
    if (blocker === "structure_conflict" && outcome === "win") {
      pushCal(
        "structure_conflict_winner",
        22,
        buildRecord(t, "CAL", "structure_conflict_winner", "structure_conflict + win", "Mixed blocker segment.", "Calibration reference card — no gate."),
      );
    }
    if (blocker === "structure_conflict" && outcome === "loss") {
      pushCal(
        "structure_conflict_loser",
        18,
        buildRecord(t, "CAL", "structure_conflict_loser", "structure_conflict + loss", "Mixed blocker segment.", "Calibration reference card — no gate."),
      );
    }
    if (blocker === "execution_environment_weak" && outcome === "win") {
      pushCal(
        "execution_environment_weak_winner",
        24,
        buildRecord(
          t,
          "CAL",
          "execution_environment_weak_winner",
          "execution_environment_weak + win",
          "Environment weak positive in SET001 — not reliable reject.",
          "Calibration reference — stress label only, no gate.",
        ),
      );
    }
    if (blocker === "execution_environment_weak" && outcome === "loss") {
      pushCal(
        "execution_environment_weak_loser",
        16,
        buildRecord(
          t,
          "CAL",
          "execution_environment_weak_loser",
          "execution_environment_weak + loss",
          "Environment weak loss example.",
          "Calibration reference — diagnostic only, no gate.",
        ),
      );
    }
    if (isIfvgWeakTrade(t) && outcome === "loss") {
      pushCal(
        "ifvg_weak_loser",
        28,
        buildRecord(t, "CAL", "ifvg_weak_loser", "IFVG Weak grade + loss", "IFVG Weak very negative in SET001.", "Calibration reference card — no gate."),
      );
    }
    const ifvgGrade = normGrade(t.ifvgBisiSibiGrade ?? t.checklistIfvgGrade);
    if ((ifvgGrade === "A" || ifvgGrade === "B") && outcome === "win" && t.ifvgConflictWithTradeDirection !== true) {
      pushCal(
        "ifvg_ab_winner",
        20 + t.resultR,
        buildRecord(t, "CAL", "ifvg_ab_winner", "IFVG A/B + win, no conflict", "Positive IFVG alignment segment.", "Calibration research context — no gate."),
      );
    }
  }

  const byCase: Record<string, HumanizedCasebookExampleRecord[]> = {
    "HA-001": finalizeBucket(ha001),
    "HA-002": finalizeBucket(ha002),
    "HA-003": finalizeBucket(ha003),
    "HA-004": [...finalizeBucket(ha004Win), ...finalizeBucket(ha004Loss)],
    "HA-005": [...finalizeBucket(ha005Win), ...finalizeBucket(ha005Loss)],
    "HA-006": [...finalizeBucket(ha006Win), ...finalizeBucket(ha006Loss)],
    "HA-007": finalizeBucket(ha007),
    "HA-008": [],
    "HA-009": [...finalizeBucket(ha009Loss), ...finalizeBucket(ha009Win)],
    "HA-010": [...finalizeBucket(ha010Win), ...finalizeBucket(ha010Loss)],
  };

  if (byCase["HA-001"]!.length === 0) {
    warnings.push("HA-001: no near_miss / missed_shallow_retrace examples found in bundle.");
  }
  if (byCase["HA-003"]!.length === 0) {
    warnings.push("HA-003: no official-weak + variant-win pairs found (EVOS columns may be disabled).");
  }
  if (byCase["HA-007"]!.length === 0) {
    warnings.push("HA-007: no late-entry/chase proxy examples; missing_measurement for explicit chase fields.");
  }

  missingCases.push("HA-008");
  if (!fieldAvailability.news_event_fields) {
    warnings.push(
      "HA-008: unavailable — export has no economic calendar / news event fields (do not infer from session).",
    );
  }

  const byCalibration: Record<string, HumanizedCasebookExampleRecord[]> = {};
  for (const [k, v] of Object.entries(cal)) {
    byCalibration[k] = finalizeBucket(v);
  }

  return { byCase, byCalibration, missingCases, warnings };
}

export function analyzeTestEaHumanizedCasebookExamplesFromTexts(
  input: TestEaHumanizedCasebookExampleSelectorBundleTextInput,
  options?: { maxExamplesPerCase?: number },
): TestEaHumanizedCasebookExampleSelectorResult {
  const maxExamplesPerCase = options?.maxExamplesPerCase ?? 5;
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
    "humanized-casebook-example-selector",
  );
  const imported = importBacktestTradesFromCsv(input.tradesCsvText, importOptions);
  if (!imported.ok) errors.push(...imported.errors.map((e) => e.message));
  warnings.push(...imported.warnings.map((w) => w.message));

  const trades = imported.trades;
  if (trades.length === 0) errors.push("no trades imported");

  const field_availability = detectFieldAvailability(trades, input.tradesCsvText);
  const selected = selectExamples(trades, maxExamplesPerCase, field_availability);
  warnings.push(...selected.warnings);

  const symbol = readSummaryString(summary, "symbol") ?? trades[0]?.canonicalSymbol ?? "unknown";
  const timeframe =
    readSummaryString(summary, "execution_timeframe") ??
    readSummaryString(summary, "timeframe") ??
    "unknown";

  return {
    ok: errors.length === 0,
    schema_version: HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_SCHEMA,
    bundle: input.bundleName,
    ea_build: readSummaryString(summary, "ea_build") ?? "unknown",
    symbol,
    timeframe,
    trade_count: trades.length,
    examples_by_case: selected.byCase,
    examples_by_calibration_category: selected.byCalibration,
    missing_cases: selected.missingCases,
    field_availability,
    warnings,
    errors,
    research_only_note: RESEARCH_NOTE,
  };
}

export function flattenHumanizedCasebookExampleCsvRows(
  result: TestEaHumanizedCasebookExampleSelectorResult,
): HumanizedCasebookExampleCsvRow[] {
  const rows: HumanizedCasebookExampleCsvRow[] = [];
  const push = (ex: HumanizedCasebookExampleRecord) => {
    rows.push({
      case_id: ex.case_id,
      category: ex.category,
      trade_id: ex.trade_id,
      outcome: ex.outcome,
      result_r: ex.result_r,
      decision: ex.setup_readiness_decision,
      score: ex.setup_readiness_score,
      grade: ex.setup_readiness_grade,
      primary_blocker: ex.setup_readiness_primary_blocker,
      ifvg_grade: ex.ifvg_grade,
      target_grade: ex.target_grade,
      environment_grade: ex.environment_grade,
      discipline_grade: ex.discipline_grade,
      session: ex.session,
      volatility: ex.volatility_bucket,
      entry_status: ex.entry_fill_status,
      reason_selected: ex.reason_selected,
      interpretation: ex.current_interpretation,
      future_humanized_action: ex.future_humanized_action,
      governance_note: ex.governance_note,
    });
  };

  for (const list of Object.values(result.examples_by_case)) {
    for (const ex of list) push(ex);
  }
  for (const list of Object.values(result.examples_by_calibration_category)) {
    for (const ex of list) push(ex);
  }
  return rows;
}
