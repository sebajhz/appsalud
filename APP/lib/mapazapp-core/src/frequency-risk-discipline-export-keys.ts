/**
 * E5.17 — Frequency / Risk / Overtrading Discipline export key catalog (TestEA).
 */

export const FREQUENCY_RISK_DISCIPLINE_TRADE_COLUMNS = [
  "frequency_risk_discipline_enabled",
  "discipline_trade_date",
  "discipline_session_bucket",
  "discipline_trades_so_far_today",
  "discipline_trades_so_far_session",
  "discipline_closed_r_so_far_today",
  "discipline_consecutive_losses_before_trade",
  "discipline_consecutive_wins_before_trade",
  "discipline_bars_since_last_trade",
  "discipline_bars_since_last_loss",
  "discipline_daily_trade_limit_reached",
  "discipline_session_trade_limit_reached",
  "discipline_max_consecutive_losses_reached",
  "discipline_daily_loss_limit_reached",
  "discipline_daily_profit_protect_reached",
  "discipline_cooldown_after_loss_active",
  "discipline_cooldown_after_trade_active",
  "discipline_overtrading_risk",
  "discipline_revenge_trade_risk",
  "discipline_profit_giveback_risk",
  "discipline_trade_result_r",
  "discipline_closed_r_after_trade_today",
  "discipline_consecutive_losses_after_trade",
  "discipline_consecutive_wins_after_trade",
  "discipline_daily_trade_sequence",
  "discipline_session_trade_sequence",
  "discipline_score",
  "discipline_grade",
  "discipline_reasons",
] as const;

export const FREQUENCY_RISK_DISCIPLINE_SUMMARY_NUMERIC_KEYS = [
  "discipline_total_trade_days_count",
  "discipline_max_trades_in_day",
  "discipline_average_trades_per_day",
  "discipline_days_over_trade_limit_count",
  "discipline_sessions_over_trade_limit_count",
  "discipline_trades_over_daily_limit_count",
  "discipline_trades_over_session_limit_count",
  "discipline_loss_streak_warning_count",
  "discipline_daily_loss_limit_warning_count",
  "discipline_profit_protect_warning_count",
  "discipline_cooldown_after_loss_count",
  "discipline_cooldown_after_trade_count",
  "discipline_overtrading_risk_count",
  "discipline_revenge_trade_risk_count",
  "discipline_profit_giveback_risk_count",
  "discipline_total_result_r",
  "discipline_average_daily_r",
  "discipline_best_daily_r",
  "discipline_worst_daily_r",
  "discipline_max_consecutive_losses_observed",
  "discipline_max_consecutive_wins_observed",
  "average_discipline_score",
  "discipline_grade_a_count",
  "discipline_grade_b_count",
  "discipline_grade_c_count",
  "discipline_grade_weak_count",
  "discipline_grade_none_count",
] as const;

export const FREQUENCY_RISK_DISCIPLINE_OPTIMIZATION_PARAMETER_KEYS = [
  "frequency_risk_discipline_v1_enabled",
  "discipline_max_trades_per_day",
  "discipline_max_trades_per_session",
  "discipline_max_consecutive_losses",
  "discipline_max_daily_loss_r",
  "discipline_daily_profit_protect_r",
  "discipline_cooldown_bars_after_loss",
  "discipline_cooldown_bars_after_trade",
  "discipline_score_enabled",
] as const;

export function buildFrequencyRiskDisciplineSummaryPlaceholders(): Record<
  string,
  number | boolean | string
> {
  const out: Record<string, number | boolean | string> = {
    has_frequency_risk_discipline_v1_logic: true,
    frequency_risk_discipline_enabled: true,
  };
  for (const k of FREQUENCY_RISK_DISCIPLINE_SUMMARY_NUMERIC_KEYS) {
    out[k] = 0;
  }
  return out;
}
