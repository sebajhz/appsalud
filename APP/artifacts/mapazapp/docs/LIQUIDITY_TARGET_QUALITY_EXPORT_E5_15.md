# Liquidity Target Quality Export — E5.15

**Build:** `MZP_TestEA_E5_15`  
**Status:** Diagnostic-only export (CSV per trade + summary counters). No official entry change. No gates. No live trading.

## Why E5.15 exists

A professional trade needs a **logical target**, not only a valid entry. After **E5.14** (IFVG / BISI / SIBI imbalance context), Mapazapp must observe whether the **official virtual TP** is supported by liquidity in the trade direction — without changing trade generation, official **50 % / CE** entry, or outcome logic.

This milestone is **observation-only** and feeds future **Setup Readiness Checklist** planning (read-only / manual-control).

## Target quality definition (V1)

- **Official target:** existing virtual `tp` from fixed-RR preparation — **not** modified.
- **Trade direction:** long → liquidity candidates **above** entry; short → **below** entry.
- **No future leakage:** candidates use **closed-candle-safe** history only (bar shift ≥ 1 at setup / candidate time).

## Candidate target types (V1)

| Type | Source |
|------|--------|
| `swing_high` / `swing_low` | Nearest execution-TF swing in trade direction (`MapzMscFindLatestSwing*`) |
| `equal_highs` / `equal_lows` | Two+ swings within `liquidity_target_equal_level_tolerance_points` |
| `prev_day_high` / `prev_day_low` | Previous D1 bar high/low when available |
| `htf_external_high` / `htf_external_low` | H4/H1 external liquidity from HTF structure snap |
| `unknown` | No valid candidate in direction |

## Relationship to TP

Per trade, compare official TP to the **nearest** liquidity candidate in direction:

- `liquidity_target_reached_by_official_tp` — TP reaches / approaches nearest pool
- `liquidity_target_tp_before_nearest_liquidity` — TP stops short
- `liquidity_target_tp_beyond_nearest_liquidity` — TP passes nearest
- `liquidity_target_too_far_beyond_nearest_liquidity` — TP excessively beyond nearest (diagnostic stress flag)
- `liquidity_target_supported` — candidate exists, TP reaches pool, not “too far”, no hard conflict

## Inputs

| Input | Default |
|-------|---------|
| `InpEnableLiquidityTargetQualityV1` | `true` |
| `InpLiquidityTargetLookbackBars` | `200` |
| `InpLiquidityTargetSwingLookbackBars` | `2` |
| `InpLiquidityTargetEqualLevelTolerancePoints` | `50` |
| `InpLiquidityTargetMinDistancePoints` | `20` |
| `InpLiquidityTargetScoreEnabled` | `true` |

Mirrored in `optimization_parameters`: `liquidity_target_quality_v1_enabled`, `liquidity_target_lookback_bars`, `liquidity_target_swing_lookback_bars`, `liquidity_target_equal_level_tolerance_points`, `liquidity_target_min_distance_points`, `liquidity_target_score_enabled`.

## CSV fields (per trade)

Inserted after `ifvg_bisi_sibi_reasons`, before entry-fill feasibility block:

`liquidity_target_quality_enabled`, `liquidity_target_direction`, `liquidity_target_official_tp_price`, `liquidity_target_official_tp_distance_points`, `liquidity_target_nearest_price`, `liquidity_target_nearest_type`, `liquidity_target_nearest_distance_points`, `liquidity_target_reached_by_official_tp`, `liquidity_target_tp_before_nearest_liquidity`, `liquidity_target_tp_beyond_nearest_liquidity`, `liquidity_target_too_far_beyond_nearest_liquidity`, `liquidity_target_has_equal_level`, `liquidity_target_equal_level_price`, `liquidity_target_equal_level_distance_points`, `liquidity_target_has_swing_target`, `liquidity_target_swing_price`, `liquidity_target_swing_distance_points`, `liquidity_target_has_htf_external_target`, `liquidity_target_htf_external_price`, `liquidity_target_htf_external_distance_points`, `liquidity_target_supported`, `liquidity_target_conflict`, `liquidity_target_score`, `liquidity_target_grade`, `liquidity_target_reasons`.

## Summary fields

- Flags: `has_liquidity_target_quality_v1_logic`, `liquidity_target_quality_enabled`
- Counters: supported / missing / conflict / reached-by-TP / before / beyond / too-far / equal-level / swing / HTF external
- Averages: `average_liquidity_target_score`, `average_liquidity_target_official_tp_distance_points`, `average_liquidity_target_nearest_distance_points`
- Grade counters: `liquidity_target_grade_a|b|c|weak|none_count`

## Score / grade (0–15, diagnostic only)

| Grade | Typical score |
|-------|----------------|
| A | 13–15 |
| B | 10–12 |
| C | 7–9 |
| Weak | 4–6 |
| None | 0–3 |

Rewards: candidate exists, TP reaches pool, equal/swing/HTF confluence, meaningful distance.  
Penalties: missing candidate, TP before pool, too far beyond, conflict, tiny TP distance.

### Reason codes (pipe-delimited)

Examples: `liquidity_target_disabled`, `liquidity_target_direction_buy`, `liquidity_target_direction_sell`, `liquidity_target_missing`, `liquidity_target_swing_found`, `liquidity_target_equal_level_found`, `liquidity_target_htf_external_found`, `liquidity_target_reached_by_tp`, `liquidity_target_before_nearest`, `liquidity_target_beyond_nearest`, `liquidity_target_too_far_beyond`, `liquidity_target_supported`, `liquidity_target_conflict`, `liquidity_target_distance_too_small`, `liquidity_target_score_a` … `liquidity_target_score_weak`.

## Events (compact suffix)

On setup preview / virtual details: `lq_tgt`, `lq_tgt_type`, `lq_tgt_score` via `MapzLqTgtCompactSuffix`.

## Diagnostic only — not approved

- Does **not** change official trade generation, **50 % / CE** entry, or official outcomes.
- Does **not** approve edge, 25 %, or adaptive entry.
- Does **not** add gates, `OrderSend`, `CTrade`, `PositionOpen`, or `WebRequest`.
- Bundles **without** `has_liquidity_target_quality_v1_logic` remain valid (TypeScript validation is opt-in).

## Operator smoke (E5.15.1)

- **Status:** **PASS** (operator benchmark) — [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md)
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` · `trade_count` 1697
- **E5.15.2 (repo):** target realism audit — [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md); CLI `mapazapp:testea-liquidity-target-realism-audit`
- **E5.15.3 (operator):** [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md) — PASS benchmark SET001
- **Next (decision):** **E5.15.4** target policy research **or** **E5.16** session/spread/volatility

## References

- [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md)
- [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
- [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
