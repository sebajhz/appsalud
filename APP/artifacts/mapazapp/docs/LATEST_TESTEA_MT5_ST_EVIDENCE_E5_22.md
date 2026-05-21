# Latest TestEA Compile + MT5 Strategy Tester Evidence — E5.22

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22 — Latest TestEA Compile + MT5 Strategy Tester Evidence Refresh |
| **Tipo** | Evidencia operador + documentación — **sin implementación de código** |
| **Baseline Git** | `c6c012e` o posterior — `docs(mapazapp): E5.22.0.1 align MT5 repo strategy state` |
| **Checkpoint previo** | [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md) |
| **Decisión** | **PASS técnico** — con caveats de gobernanza (sin aprobación de estrategia) |
| **Siguiente recomendado** | **E5.22.1** → **E5.22.2** |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5 adicional, Strategy Tester adicional, gates, live, entry/TP, aprobación edge/25/adaptive |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo** | `c6c012e` — `docs(mapazapp): E5.22.0.1 align MT5 repo strategy state` |
| **Alineación previa** | E5.22.0.1 — MT5/repo alineados; winrate ~44,77 % esperado |

---

## 2. Evidencia de compilación

| Campo | Valor |
|-------|-------|
| **`TESTEA_BUILD` detectado** | `MZP_TestEA_E5_18` |
| **MetaEditor exit code (shell)** | `1` |
| **Compile log** | `generating code 100%` → `code generated` → **Result: 0 errors, 0 warnings**, 11240 ms elapsed, cpu='X64 Regular' |
| **EX5 generado** | `Mapazapp_TestEA.ex5` |
| **EX5 archivado** | `Mapazapp_TestEA_MZP_TestEA_E5_18.ex5` |

### Interpretación compile

El **exit code 1 del shell de MetaEditor no es fallo** cuando el log de compilación reporta **0 errors / 0 warnings** y el **EX5 fue generado y archivado** con build coincidente `MZP_TestEA_E5_18`.

---

## 3. Corrida Strategy Tester (SET001)

La carpeta de run SET001 anterior fue **limpiada y regenerada**.

