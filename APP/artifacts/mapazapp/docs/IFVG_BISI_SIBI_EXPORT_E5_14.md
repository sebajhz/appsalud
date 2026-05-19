# IFVG / BISI / SIBI Classification Export — E5.14

**Build:** `MZP_TestEA_E5_14`  
**Status:** Diagnostic-only export (CSV per trade + summary counters). No official entry change. No gates. No live trading.

## Why E5.14 exists

Before approving any entry family, Mapazapp needs **imbalance quality classification** on each setup/trade context. E5.13.6.13 documented entry-candidate policy as **research-only**; the next research gap is distinguishing:

- Clean **BISI** / **SIBI** displacement imbalances
- Mitigation depth (untouched → filled)
- Confirmed **IFVG** inversion (close beyond opposite FVG boundary)
- Post-inversion retest behavior

This milestone adds **observation fields only** — it does **not** change trade generation, official 50%/CE entry, or official outcomes.

## Definitions (V1)

### BISI (bullish imbalance)

Uses the **existing** `DetectIfvgSetupV1` FVG geometry (A=shift 3, B=2, C=1; bullish when `C.low > A.high`).

- `fvg_class = "BISI"`
- `fvg_direction = "bullish"`

### SIBI (bearish imbalance)

Same detector; bearish when `C.high < A.low`.

- `fvg_class = "SIBI"`
- `fvg_direction = "bearish"`

### Mitigation states

Tracked on closed candles after FVG creation, before/at entry export:

| State | Meaning |
|-------|---------|
| `untouched` | Price has not entered the FVG |
| `touched` | Wick/close entered zone |
| `partial_mitigation` | Depth &lt; CE |
| `ce_mitigation` | CE touched |
| `full_mitigation` | Full zone traversed |
| `filled` | Zone fully filled |

Fields: `fvg_mitigation_state`, `fvg_mitigation_depth_pct`, `fvg_ce_touched`, `fvg_fully_filled`, `fvg_wick_only_fill`.

### IFVG inversion (conservative V1)

Close-confirmed only when `InpIfvgRequireCloseInversion = true` (default):

- **BISI:** closed candle **closes below** `fvg_lower_price`
- **SIBI:** closed candle **closes above** `fvg_upper_price`

Wick-only breaks are tracked separately (`ifvg_inversion_wick_only`) — **not** treated as confirmed inversion.

### Inversion retest

When inversion is confirmed and `InpIfvgTrackRetest = true`, tracks whether price later retests the inverted zone (`ifvg_retest_detected`, bars/depth).

## Inputs

| Input | Default |
|-------|---------|
| `InpEnableIfvgBisiSibiV1` | `true` |
| `InpIfvgBisiSibiMaxBars` | `200` |
| `InpIfvgRequireCloseInversion` | `true` |
| `InpIfvgTrackRetest` | `true` |
| `InpIfvgScoreEnabled` | `true` |

Mirrored in `optimization_parameters`: `ifvg_bisi_sibi_v1_enabled`, `ifvg_bisi_sibi_max_bars`, `ifvg_require_close_inversion`, `ifvg_track_retest`, `ifvg_score_enabled`.

## CSV fields (per trade)

Inserted after `premium_discount_reasons`, before entry-fill feasibility block:

`ifvg_bisi_sibi_enabled`, `fvg_class`, `fvg_direction`, `fvg_upper_price`, `fvg_lower_price`, `fvg_ce_price`, `fvg_size_points`, `fvg_age_bars_at_entry`, `fvg_mitigation_state`, `fvg_mitigation_depth_pct`, `fvg_ce_touched`, `fvg_fully_filled`, `fvg_wick_only_fill`, `ifvg_inversion_detected`, `ifvg_inversion_confirmed_close`, `ifvg_inversion_wick_only`, `ifvg_inversion_bars_after_fvg`, `ifvg_inversion_close_price`, `ifvg_retest_detected`, `ifvg_retest_bars_after_inversion`, `ifvg_retest_depth_pct`, `ifvg_valid_for_trade_direction`, `ifvg_conflict_with_trade_direction`, `ifvg_bisi_sibi_score`, `ifvg_bisi_sibi_grade`, `ifvg_bisi_sibi_reasons`.

## Summary fields

- Flags: `has_ifvg_bisi_sibi_v1_logic`, `ifvg_bisi_sibi_enabled`
- Class/mitigation/inversion/retest counters + `average_ifvg_bisi_sibi_score`
- Grade counters: `ifvg_bisi_sibi_grade_a|b|c|weak|none_count`

## Score / grade (0–15, diagnostic only)

| Grade | Typical score |
|-------|----------------|
| A | 13–15 |
| B | 10–12 |
| C | 7–9 |
| Weak | 4–6 |
| None | 0–3 |

Rewards: clean BISI/SIBI, direction alignment, reasonable size, CE-compatible mitigation, confirmed IFVG when it supports trade direction, retest when applicable.

Penalties: unknown class, fully filled before entry, wick-only inversion, direction conflict, stale FVG, invalid size, missing expected retest.

### Reason codes (pipe-delimited)

Examples: `fvg_class_bisi`, `fvg_class_sibi`, `fvg_clean`, `fvg_touched`, `fvg_ce_touched`, `fvg_fully_filled`, `ifvg_inversion_confirmed`, `ifvg_inversion_wick_only`, `ifvg_retest_detected`, `ifvg_no_retest`, `ifvg_aligned_with_trade`, `ifvg_conflict_with_trade`, `ifvg_stale`, `ifvg_score_a` … `ifvg_score_weak`, `ifvg_bisi_sibi_disabled`.

## Events (optional compact suffix)

On `setup_allowed` preview: compact `fvg_class` / `ifvg_inv` / `ifvg_score` via `MapzIfvgCompactSuffix` (no campaign counter inflation).

## Diagnostic only — not approved

- Does **not** change official trade generation, **50%/CE** entry, or official outcome logic.
- Does **not** approve edge, 25%, or adaptive entry.
- Does **not** add gates, `OrderSend`, `CTrade`, `PositionOpen`, or `WebRequest`.
- Bundles **without** `has_ifvg_bisi_sibi_v1_logic` remain valid (TypeScript validation is opt-in).

## Operator smoke (E5.14.1)

- **Status:** **PASS** (operator benchmark) — [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` · `trade_count` 1697 · `has_ifvg_bisi_sibi_v1_logic` true
- **E5.15.1 (smoke):** [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md) — PASS

## References

- [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
- [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
