/**
 * E5.14 — IFVG / BISI / SIBI classification export key catalog (TestEA).
 */

export const IFVG_BISI_SIBI_TRADE_COLUMNS = [
  "ifvg_bisi_sibi_enabled",
  "fvg_class",
  "fvg_direction",
  "fvg_upper_price",
  "fvg_lower_price",
  "fvg_ce_price",
  "fvg_size_points",
  "fvg_age_bars_at_entry",
  "fvg_mitigation_state",
  "fvg_mitigation_depth_pct",
  "fvg_ce_touched",
  "fvg_fully_filled",
  "fvg_wick_only_fill",
  "ifvg_inversion_detected",
  "ifvg_inversion_confirmed_close",
  "ifvg_inversion_wick_only",
  "ifvg_inversion_bars_after_fvg",
  "ifvg_inversion_close_price",
  "ifvg_retest_detected",
  "ifvg_retest_bars_after_inversion",
  "ifvg_retest_depth_pct",
  "ifvg_valid_for_trade_direction",
  "ifvg_conflict_with_trade_direction",
  "ifvg_bisi_sibi_score",
  "ifvg_bisi_sibi_grade",
  "ifvg_bisi_sibi_reasons",
] as const;

export const IFVG_BISI_SIBI_SUMMARY_NUMERIC_KEYS = [
  "ifvg_bisi_count",
  "ifvg_sibi_count",
  "ifvg_unknown_class_count",
  "fvg_clean_count",
  "fvg_touched_count",
  "fvg_ce_touched_count",
  "fvg_fully_filled_count",
  "fvg_wick_only_fill_count",
  "ifvg_inversion_detected_count",
  "ifvg_inversion_confirmed_close_count",
  "ifvg_inversion_wick_only_count",
  "ifvg_retest_detected_count",
  "ifvg_aligned_with_trade_count",
  "ifvg_conflict_with_trade_count",
  "average_ifvg_bisi_sibi_score",
  "ifvg_bisi_sibi_grade_a_count",
  "ifvg_bisi_sibi_grade_b_count",
  "ifvg_bisi_sibi_grade_c_count",
  "ifvg_bisi_sibi_grade_weak_count",
  "ifvg_bisi_sibi_grade_none_count",
] as const;

export const IFVG_BISI_SIBI_OPTIMIZATION_PARAMETER_KEYS = [
  "ifvg_bisi_sibi_v1_enabled",
  "ifvg_bisi_sibi_max_bars",
  "ifvg_require_close_inversion",
  "ifvg_track_retest",
  "ifvg_score_enabled",
] as const;

/** Placeholder summary fields for fictional samples (diagnostic zeros). */
export function buildIfvgBisiSibiSummaryPlaceholders(): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {
    has_ifvg_bisi_sibi_v1_logic: true,
    ifvg_bisi_sibi_enabled: true,
  };
  for (const k of IFVG_BISI_SIBI_SUMMARY_NUMERIC_KEYS) {
    out[k] = 0;
  }
  return out;
}
