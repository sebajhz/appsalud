# Buffered EVOS Export — E5.13.6.11

**Build:** `MZP_TestEA_E5_13_6_11`  
**Status:** Diagnostic-only MQL5 export rollups (summary JSON). No official entry change. No gates. No live trading.

## Why Buffered EVOS exists

E5.13.6.8–6.9 showed that **edge** can dominate unbuffered EVOS R on XAUUSD while remaining **execution-sensitive**: many edge wins fail a conservative minimum effective RR under adverse fill buffers (30–50 points). E5.13.6.10 decided that the TypeScript proxy audit is useful for triage but **not sufficient** for entry-model decisions. Exact buffered simulation must run in the same MQL5 EVOS path that produces variant geometry and bar-by-bar outcomes.

## Conservative buffer semantics

1. **Fill detection** uses the **unbuffered** variant entry price (same touch rules as EVOS).
2. **After** base variant fill, apply adverse buffer to simulated entry only:
   - **BUY:** `buffered_entry = base_entry + buffer_points × _Point`
   - **SELL:** `buffered_entry = base_entry - buffer_points × _Point`
3. **SL/TP** remain base variant SL/TP (not moved).
4. **Risk/reward** recomputed from buffered entry; `effective_rr = reward_points / risk_points`.
5. **Fragile** when `effective_rr < InpBufferedEvosMinEffectiveRr` (default 1.5).
6. **invalid_risk** when risk ≤ 0 or reward ≤ 0 — not counted as win/loss.
7. **Outcome** uses existing EVOS closed-candle bar-by-bar resolution (same-bar TP/SL ambiguity → `ambiguous`, `result_r = 0`).
8. **Win** `result_r = reward_points / risk_points`; **loss** `result_r = -1`; not filled / unresolved / invalid → `0 R`.

Buffer must **never** improve fillability (only worsens entry after fill).

## Variants and buffers

| Variants (summary prefix) | Buffers (summary label) |
|---------------------------|-------------------------|
| `edge`, `p25`, `p50`, `adaptive` | `b0`, `b5`, `b10`, `b20`, `b30`, `b50` |

**75%** is not included in this milestone. **Official entry** remains **50% / CE**. **p50** at **b0** should align with unbuffered EVOS / strict official control when fills match.

## Summary fields

- Flags: `has_buffered_evos_v1_logic`, `buffered_evos_enabled`
- Per variant × buffer rollups: `filled_count`, `win_count`, `loss_count`, `ambiguous_count`, `unresolved_count`, `not_filled_count`, `invalid_risk_count`, `fragile_count`, `total_r`, `expectancy_r`, `winrate`, `average_effective_rr`, `average_risk_points`, `average_reward_points`, `fast_fill_close_count`
- Edge-only: `wins_failing_min_effective_rr_count`, `edge_wins_fragile_count`
- Aggregates: `buffered_evos_best_variant_by_expectancy_b0|b30|b50`

`fast_fill_close_count`: `bars_to_fill ≤ 1` **and** `bars_to_close ≤ 1`.

`optimization_parameters` mirrors inputs: `buffered_evos_v1_enabled`, buffer A–F points, `buffered_evos_min_effective_rr`, `buffered_evos_score_enabled`.

## Diagnostic only — not approved

- Does **not** change official trade generation, 50%/CE entry, or official outcome logic.
- Does **not** approve edge, 25%, or adaptive entry.
- Does **not** add gates or live `OrderSend` / `CTrade` / `WebRequest`.

## Operator evidence (E5.13.6.12)

Smoke evidence: [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md). Entry candidate policy (research): [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).

## References

- [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md)
- [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
- [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
