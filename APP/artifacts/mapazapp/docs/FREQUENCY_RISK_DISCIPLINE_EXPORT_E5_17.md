# Frequency / Risk / Overtrading Discipline Export — E5.17

**Status:** Export-only diagnostic (TestEA). **Does not** change official entry (50 % / CE), TP (fixed RR2), outcomes, gates, or live trading.

**Build:** `MZP_TestEA_E5_17_1_1` (E5.17.1.1 — CSV header cleanup; was `MZP_TestEA_E5_17_0_1`)  
**Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)

---

## Why E5.17 exists

A professional trader does not only ask “is there a setup?” They also track **frequency**, **daily/session sequence**, **loss streaks**, **R exposure**, and **overtrading / revenge-trade context**. **E5.17** exports that context at each virtual trade — diagnostic only — without blocking or altering trade generation.

Supports future **Setup Readiness Checklist** (North Star E5.18) together with execution environment ([`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md)) and execution profile policy ([`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md)).

---

## Pre-trade vs post-trade

| Phase | Fields | Rule |
|-------|--------|------|
| **Pre-trade snapshot** | `discipline_trades_so_far_today`, `discipline_trades_so_far_session`, `discipline_closed_r_so_far_today`, consecutive wins/losses **before** trade, bars since last trade/loss, limit/cooldown **flags** | Only trades **closed before** this candidate’s entry/reference time |
| **Post-trade context** | `discipline_trade_result_r`, `discipline_closed_r_after_trade_today`, consecutive *after* trade, daily/session sequence | Updated when virtual outcome is finalized |

**No future leakage:** pre-trade counters must never include the current trade or later trades.

**V1 limitation:** session bucket uses hour-based session windows (same family as E5.16); day boundary uses server/trade date string; conservative closed-trade tracking when timing is ambiguous.

---

## Inputs (MQL5)

| Input | Default | Role |
|-------|---------|------|
| `InpEnableFrequencyRiskDisciplineV1` | true | Master switch |
| `InpDisciplineMaxTradesPerDay` | 3 | Daily frequency cap (diagnostic flag) |
| `InpDisciplineMaxTradesPerSession` | 2 | Session frequency cap |
| `InpDisciplineMaxConsecutiveLosses` | 2 | Loss-streak warning |
| `InpDisciplineMaxDailyLossR` | -2.0 | Daily loss R limit |
| `InpDisciplineDailyProfitProtectR` | 3.0 | Profit-protection context |
| `InpDisciplineCooldownBarsAfterLoss` | 4 | Bars-after-loss cooldown |
| `InpDisciplineCooldownBarsAfterTrade` | 0 | Optional bars-after-any-trade cooldown |
| `InpDisciplineScoreEnabled` | true | 0–15 score + grade |

Mirrored in `optimization_parameters` for campaign comparison.

---

## Discipline flags (diagnostic)

| Field | Meaning |
|-------|---------|
| `discipline_daily_trade_limit_reached` | Would exceed daily trade cap if taken |
| `discipline_session_trade_limit_reached` | Would exceed session cap |
| `discipline_max_consecutive_losses_reached` | Loss streak at/above threshold |
| `discipline_daily_loss_limit_reached` | Closed R at/below max daily loss |
| `discipline_daily_profit_protect_reached` | Strong day — giveback risk context |
| `discipline_cooldown_after_loss_active` | Within cooldown bars after last loss |
| `discipline_cooldown_after_trade_active` | Within cooldown after any trade |
| `discipline_overtrading_risk` | Composite high-frequency risk |
| `discipline_revenge_trade_risk` | Trade soon after loss streak |
| `discipline_profit_giveback_risk` | Trade after large daily profit |

---

## Discipline score (0–15, diagnostic)

**Not** a gate. Rewards first/early day trades, healthy session frequency, no loss streak, R not near daily loss, no cooldown. Penalizes high daily/session count, loss streak, limits reached, cooldown active, overtrading/revenge/giveback flags.

