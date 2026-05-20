# Frequency / Risk / Overtrading Discipline — Evidencia smoke E5.17.1 (operador)

## Alcance

- **Checkpoint:** E5.17.1 — humo técnico post-implementación **E5.17** + fix **E5.17.0.1** (score acotado 0–15).
- **Implementación repo (referencia):** `d82210a` — `feat(mapazapp): E5.17 export frequency risk discipline context`; `a17c246` — `fix(mapazapp): E5.17.0.1 bound discipline score`.
- **Build TestEA:** `MZP_TestEA_E5_17_0_1`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md`](./FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md).
- **Política optimización:** [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **smoke técnico** del export Frequency / Risk / Overtrading Discipline V1 tras **E5.17.0.1**. **No** cambia TP oficial (RR2 fijo), entry **50 % / CE**, ni outcomes; **no** aprueba edge ni variantes; **no** autoriza live trading, gates ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| MetaEditor exit code (shell) | `1` (no bloqueante si el log de compilación es limpio) |
| Resultado compile log | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_17_0_1.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_17_0_1` |

---

## Validación de bundle

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `status` | `warning` (solo `BUNDLE_EVENTS_LARGE`) |
| `errors` | `[]` |
| `ea_build` | `MZP_TestEA_E5_17_0_1` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_frequency_risk_discipline_v1_logic` | `true` |
| `frequency_risk_discipline_enabled` | `true` |

---

## Verificación de score (E5.17.0.1)

| Comprobación | Valor | OK |
|--------------|-------|-----|
| `average_discipline_score` | **10.533883** | Sí (≤ 15) |
| Average_Score_OK (operador) | `true` | Sí |
| MaxTradeDisciplineScore (máx. por fila) | **15** | Sí (≤ 15) |
| MaxRowScoreOK (operador) | `true` | Sí |

**Comparación pre/post fix:**

| Métrica | E5.17 (smoke previo, bug) | E5.17.0.1 (este smoke) |
|---------|---------------------------|-------------------------|
| `average_discipline_score` | ~21.067767 | **10.533883** |
| Causa | Doble acumulación en `g_disc_sum_score` | Corregido — ver E5.17.0.1 |

El contrato diagnóstico **0–15** queda respetado en summary y en el máximo por trade verificado manualmente (índice de columna `discipline_score`).

---

## Summary — Frequency / risk / discipline

| Métrica (summary JSON) | Valor |
|------------------------|------:|
| `discipline_total_trade_days_count` | 342 |
| `discipline_max_trades_in_day` | 11 |
| `discipline_average_trades_per_day` | 3.959064 |
| `discipline_days_over_trade_limit_count` | 197 |
| `discipline_sessions_over_trade_limit_count` | 65 |
| `discipline_trades_over_daily_limit_count` | 630 |
| `discipline_trades_over_session_limit_count` | 88 |
| `discipline_loss_streak_warning_count` | 199 |
| `discipline_daily_loss_limit_warning_count` | 134 |
| `discipline_profit_protect_warning_count` | 220 |
| `discipline_cooldown_after_loss_count` | 96 |
| `discipline_cooldown_after_trade_count` | 0 |
| `discipline_overtrading_risk_count` | 1109 |
| `discipline_revenge_trade_risk_count` | 269 |
| `discipline_profit_giveback_risk_count` | 36 |
| `discipline_total_result_r` | 315.000000 |
| `discipline_average_daily_r` | 0.921053 |
| `discipline_best_daily_r` | 10.000000 |
| `discipline_worst_daily_r` | -4.000000 |
| `discipline_max_consecutive_losses_observed` | 5 |
| `discipline_max_consecutive_wins_observed` | 5 |
| `average_discipline_score` | 10.533883 |
| `discipline_grade_a_count` | 804 |
| `discipline_grade_b_count` | 302 |
| `discipline_grade_c_count` | 341 |
| `discipline_grade_weak_count` | 128 |
| `discipline_grade_none_count` | 122 |

**Suma grades:** 804 + 302 + 341 + 128 + 122 = **1697** (= `trade_count`).

---

## Interpretación (research / diagnóstico)

| Tema | Lectura |
|------|---------|
| **Smoke técnico** | **PASS** tras E5.17.0.1: export válido a escala de campaña; flags y contadores poblados. |
| **Score bounds** | Contrato 0–15 cumplido; el bug de media ~21 queda cerrado. |
| **Overtrading** | Presión material: 197 días sobre límite diario configurado; 630 trades sobre límite diario; **1109** flags `discipline_overtrading_risk`. |
| **Revenge context** | **269** flags `discipline_revenge_trade_risk` — contexto relevante para checklist futuro. |
| **Daily R** | Peor día **-4 R** (cruza conceptualmente umbral diario `InpDisciplineMaxDailyLossR` = -2); mejor día **+10 R** — profit-protect (**220** flags) tiene sentido operativo. |
| **Cooldown** | 96 post-pérdida; 0 post-trade genérico (input `InpDisciplineCooldownBarsAfterTrade` = 0). |
| **Uso futuro** | Módulo útil para **Setup Readiness Checklist (E5.18)** y scoring de campaña ([`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md)). |
| **No hacer** | No bloquear trades; no gates; no live; no aprobar edge; no cambiar entry/TP. |

---

## Caveat — CSV header duplicado (`fvg_ce_price`) — cerrado E5.17.1.1

**Observado en operador (este smoke, build `MZP_TestEA_E5_17_0_1`):** `Import-Csv` (PowerShell) fallaba por columna **`fvg_ce_price` duplicada** en el header.

| Aspecto | Estado (smoke E5.17.1) | E5.17.1.1 verificado |
|---------|------------------------|----------------------|
| `mapazapp:testea-export-validate` | **PASS** | **PASS** (`MZP_TestEA_E5_17_1_1`, bundle SET001) |
| Verificación manual `discipline_score` | **PASS** | **PASS** |
| Herramientas CSV estándar (PowerShell) | **FAIL** | **PASS** — ver [`CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md`](./CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md) |

**No invalida E5.17.1** como smoke de export MQL5. Evidencia E5.17.1 **sigue válida** con compatibilidad CSV confirmada en bundle real.

---

## Decisión

| Regla | Valor |
|-------|-------|
| E5.17.1 smoke técnico | **PASS** |
| Score bounds E5.17.0.1 | **Verificado** |
| Cambio entry / TP / outcomes | **No** |
| Gates / live / edge | **No** |
| Umbrales discipline MQL5 | **Sin cambio** (solo diagnóstico) |
| CSV duplicate header | **Verificado** — [`CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md`](./CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md) |

---

## Siguiente recomendado

1. ~~**E5.17.1.1**~~ — cleanup + verificación bundle real (`Import-Csv` OK).
2. ~~**E5.18** smoke operador~~ **Done** — [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md).
3. ~~**E5.18.2** Setup Readiness Decision Calibration Audit.~~ **Repo done** — [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md). **Siguiente:** E5.18.3 evidencia operador.
