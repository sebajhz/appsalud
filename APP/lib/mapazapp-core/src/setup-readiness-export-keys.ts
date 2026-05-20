/**
 * E5.18 — Setup Readiness Checklist V1 export key catalog (TestEA).
 */

export const SETUP_READINESS_TRADE_COLUMNS = [
  "setup_readiness_checklist_enabled",
  "checklist_bias_aligned",
  "checklist_structure_ok",
  "checklist_liquidity_event_ok",
  "checklist_ifvg_quality_ok",
  "checklist_ifvg_grade",
  "checklist_mss_choch_ok",
  "checklist_mss_choch_timing_ok",
  "checklist_premium_discount_ok",
  "checklist_pd_zone_valid",
  "checklist_entry_feasible",
  "checklist_entry_candidate_family",
  "checklist_entry_fragility_warning",
  "checklist_target_ok",
  "checklist_target_grade",
  "checklist_target_type",
  "checklist_execution_environment_ok",
  "checklist_execution_environment_grade",
  "checklist_discipline_ok",
  "checklist_discipline_grade",
  "checklist_overtrading_warning",
  "setup_readiness_score",
  "setup_readiness_grade",
  "setup_readiness_decision",
  "setup_readiness_blocker_count",
  "setup_readiness_warning_count",
  "setup_readiness_primary_blocker",
  "setup_readiness_reasons",
] as const;

export const SETUP_READINESS_SUMMARY_NUMERIC_KEYS = [
  "setup_readiness_candidate_count",
  "setup_readiness_wait_count",
  "setup_readiness_reject_count",
  "setup_readiness_unknown_count",
  "average_setup_readiness_score",
  "setup_readiness_grade_a_count",
  "setup_readiness_grade_b_count",
  "setup_readiness_grade_c_count",
  "setup_readiness_grade_weak_count",
  "setup_readiness_grade_none_count",
  "checklist_bias_block_count",
  "checklist_liquidity_missing_count",
  "checklist_ifvg_weak_count",
  "checklist_ifvg_conflict_count",
  "checklist_mss_choch_late_count",
  "checklist_pd_conflict_count",
  "checklist_entry_fragile_count",
  "checklist_target_missing_count",
  "checklist_target_before_liquidity_count",
  "checklist_environment_weak_count",
  "checklist_overtrading_warning_count",
  "setup_readiness_average_blocker_count",
  "setup_readiness_average_warning_count",
] as const;

export const SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS = [
  "setup_readiness_checklist_v1_enabled",
  "setup_readiness_score_enabled",
  "setup_readiness_min_candidate_score",
  "setup_readiness_min_wait_score",
] as const;

export const SETUP_READINESS_DECISIONS = ["candidate", "wait", "reject", "unknown"] as const;

export const SETUP_READINESS_GRADES = ["A", "B", "C", "Weak", "None"] as const;

export function buildSetupReadinessSummaryPlaceholders(): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {
    has_setup_readiness_checklist_v1_logic: true,
    setup_readiness_checklist_enabled: true,
  };
  for (const k of SETUP_READINESS_SUMMARY_NUMERIC_KEYS) {
    out[k] = 0;
  }
  return out;
}
