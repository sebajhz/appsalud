# Setup Performance Baseline Audit — Evidencia operador E5.22.2.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.2.1 — evidencia operador baseline audit sobre SET001 |
| **Tipo** | Evidencia operador + documentación — **sin implementación de código** |
| **Baseline Git** | `ec9e5c8` o posterior — `feat(mapazapp): E5.22.2 add setup performance baseline audit` |
| **Implementación previa** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md) |
| **Bundle ST previo** | [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) — SET001, `MZP_TestEA_E5_18` |
| **Decisión** | **PASS técnico** — con caveats de gobernanza (sin gate, sin live, sin aprobación edge/25/adaptive) |
| **Trade model (E5.22.3)** | [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) |
| **E5.22.4** | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) — **cerrado (docs)** |
| **E5.22.4.1** | [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md) — CLI selector |
| **Siguiente recomendado** | Evidencia operador SET001 · **E5.22.5** |
| **Sin cambios** | MQL5, TypeScript, MT5, Strategy Tester, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo (repo)** | `ec9e5c8` — `feat(mapazapp): E5.22.2 add setup performance baseline audit` |
| **Evidencia ST previa** | `6f92d4a` — `docs(mapazapp): E5.22 latest TestEA MT5 ST evidence` |

---

## 2. Comando operador

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-performance-baseline-audit -- \
  --bundle "C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1" \
  --json \
  --csv-output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_22_2_1_setup_performance_baseline_audit_DO_NOT_COMMIT\setup_performance_baseline_audit.csv" \
  --max-examples 10
