# Session / Spread / Volatility Context Export — E5.16

**Status:** Export-only diagnostic (TestEA). **Does not** change official entry (50 % / CE), TP (fixed RR2), outcomes, gates, or live trading.

**Build:** `MZP_TestEA_E5_16`  
**Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)

---

## Why E5.16 exists

A professional setup must be evaluated in the **execution environment** where it occurs. **E5.15** showed target geometry vs liquidity; **E5.16** adds **when** and **under what market conditions** the virtual trade was created (session, spread, volatility) — diagnostic only.

This supports future **Setup Readiness Checklist** items (North Star E5.18) together with [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md) and [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).

---

## Session classification (hour-based V1)

Uses setup / entry reference time with `InpSessionTimezoneOffsetHours`.

| `session_bucket` | Meaning |
|------------------|---------|
| `asian` | Asian window |
| `london` | London window (not overlap) |
| `new_york` | New York window (not overlap) |
| `london_new_york_overlap` | Overlap window |
| `off_session` | Outside defined windows |
| `unknown` | Missing/invalid time |

| `session_phase` | Meaning |
|-----------------|---------|
| `session_open_window` | First hour of active session block |
| `session_mid_window` | Mid session |
| `session_close_window` | Last hour before session end |
| `unknown` | No session block |

**V1 limitation:** no calendar/news handling; no DST automation beyond manual offset.

---

## Spread buckets

From `SymbolInfoInteger(SYMBOL_SPREAD)` at snap time (points):

| `spread_bucket` | Default threshold |
|-----------------|-------------------|
| `normal` | &lt; `InpSpreadWarningPoints` (30) |
| `warning` | ≥ 30 |
| `high` | ≥ 50 |
| `extreme` | ≥ 80 |
| `unknown` | Spread context disabled or unavailable |

**Strategy Tester limitation:** spread may be fixed, synthetic, or unrepresentative of live variable spread. Treat as **relative diagnostic within a campaign**, not absolute live cost proof.

---

## Volatility buckets

ATR(14) on execution timeframe, **closed bar** (shift 1). Also exports `volatility_range_points` and `volatility_range_to_atr_ratio` for current bar range vs ATR.

| `volatility_bucket` | Default threshold (points) |
|-------------------|----------------------------|
| `low` | &lt; 80 |
| `normal` | 80 – 249 |
| `high` | 250 – 399 |
| `extreme` | ≥ 400 |
| `unknown` | ATR unavailable |

---

## Execution environment score (0–15, diagnostic)

**Not** a gate. Rewards liquid sessions (London/NY/overlap), normal spread, normal/high (non-extreme) volatility, normal range/ATR ratio. Penalizes off-session, high/extreme spread, low/dead or extreme/chaotic volatility, abnormal range/ATR.

| Grade | Typical score |
|-------|----------------|
| A | ≥ 12 |
| B | ≥ 9 |
| C | ≥ 6 |
| Weak | ≥ 3 |
| None | &lt; 3 |

### Reason codes (pipe-delimited)

`session_asian`, `session_london`, `session_new_york`, `session_overlap`, `session_off`, `session_unknown`, `spread_normal`, `spread_warning`, `spread_high`, `spread_extreme`, `volatility_low`, `volatility_normal`, `volatility_high`, `volatility_extreme`, `volatility_unknown`, `range_atr_normal`, `range_atr_abnormal`, `execution_env_score_a` / `_b` / `_c` / `_weak`

---

## CSV trade columns (E5.16)

See `APP/lib/mapazapp-core/src/session-spread-volatility-export-keys.ts` — inserted after `liquidity_target_reasons`, before entry fill feasibility columns.

---

## Summary JSON

- `has_session_spread_volatility_v1_logic`: true  
- `session_spread_volatility_enabled`  
- Session / spread / volatility counters and averages  
- `optimization_parameters`: `session_spread_volatility_v1_enabled`, session hours, spread thresholds, volatility ATR settings  

Bundles **without** `has_session_spread_volatility_v1_logic` remain valid (older exports).

---

## Events (compact)

Event `details` may include: `sess=… spr=… vol=… env_score=…` via `MapzSsvCompactSuffix`.

---

## Decision

| Rule | Value |
|------|-------|
| Changes official TP / entry / outcomes | **No** |
| Approved for live / gates | **No** |
| Use as checklist / explanation | **Yes** |

---

## Evidencia operador (E5.16.1)

**Cerrado — docs:** [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md) — PASS; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; sesión/spread OK; volatilidad **extreme** dominante (~71.5 %) — **no** recalibrar umbrales en E5.16.1.

**E5.16.3 (evidencia audit):** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md) — PASS. **Siguiente:** **E5.16.4** profile policy **o** **E5.17+**.

---

## References

- Target policy: [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md)  
- Liquidity target export: [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md)  
- Realism evidence: [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md)