| Campo | Valor |
|-------|-------|
| **Run folder** | `C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |

### Archivos generados

| Archivo | Tamaño |
|---------|--------|
| `backtest_events.csv` | 18,385,300 bytes |
| `backtest_summary.json` | 41,238 bytes |
| `backtest_trades.csv` | 7,954,772 bytes |

---

## 4. Validación de bundle

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `status` | `warning` |
| `errors` | `[]` |
| `warnings` | `BUNDLE_EVENTS_LARGE` únicamente |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |

---

## 5. Identidad y postura de seguridad

| Campo | Valor |
|-------|-------|
| `schema_version` | `backtest_ea_v1` |
| `ea_build` | `MZP_TestEA_E5_18` |
| `run_id` | `E55__SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `campaign_id` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` |
| `parameter_set_id` | `MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001` |
| `symbol` | `XAUUSD` |
| `execution_timeframe` | `M15` |
| `daily_bias_timeframe` | `D1` |
| `backtest_mode` | `virtual` |
| `tester_only` | `true` |
| `backtest_role` | `true` |
| `has_real_trading_orders` | `false` |

---

## 6. Conteos core del motor

| Métrica | Valor |
|---------|-------|
| `trade_count` | 1697 |
| `virtual_trade_count` | 1697 |
| `total_bias_evaluated` | 349 |
| `total_setup_candidates` | 6698 |
| `allowed_setups` | 3421 |
| `rejected_by_daily_bias` | 3277 |
| `filled_trade_count` | 1355 |
| `unfilled_expired_count` | 342 |
| `expired_open_count` | 1 |

---

## 7. Outcome / rendimiento

| Métrica | Valor |
|---------|-------|
| `win_count` | 411 |
| `loss_count` | 507 |
| `ambiguous_count` | 436 |
| `expired_unfilled` | 342 |
| `expired_open` | 1 |
| `winrate` | **0.447712** (~44,77 %) |
| `expectancy_r` | **0.185622** |
| `total result R` | **315** |
| `min R` | -1 |
| `max R` | 2 |
| `max_drawdown_r` | 13 |

### Distribución de outcome

| Outcome | Count |
|---------|-------|
| loss | 507 |
| ambiguous | 436 |
| win | 411 |
| expired_unfilled | 342 |
| expired_open | 1 |

### Métricas R (rollup)

| Métrica | Valor |
|---------|-------|
| Count | 1697 |
| Total_R | 315 |
| Avg_R | 0.185622 |
| Min_R | -1 |
| Max_R | 2 |

---

## 8. Readiness / blockers

| Métrica | Valor |
|---------|-------|
| `setup_readiness_candidate_count` | 247 |
| `setup_readiness_wait_count` | 150 |
| `setup_readiness_reject_count` | 1300 |
| `setup_readiness_unknown_count` | 0 |
| `average_setup_readiness_score` | 65.060695 |
| `setup_readiness_average_blocker_count` | 1.047731 |
| `setup_readiness_average_warning_count` | 3.619328 |

### Grades readiness

| Grade | Count |
|-------|-------|
| A | 37 |
| B | 676 |
| C | 538 |
| Weak | 437 |
| None | 9 |

### Primary blockers

| Blocker | Count |
|---------|-------|
| structure_conflict | 638 |
| ifvg_conflict | 400 |
| pd_conflict | 206 |
| execution_environment_weak | 137 |
| entry_fragile | 136 |
| liquidity_missing | 85 |
| blank/none | 83 |
| target_missing | 7 |
| daily_loss_limit_warning | 5 |

---

## 9. Target quality (diagnóstico)

| Métrica | Valor |
|---------|-------|
| `liquidity_target_supported_count` | 406 |
| `liquidity_target_missing_count` | 42 |
| `liquidity_target_before_nearest_count` | 1249 |
| `liquidity_target_reached_by_tp_count` | 406 |
| `liquidity_target_beyond_nearest_count` | 319 |
| `liquidity_target_conflict_count` | 0 |
| `average_liquidity_target_official_tp_distance_points` | 280.860931 |
| `average_liquidity_target_nearest_distance_points` | 936.964643 |

### Grades target

| Grade | Count |
|-------|-------|
| C | 1095 |
| A | 203 |
| B | 203 |
| Weak | 153 |
| None | 43 |

**Interpretación:** el TP oficial RR2 sigue a menudo **antes** de la liquidez más cercana. Solo diagnóstico. **No** se aprueba cambio de TP.

---

## 10. Environment (diagnóstico)

### Sesiones

| Session | Count |
|---------|-------|
| asian | 457 |
| london | 370 |
| new_york | 85 |
| overlap | 306 |
| off_session | 479 |
| unknown | 0 |

### Spread

| Bucket | Count |
|--------|-------|
| normal | 1694 |
| warning | 2 |
| high | 1 |
| extreme | 0 |
| `average_spread_points` | 6.976429 |

### Volatilidad

| Bucket | Count |
|--------|-------|
| normal | 133 |
| high | 351 |
| extreme | 1213 |
| `average_volatility_atr_points` | 773.263027 |
| `average_volatility_range_points` | 803.031821 |

### Execution environment grade

| Grade | Count |
|-------|-------|
| Weak | 670 |
| None | 392 |
| C | 370 |
| B | 262 |
| A | 3 |

**Interpretación:** el spread **no** parece el problema principal. La volatilidad V1 se comporta como **stress label** para XAUUSD M15 (mucho `extreme`).

---

## 11. Discipline (diagnóstico)

| Métrica | Valor |
|---------|-------|
| `discipline_total_result_r` | 315 |
| `discipline_average_daily_r` | 0.921053 |
| `discipline_average_trades_per_day` | 3.959064 |
| `discipline_max_trades_in_day` | 11 |
| `discipline_days_over_trade_limit_count` | 197 |
| `discipline_trades_over_daily_limit_count` | 630 |
| `discipline_overtrading_risk_count` | 1109 |
| `discipline_revenge_trade_risk_count` | 269 |
| `discipline_daily_loss_limit_warning_count` | 134 |
| `discipline_worst_daily_r` | -4 |
| `discipline_best_daily_r` | 10 |

### Grades discipline

| Grade | Count |
|-------|-------|
| A | 804 |
| C | 341 |
| B | 302 |
| Weak | 128 |
| None | 122 |

**Interpretación:** el benchmark es **positivo en R**, pero con **presión fuerte de frecuencia / overtrading**.

---

## 12. IFVG / BISI / SIBI

| Métrica | Valor |
|---------|-------|
| `ifvg_bisi_count` | 1028 |
| `ifvg_sibi_count` | 669 |
| `ifvg_unknown_class_count` | 0 |
| `ifvg_inversion_detected_count` | 1149 |
| `ifvg_inversion_confirmed_close_count` | 699 |
| `ifvg_inversion_wick_only_count` | 737 |
| `ifvg_retest_detected_count` | 176 |
| `ifvg_aligned_with_trade_count` | 998 |
| `ifvg_conflict_with_trade_count` | 699 |

### Grades IFVG

| Grade | Count |
|-------|-------|
| Weak | 544 |
| C | 446 |
| A | 414 |
| B | 293 |

**Interpretación:** la clasificación IFVG está **completa**, pero **ifvg_conflict** sigue siendo un blocker principal (400 en readiness).

---

## 13. Entry variants (research-only)

### Oficial 50 % / CE

| Métrica | Valor |
|---------|-------|
| `entry_variant_50_sim_filled_count` | 1355 |
| `entry_variant_50_sim_win_count` | 411 |
| `entry_variant_50_sim_loss_count` | 507 |
| `entry_variant_50_sim_ambiguous_count` | 436 |
| `entry_variant_50_sim_not_filled_count` | 342 |
| `entry_variant_50_sim_winrate` | **0.447712** |
| `entry_variant_50_sim_expectancy_r` | 0.232472 |

### 25 %

| Métrica | Valor |
|---------|-------|
| `entry_variant_25_sim_winrate` | 0.616192 |
| `entry_variant_25_sim_expectancy_r` | 0.402847 |

### Adaptive

| Métrica | Valor |
|---------|-------|
| `entry_variant_adaptive_sim_winrate` | 0.616766 |
| `entry_variant_adaptive_sim_expectancy_r` | 0.404270 |

### Edge

| Métrica | Valor |
|---------|-------|
| `entry_variant_edge_sim_filled_count` | 1697 |
| `entry_variant_edge_sim_win_count` | 1453 |
| `entry_variant_edge_sim_loss_count` | 173 |
| `entry_variant_edge_sim_ambiguous_count` | 11 |
| `entry_variant_edge_sim_winrate` | **0.893604** |
| `entry_variant_edge_sim_expectancy_r` | **1.610489** |

### Gobernanza variantes

| Variante | Estado |
|----------|--------|
| **50 % / CE** | Entry **oficial** — única base para benchmark aprobado hoy |
| **25 % / adaptive / edge** | **Research-only** — prometedoras en simulación; **no aprobadas** |

Requieren robustness audit, OOS, walk-forward, forward-demo read-only y revisión anti-overfit antes de cualquier cambio de política de entrada oficial.

---

## 14. Columnas de export confirmadas (operador)

El operador confirmó presencia de columnas clave en `backtest_trades.csv` / summary:

| Área | Columnas / campos |
|------|-------------------|
| Outcome | `outcome`, `result_r` |
| Readiness | `setup_readiness_decision`, `setup_readiness_grade`, `setup_readiness_primary_blocker` |
| Target | `liquidity_target_grade` (+ campos liquidez/target) |
| Environment | `execution_environment_grade`, session/spread/volatility |
| Discipline | `discipline_grade`, campos discipline |
| IFVG | `ifvg_bisi_sibi_grade` (+ clasificación BISI/SIBI) |
| Entry | entry fill / near-miss / missed entry |
| Variants | entry variant sim columns |
| PD | premium/discount |
| Context | session, spread, volatility buckets |

Estas columnas alimentan consumidores E5.18–E5.21 y futuros audits **E5.22.1** / **E5.22.2**.

---

## 15. Decisión E5.22

### PASS técnico

| Criterio | Estado |
|----------|--------|
| TestEA más reciente compila limpio | Sí — 0 errors / 0 warnings |
| EX5 archivado | Sí — `Mapazapp_TestEA_MZP_TestEA_E5_18.ex5` |
| Export SET001 refrescado en Strategy Tester | Sí |
| Bundle valida | Sí — `ok=true` |
| Postura read-only / tester-only | Confirmada |
| Campos core E5.18+ presentes | Confirmados |
| Benchmark positivo en R | Sí — Total_R=315, expectancy_r≈0.1856 |

### Caveats (sin aprobación de estrategia)

| Caveat | Detalle |
|--------|---------|
| Un solo bundle | SET001 — insuficiente para promover entry alternativa |
| Sin aprobación edge / 25 % / adaptive | Research-only |
| Sin cambio TP / entry / gates | Gobernanza vigente |
| Sin live trading | `has_real_trading_orders=false` |
| Alta ambigüedad | 436 ambiguous (~26 % de trades) |
| Overtrading | 1109 overtrading_risk; 630 trades over daily limit |
| Volatilidad V1 | Perfil no calibrado — stress label XAUUSD M15 |
| Target quality | Mayoría C; 1249 before-nearest liquidity |
| Blockers dominantes | structure_conflict, ifvg_conflict, pd_conflict |

---

## 16. Relación con E5.22.0.1

[`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md) estableció:

