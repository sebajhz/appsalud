/**
 * E5.15 — Liquidity Target Quality export key catalog (TestEA).
 */

export const LIQUIDITY_TARGET_QUALITY_TRADE_COLUMNS = [
  "liquidity_target_quality_enabled",
  "liquidity_target_direction",
  "liquidity_target_official_tp_price",
  "liquidity_target_official_tp_distance_points",
  "liquidity_target_nearest_price",
  "liquidity_target_nearest_type",
  "liquidity_target_nearest_distance_points",
  "liquidity_target_reached_by_official_tp",
  "liquidity_target_tp_before_nearest_liquidity",
  "liquidity_target_tp_beyond_nearest_liquidity",
  "liquidity_target_too_far_beyond_nearest_liquidity",
  "liquidity_target_has_equal_level",
  "liquidity_target_equal_level_price",
  "liquidity_target_equal_level_distance_points",
  "liquidity_target_has_swing_target",
  "liquidity_target_swing_price",
  "liquidity_target_swing_distance_points",
  "liquidity_target_has_htf_external_target",
  "liquidity_target_htf_external_price",
  "liquidity_target_htf_external_distance_points",
  "liquidity_target_supported",
  "liquidity_target_conflict",
  "liquidity_target_score",
  "liquidity_target_grade",
  "liquidity_target_reasons",
] as const;

export const LIQUIDITY_TARGET_QUALITY_SUMMARY_NUMERIC_KEYS = [
  "liquidity_target_supported_count",
  "liquidity_target_missing_count",
  "liquidity_target_conflict_count",
  "liquidity_target_reached_by_tp_count",
  "liquidity_target_before_nearest_count",
  "liquidity_target_beyond_nearest_count",
  "liquidity_target_too_far_beyond_count",
  "liquidity_target_equal_level_count",
  "liquidity_target_swing_target_count",
  "liquidity_target_htf_external_target_count",
  "average_liquidity_target_score",
  "average_liquidity_target_official_tp_distance_points",
  "average_liquidity_target_nearest_distance_points",
  "liquidity_target_grade_a_count",
  "liquidity_target_grade_b_count",
  "liquidity_target_grade_c_count",
  "liquidity_target_grade_weak_count",
  "liquidity_target_grade_none_count",
] as const;

export const LIQUIDITY_TARGET_QUALITY_OPTIMIZATION_PARAMETER_KEYS = [
  "liquidity_target_quality_v1_enabled",
  "liquidity_target_lookback_bars",
  "liquidity_target_swing_lookback_bars",
  "liquidity_target_equal_level_tolerance_points",
  "liquidity_target_min_distance_points",
  "liquidity_target_score_enabled",
] as const;

/** Placeholder summary fields for fictional samples (diagnostic zeros). */
export function buildLiquidityTargetQualitySummaryPlaceholders(): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {
    has_liquidity_target_quality_v1_logic: true,
    liquidity_target_quality_enabled: true,
  };
  for (const k of LIQUIDITY_TARGET_QUALITY_SUMMARY_NUMERIC_KEYS) {
    out[k] = 0;
  }
  return out;
}