```

| Campo | Valor |
|-------|-------|
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **EA build** | `MZP_TestEA_E5_18` |
| **Symbol / TF** | XAUUSD / M15 |

---

## 3. Artefactos locales generados

Directorio (operador, **no commitear**):

`APP/artifacts/mapazapp/docs/_local_E5_22_2_1_setup_performance_baseline_audit_DO_NOT_COMMIT/`

| Archivo | Descripción |
|---------|-------------|
| `setup_performance_baseline_audit.csv` | CSV aplanado del audit |
| `setup_performance_baseline_audit_cli_output.log` | Salida completa del CLI (incluye JSON multilínea) |
| `setup_performance_baseline_audit.json` | JSON final validado (extraído del log; ver §4) |

**Regla:** prefijo `_local_*_DO_NOT_COMMIT` — permanecen fuera de Git.

---

## 4. Nota captura JSON

| Paso | Resultado |
|------|-----------|
| Captura inicial a archivo | **Falló** — script esperaba JSON de una línea; CLI imprimió JSON pretty/multilínea |
| Audit en ejecución | **`ok: true`** — no fue fallo de auditoría |
| Recuperación | Operador extrajo del log el objeto entre el primer `{` y el último `}` |
| Validación final | `schema_version = mapazapp_setup_performance_baseline_audit_v1`, `trade_count = 1697`, `errors = []`, `warnings = []`, `flags_count = 9`, `hypotheses_count = 6` |

---

## 5. Rendimiento oficial

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `win_count` | 411 |
| `loss_count` | 507 |
| `ambiguous_count` | 436 |
| `expired_unfilled_count` | 342 |
| `expired_open_count` | 1 |
| `total_r` | 315 |
| `avg_r` | 0.185622 |
| `winrate` | 0.447712 |
| `expectancy_r` | 0.185622 |
| `max_drawdown_r` | 13 |
| `official_entry` | 50% / CE |
| `official_tp` | RR2 |

**Interpretación:** el setup oficial es **positivo en R pero ruidoso** (ambigüedad ~26 %, muchos unfilled). **No** aprueba live trading ni gates.

---

## 6. Rendimiento por readiness

### Por decisión

| Decision | Count | Win | Loss | Ambiguous | Exp. unfilled | Exp. open | Total R | Avg R | Winrate |
|----------|------:|----:|-----:|----------:|--------------:|----------:|--------:|------:|--------:|
| reject | 1300 | 171 | 456 | 331 | 342 | 0 | -114 | -0.087692 | 0.2727 |
| candidate | 247 | 156 | 33 | 57 | 0 | 1 | 279 | 1.129555 | 0.8254 |
| wait | 150 | 84 | 18 | 48 | 0 | 0 | 150 | 1.0 | 0.8235 |

**Interpretación:** readiness **separa fuertemente** el outcome en SET001. `candidate` + `wait` = 397 trades, **+429R**. `reject` = 1300 trades, **-114R**. Evidencia de que readiness es **significativo**, pero **aún no** aprobado como gate.

---

## 7. Rendimiento por blocker (top)

| Blocker | Count | Win | Loss | Ambiguous | Exp. unfilled | Total R | Avg R | Winrate |
|---------|------:|----:|-----:|----------:|--------------:|--------:|------:|--------:|
| ifvg_conflict | 400 | 2 | 252 | 146 | 0 | -248 | -0.62 | 0.0079 |
| pd_conflict | 206 | 88 | 19 | 25 | 74 | 157 | 0.7621 | 0.8224 |
| structure_conflict | 638 | 144 | 180 | 177 | 137 | 108 | 0.1693 | 0.4444 |
| execution_environment_weak | 137 | 77 | 18 | 36 | 6 | 136 | 0.9927 | 0.8105 |
| entry_fragile | 136 | 16 | 5 | 10 | 104 | 27 | 0.1985 | — |

**Interpretación:**

- `ifvg_conflict` — aparenta **tóxico** en este bundle.
- `pd_conflict` — **no** tratar como hard reject sin recalibración (muchas wins en reject).
- `execution_environment_weak` — **no** se comporta como reject fiable.
- Varios blockers son mixtos/ruidosos → **calibración** necesaria.

---

## 8. Grades

| Hallazgo | Lectura |
|----------|---------|
| Readiness A/B | Fuertes vs Weak/None débiles |
| IFVG Weak | Muy negativo: 544 trades, total_r -311, avg_r -0.5717, winrate 0.0063 |
| IFVG A/B | Muy positivos pero con muchos unfilled/ambiguous |
| Target grades | No rankean claramente el performance |
| Environment grades | No rankean claramente |
| Discipline B vs A | B supera A en este bundle → discipline grade **diagnóstico**, no gate |

---

## 9. IFVG

| Segmento | Count | Win | Loss | Ambiguous | Exp. unfilled | Total R | Avg R | Winrate |
|----------|------:|----:|-----:|----------:|--------------:|--------:|------:|--------:|
| `ifvg_conflict` false | 998 | 409 | 86 | 160 | 342 | 732 | 0.7335 | 0.8263 |
| `ifvg_conflict` true | 699 | 2 | 421 | 276 | 0 | -417 | -0.5966 | 0.0047 |

| `retest_detected` | Count | Win | Loss | Total R | Avg R |
|-------------------|------:|----:|-----:|--------:|------:|
| true | 176 | 1 | 173 | -171 | -0.9716 |
| false | 1521 | — | — | 486 | 0.3195 |

**Interpretación:** IFVG conflict y `retest_detected` requieren revisión cuidadosa (condición negativa real vs semántica). **No** convertir en gate sin confirmación multi-bundle.

---

## 10. Target

| Segmento | Count | Total R | Avg R |
|----------|------:|--------:|------:|
| target supported true | 406 | 44 | 0.1084 |
| target supported false | 1291 | 271 | 0.2099 |
| TP before nearest true | 1249 | 259 | 0.2074 |
| TP before nearest false | 448 | 56 | 0.125 |

**Interpretación:** calidad de target es **diagnóstica**; no mejora claramente el outcome en SET001. TP antes de liquidez cercana es **común** y no es automáticamente malo.

---

## 11. Environment / volatilidad

| Segmento | Lectura |
|----------|---------|
| Spread normal | 1694 / 1697 — spread **no** es el issue principal |
| Volatility extreme | 1213 trades, total_r 228, avg_r 0.1880 |
| Volatility high | 351, total_r 82, avg_r 0.2336 |
| Volatility normal | 133, total_r 5, avg_r 0.0376 |

**Interpretación:** Volatility V1 actúa como **etiqueta de estrés**, no como gate duro útil para XAUUSD M15.

---

## 12. Discipline / overtrading

| Segmento | Count | Total R | Avg R |
|----------|------:|--------:|------:|
| overtrading_risk true | 1109 | 224 | 0.2020 |
| overtrading_risk false | 588 | 91 | 0.1548 |
| revenge_trade_risk true | 269 | 70 | 0.2602 |
| revenge_trade_risk false | 1428 | 245 | 0.1716 |

**Daily stats:** `day_count` 348, `days_negative` 114, `days_positive` 179, `max_drawdown_r` 13, `worst_daily_r` -4, `best_daily_r` 10.

**Interpretación:** labels overtrading/revenge **no degradan R** en este bundle; permanecen etiquetas de riesgo/discreción, no candidatos a gate.

---

## 13. Entry fill / near miss

| Segmento | Count | Total R | Avg R |
|----------|------:|--------:|------:|
| filled official | 1355 | 315 | 0.2325 |
| missed_shallow_retrace | 298 | 0 | 0 |
| near_miss | 22 | 0 | 0 |

**Interpretación:** near-miss / missed retrace es **medible** pero neutral en outcome oficial (unfilled/expired = 0R).

---

## 14. Variantes de entrada (research-only)

| Variante | Winrate | Expectancy R | Total R | Notas |
|----------|--------:|-------------:|--------:|-------|
| 50 (oficial) | 0.4477 | 0.2326 | 315 | baseline |
| 25 | 0.6162 | 0.4028 | 566 | research |
| adaptive | 0.6168 | 0.4043 | 568 | research |
| 75 | 0.8826 | 0.2842 | 351 | ambiguous muy alto |
| edge | 0.8936 | 1.6105 | 2733 | sim-sensitive |

**Interpretación:** variantes prometedoras pero **solo investigación**. Edge probablemente sensible a simulación — **no** aprobar desde un bundle.

---

## 15. Ambiguity

| Métrica | Valor |
|---------|------:|
| `ambiguous_count` | 436 |
| `ambiguous_rate` | 25.69 % |
| `ambiguous_total_r` | 0 |

**Interpretación:** ambigüedad es **material** y puede ocultar o distorsionar edge; requiere revisión futura de ambiguity-mode.

---

## 16. Flags (9)

1. `OFFICIAL_EDGE_POSITIVE_BUT_NOT_APPROVED`
2. `HIGH_AMBIGUITY_COUNT`
3. `ENTRY_VARIANTS_REQUIRE_ROBUSTNESS_AUDIT`
4. `EDGE_VARIANT_SIMULATION_RISK`
5. `READINESS_REJECTS_DOMINATE`
6. `BLOCKER_CALIBRATION_NEEDED`
7. `TARGET_BEFORE_LIQUIDITY_DOMINANT`
8. `VOLATILITY_V1_STRESS_LABEL`
9. `OVERTRADING_PRESSURE_HIGH`

---

## 17. Hypotheses (6)

1. Official 50%/CE remains positive in R but noisy.
2. Edge/25/adaptive show stronger simulated metrics; require robustness/OOS/WF before any entry change.
3. Overtrading pressure is high; operational frequency control may help even without MQL5 gates yet.
4. Volatility V1 labels most XAUUSD M15 trades as extreme; recalibrate as stress label not hard gate.
5. IFVG/structure/PD conflicts dominate rejects; outcome-by-blocker review should guide calibration.
6. Target-before-liquidity is common; not automatically bad for RR2 but worth segmenting.

---

## 18. Examples

Generados (`--max-examples 10`) para categorías incluyendo:

| Categoría | Propósito |
|-----------|-----------|
| `reject_win` | Reject con outcome win — calibración blocker |
| `high_score_reject_win` | Score alto + reject + win |
| `pd_conflict_win` | PD conflict con win bajo reject |
| `candidate_win` | Candidate con win |
| `edge_variant_win_where_official_lost` | Edge sim gana donde oficial pierde |
| `ifvg_conflict_win` | IFVG conflict con win (raro) |
| `high_score_reject_loss` | Reject alto score con loss |
| `candidate_loss` | Candidate con loss |

Detalle en JSON local (`examples`).

---

## 19. Decisión

| Campo | Valor |
|-------|-------|
| **E5.22.2.1** | **PASS** evidencia técnica |
| Readiness | Significativo en SET001; **no** aprobado como gate |
| IFVG conflict | Candidato fuerte a calibración futura |
| PD conflict | Revisar/downgrade antes de hard rejection |
| Target / environment / discipline | Diagnóstico hasta más evidencia |
| Entry variants | Research-only |

---

## 20. Caveats

- Un solo bundle (SET001)
- Solo XAUUSD M15
- Sin OOS, walk-forward, multi-símbolo ni forward demo
- Sin aprobación de gate, entry, TP ni edge/25/adaptive
- Sin live trading

---

## 21. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 / TypeScript | **No** en esta tarea |
| Re-run MT5 / Strategy Tester | **No** en esta tarea |
| Live trading / gates | **Prohibido** |
| Telegram / dashboard panel / email / push | **No** |
| Cambio entry/TP / aprobación edge | **Prohibido** |
| Commitear `_local_*_DO_NOT_COMMIT` | **Prohibido** |

---

## Referencias

- [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md)
- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
- [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md)
