/**
 * E5.16 — Session / Spread / Volatility Context export key catalog (TestEA).
 */

export const SESSION_SPREAD_VOLATILITY_TRADE_COLUMNS = [
  "session_spread_volatility_enabled",
  "session_bucket",
  "session_phase",
  "session_hour",
  "session_timezone_offset_hours",
  "is_asian_session",
  "is_london_session",
  "is_new_york_session",
  "is_london_new_york_overlap",
  "is_off_session",
  "spread_context_enabled",
  "spread_points",
  "spread_bucket",
  "spread_is_warning",
  "spread_is_high",
  "spread_is_extreme",
  "volatility_context_enabled",
  "volatility_atr_points",
  "volatility_bucket",
  "volatility_is_low",
  "volatility_is_high",
  "volatility_is_extreme",
  "volatility_range_points",
  "volatility_range_to_atr_ratio",
  "execution_environment_score",
  "execution_environment_grade",
  "execution_environment_reasons",
] as const;

export const SESSION_SPREAD_VOLATILITY_SUMMARY_NUMERIC_KEYS = [
  "session_asian_count",
  "session_london_count",
  "session_new_york_count",
  "session_overlap_count",
  "session_off_count",
  "session_unknown_count",
  "spread_normal_count",
  "spread_warning_count",
  "spread_high_count",
  "spread_extreme_count",
  "spread_unknown_count",
  "average_spread_points",
  "volatility_low_count",
  "volatility_normal_count",
  "volatility_high_count",
  "volatility_extreme_count",
  "volatility_unknown_count",
  "average_volatility_atr_points",
  "average_volatility_range_points",
  "average_volatility_range_to_atr_ratio",
  "average_execution_environment_score",
  "execution_environment_grade_a_count",
  "execution_environment_grade_b_count",
  "execution_environment_grade_c_count",
  "execution_environment_grade_weak_count",
  "execution_environment_grade_none_count",
] as const;

export const SESSION_SPREAD_VOLATILITY_OPTIMIZATION_PARAMETER_KEYS = [
  "session_spread_volatility_v1_enabled",
  "session_timezone_offset_hours",
  "session_asian_start_hour",
  "session_asian_end_hour",
  "session_london_start_hour",
  "session_london_end_hour",
  "session_new_york_start_hour",
  "session_new_york_end_hour",
  "session_overlap_start_hour",
  "session_overlap_end_hour",
  "spread_context_v1_enabled",
  "spread_warning_points",
  "spread_high_points",
  "spread_extreme_points",
  "volatility_context_v1_enabled",
  "volatility_atr_period",
  "volatility_low_atr_points",
  "volatility_high_atr_points",
  "volatility_extreme_atr_points",
  "volatility_score_enabled",
] as const;

export function buildSessionSpreadVolatilitySummaryPlaceholders(): Record<
  string,
  number | boolean | string
> {
  const out: Record<string, number | boolean | string> = {
    has_session_spread_volatility_v1_logic: true,
    session_spread_volatility_enabled: true,
  };
  for (const k of SESSION_SPREAD_VOLATILITY_SUMMARY_NUMERIC_KEYS) {
    out[k] = 0;
  }
  return out;
}