- MT5 **alineado** con repo (`MZP_TestEA_E5_18`).
- Winrate ~44,77 % **esperado** porque la lógica MQL5 oficial no cambió.
- Capas E5.19–E5.21 (diagnóstico/presentación) **no** alteran outcome oficial del Strategy Tester.

**E5.22** confirma operativamente esa interpretación con export fresco validado y snapshot completo del motor.

---

## 17. Próximo recomendado

### E5.22.1 — Latest Export Compatibility Audit

Verificar que el export E5.18 actual alimenta sin rotura:

- readiness report generator
- dashboard read-only adapter
- HTML mock
- alert formatter
- queue manager

### E5.22.2 — Setup Performance Baseline Audit — **implementado (repo)**

CLI: `mapazapp:testea-setup-performance-baseline-audit` — ver [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md).

Analizar outcome/R por:

- readiness decision
- primary blocker
- IFVG grade
- target grade
- environment grade
- discipline grade
- session / volatility bucket
- entry status / near-miss
- variantes 50 % vs 25/adaptive/edge (research)
- impacto ambiguity / overtrading
- drawdown y daily R

---

## Gobernanza (sin cambio)

| Acción | Estado |
|--------|--------|
| Cambio entry / TP / gates / MQL5 | **Prohibido** |
| Aprobar edge / 25 % / adaptive | **Prohibido** |
| Live trading / Telegram / panel / email / push | **Prohibido** |
| Más corridas MT5 en esta tarea | **No ejecutadas** |

---

## Referencias

- [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md)
- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
- [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md)
- [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md)
- [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)
- [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