| Grade | Typical score |
|-------|----------------|
| A | ≥ 12 |
| B | ≥ 9 |
| C | ≥ 6 |
| Weak | ≥ 3 |
| None | &lt; 3 |

### Reason codes (pipe-delimited, stable)

`discipline_disabled`, `discipline_first_trade_today`, `discipline_trade_count_ok`, `discipline_trade_count_high`, `discipline_session_count_high`, `discipline_loss_streak_ok`, `discipline_loss_streak_high`, `discipline_daily_loss_limit_reached`, `discipline_profit_protect_reached`, `discipline_cooldown_loss_active`, `discipline_cooldown_trade_active`, `discipline_overtrading_risk`, `discipline_revenge_trade_risk`, `discipline_profit_giveback_risk`, `discipline_score_a` / `_b` / `_c` / `_weak`

---

## CSV trade columns (E5.17)

Catalog: `APP/lib/mapazapp-core/src/frequency-risk-discipline-export-keys.ts` — inserted after `execution_environment_reasons`, before entry fill feasibility columns in live exports.

---

## Summary JSON

- `has_frequency_risk_discipline_v1_logic`: true  
- `frequency_risk_discipline_enabled`  
- Day/session/limit/cooldown/risk counters  
- R aggregates and max consecutive win/loss observed  
- Grade distribution and `average_discipline_score`  

Bundles **without** `has_frequency_risk_discipline_v1_logic` remain valid (older exports).

---

## Events (compact)

Low-risk events may include: `disc_score`, `disc_grade`, `disc_flags` via `MapzDiscCompactSuffix` — kept minimal.

---

## Decision

| Rule | Value |
|------|-------|
| Changes official TP / entry / outcomes | **No** |
| Approved for live / gates | **No** |
| OrderSend / CTrade / live automation | **No** |
| Use as checklist / explanation | **Yes** |

---

## E5.17.0.1 — Score bound fix

**Smoke finding (E5.17 operator benchmark):** `average_discipline_score` ≈ 21.07 with per-trade contract **0–15**. Root cause: `g_disc_sum_score` was accumulated **twice** per trade (`MapzDiscFinalizeSummary` + `VirtualAppendTradeCsvRow`), inflating the summary average. Per-trade `MapzDiscScoreAndFinalize` already clamped to [0, 15].

**Fix (`MZP_TestEA_E5_17_0_1`):** single accumulation in `MapzDiscFinalizeSummary`; `MapzDiscClampScore`; grades from bounded score. Flags/counters unchanged.

**E5.17.1 smoke (operador):** [`FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md`](./FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md) — PASS técnico; `average_discipline_score` = 10.533883; max row = 15. Evidencia **sigue válida** tras E5.17.1.1.

## E5.17.1.1 — Duplicate CSV header cleanup (`fvg_ce_price`)

**Root cause:** `WriteTradesHeader` / `VirtualAppendTradeCsvRow` exportaban `fvg_ce_price` dos veces — bloque IFVG (E5.14) y bloque Entry Fill Feasibility (E5.13.2). Misma semántica `(fvg_low + fvg_high) / 2`.

**Fix (`MZP_TestEA_E5_17_1_1`):** una sola columna canónica `fvg_ce_price` (IFVG). El bloque EFF conserva `fvg_near_edge_price`, `fvg_far_edge_price`, `entry_distance_from_ce_points`, etc. Validador repo: `DUPLICATE_CSV_HEADER`.

**Compatibilidad:** PowerShell `Import-Csv`, Excel, dashboards E5.18.

---

## Operator next step

1. ~~Compile / smoke E5.17.1~~ **Done** — ver evidencia E5.17.1.  
2. ~~**E5.17.1.1** — CSV header cleanup~~ **Done** — compilar `MZP_TestEA_E5_17_1_1`; smoke ligero o `mapazapp:testea-export-validate` + `Import-Csv`.  
3. **E5.18** — Setup Readiness Checklist.

**Optimization policy:** [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md).
