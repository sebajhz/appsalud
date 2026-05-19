/**
 * E5.13.6.11 — Buffered EVOS summary rollup key catalog (TestEA export contract).
 */

export const BUFFERED_EVOS_SUMMARY_VARIANTS = ["edge", "p25", "p50", "adaptive"] as const;
export const BUFFERED_EVOS_SUMMARY_BUFFER_LABELS = ["b0", "b5", "b10", "b20", "b30", "b50"] as const;

export const BUFFERED_EVOS_SUMMARY_NUMERIC_SUFFIXES = [
  "filled_count",
  "win_count",
  "loss_count",
  "ambiguous_count",
  "unresolved_count",
  "not_filled_count",
  "invalid_risk_count",
  "fragile_count",
  "total_r",
  "expectancy_r",
  "winrate",
  "average_effective_rr",
  "average_risk_points",
  "average_reward_points",
  "fast_fill_close_count",
] as const;

export const BUFFERED_EVOS_SUMMARY_AGGREGATE_STRING_KEYS = [
  "buffered_evos_best_variant_by_expectancy_b0",
  "buffered_evos_best_variant_by_expectancy_b30",
  "buffered_evos_best_variant_by_expectancy_b50",
] as const;

export const BUFFERED_EVOS_OPTIMIZATION_PARAMETER_KEYS = [
  "buffered_evos_v1_enabled",
  "buffered_evos_buffer_a_points",
  "buffered_evos_buffer_b_points",
  "buffered_evos_buffer_c_points",
  "buffered_evos_buffer_d_points",
  "buffered_evos_buffer_e_points",
  "buffered_evos_buffer_f_points",
  "buffered_evos_min_effective_rr",
  "buffered_evos_score_enabled",
] as const;

/** Rollup keys emitted per variant × buffer (numeric). */
export function listBufferedEvosSummaryRollupKeys(): string[] {
  const keys: string[] = [];
  for (const v of BUFFERED_EVOS_SUMMARY_VARIANTS) {
    for (const b of BUFFERED_EVOS_SUMMARY_BUFFER_LABELS) {
      for (const sfx of BUFFERED_EVOS_SUMMARY_NUMERIC_SUFFIXES) {
        keys.push(`buffered_evos_${v}_${b}_${sfx}`);
      }
      if (v === "edge") {
        keys.push(`buffered_evos_${v}_${b}_wins_failing_min_effective_rr_count`);
        keys.push(`buffered_evos_${v}_${b}_edge_wins_fragile_count`);
      }
    }
  }
  return keys;
}

/** Placeholder summary fields for fictional samples (diagnostic-only zeros). */
export function buildBufferedEvosSummaryRollupPlaceholders(): Record<string, number | string | boolean> {
  const out: Record<string, number | string | boolean> = {
    has_buffered_evos_v1_logic: true,
    buffered_evos_enabled: true,
    buffered_evos_best_variant_by_expectancy_b0: "",
    buffered_evos_best_variant_by_expectancy_b30: "",
    buffered_evos_best_variant_by_expectancy_b50: "",
  };
  for (const k of listBufferedEvosSummaryRollupKeys()) {
    out[k] = 0;
  }
  return out;
}
