# Entry Variant Outcome Simulation — Evidencia smoke E5.13.7 (operador)

## Alcance

- **Checkpoint:** E5.13.7 — humo técnico post–**E5.13.6** (export Entry Variant Outcome / Risk Simulation V1).
- **Contrato export:** [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md).
- **Implementación repo (referencia):** commit `c92e265` — `feat(mapazapp): E5.13.6 add entry variant outcome simulation`.
- **Git remoto:** `e957d76..c92e265` `master` → `master` (push operador completado).

Este documento registra validación de export / CLI y lectura de agregados del bundle benchmark. **No** aprueba edge/25 %/75 % como evidencia estratégica hasta reconciliar la variante control **50 % / CE** con el outcome oficial.

---

## Build y compilación

| Campo | Valor |
|-------|--------|
| `ea_build` | `MZP_TestEA_E5_13_6` |
| Compilación MetaEditor | **0 errors, 0 warnings** |

---

## Validación CLI (operador)

| Campo | Valor |
|-------|--------|
| `ok` | `true` |
| `status` | `warning` |
| `errors` | `[]` |
| Warnings | únicamente `BUNDLE_EVENTS_LARGE` |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `trade_count` | 1697 |
| Bundle (carpeta) | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |

**Veredicto técnico:** **PASS** (export coherente; campos `entry_variant_*_sim_*` presentes; CLI resume variantes; warning esperado por tamaño de eventos).

---

## Rollups por variante (summary / CLI)

| Variante | filled | win | loss | ambiguous | not_filled | invalid_risk | totalR | expectancyR | winrate | avg_risk_pts |
|----------|-------:|----:|-----:|----------:|-----------:|-------------:|-------:|------------:|--------:|-------------:|
| **edge** | 1697 | 1453 | 173 | 11 | 0 | 0 | 2733 | 1.610489 | 0.893604 | 280.860931 |
| **25** | 1405 | 411 | 256 | 687 | 292 | 0 | 566 | 0.402847 | 0.616192 | 205.244840 |
| **50 / CE** | 1355 | 353 | 121 | 880 | 342 | 0 | 585 | 0.431734 | 0.744726 | 131.619188 |
| **75** | 1235 | 188 | 25 | 1021 | 461 | 1 | 351 | 0.284211 | 0.882629 | 63.240486 |
| **adaptive** | 1405 | 412 | 256 | 686 | 292 | 0 | 568 | 0.404270 | 0.616766 | 205.251246 |

### Comparadores summary

| Métrica | Variante |
|---------|----------|
| `best_by_expectancy` | **edge** |
| `best_by_total_r` | **edge** |
| `lowest_ambiguous_variant` | **edge** |
| `highest_fill_variant` | **edge** |

---

## Control: variante 50 % / CE vs outcome oficial (mismo bundle)

La variante **50 % / CE** debe actuar como **control** cercano al entry oficial (CE/50 %). Los conteos de **fill** y **not_filled** coinciden con el baseline oficial; la distribución de **outcomes** y **R** **no**.

### Baseline oficial (cohorte conocida)

| Métrica | Oficial |
|---------|--------:|
| `trade_count` | 1697 |
| filled | 1355 |
| win | 411 |
| loss | 507 |
| ambiguous | 436 |
| `expired_unfilled` | 342 |
| totalR | 315 |
| expectancyR | ≈ 0.1856 |
| winrate | ≈ 0.4477 |

### Simulación variante 50 % (E5.13.7)

| Métrica | 50 % sim |
|---------|--------:|
| filled | 1355 |
| win | 353 |
| loss | 121 |
| ambiguous | **880** |
| not_filled | 342 |
| totalR | **585** |
| expectancyR | **0.431734** |
| winrate | **0.744726** |

### Desvíos principales (misma cohorte filled = 1355)

| Dimensión | Oficial | 50 % sim | Δ / nota |
|-----------|--------:|---------:|----------|
| win | 411 | 353 | −58 |
| loss | 507 | 121 | −386 |
| ambiguous | 436 | **880** | **+444** |
| totalR | 315 | 585 | +270 |
| expectancyR | ~0.186 | ~0.432 | ~+0.25 R/trade filled |
| winrate (win/(win+loss) filled) | ~0.448 | ~0.745 | +~0.30 |

**Interpretación:** el desajuste es **demasiado grande** para tratar los rollups edge/25/75/adaptive como evidencia estratégica fiable. El smoke **exporta y resume** correctamente; la **paridad semántica** entre sim 50 % y outcome oficial **no** está demostrada.

---

## Lectura cautelosa de edge (no usar como P/L)

Edge muestra el mayor fill, totalR y winrate en este rollup. Eso es **esperable** en parte por:

- Riesgo más amplio (`average_risk_points` ≈ 281 vs ≈ 132 en 50 %)
- Menos `not_filled` (1697 vs 1355 oficial)
- Outcomes simulados con geometría distinta al control no reconciliado

**No** usar `edge` totalR / winrate como prueba de rentabilidad hasta **E5.13.6.1**.

---

## Decisión de ingeniería (E5.13.7)

| Veredicto | Alcance |
|-----------|---------|
| **PASS técnico** | Export EVOS, validación bundle, CLI `mapazapp:testea-entry-variant-sim-summary` |
| **Bloqueado para estrategia** | Conclusiones edge / 25 % / 75 % / adaptive; aprobación de entry alternativo |
| **Mantener** | Entry oficial CE/50 % sin cambio |
| **No hacer** | Aprobar edge o 25 %; tunear umbrales; usar sim R como R de estrategia |

**Histórico:** **E5.13.6.1** — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md). **E5.13.6.2** cerrado — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md) (reconcile PASS; paridad 50 %/CE **no**). **E5.13.6.3** cerrado — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md). **E5.13.6.4** cerrado — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md) (`mismatch_rate = 0`).

Alcance E5.13.6.1 (solo diagnóstico):

- Comparar `outcome` oficial vs `entry_variant_50_sim_status` por trade.
- Clasificar mismatches: official win vs 50 ambiguous; official loss vs 50 ambiguous; official ambiguous vs 50 win/loss; filled vs not_filled; precio entry / SL / TP; barra fill / close; misma vela ambiguous.
- CLI opcional: `mapazapp:testea-entry-variant-sim-reconcile`.
- **Sin** cambiar estrategia, umbrales ni entry oficial.

**Después de reconciliación:** rerun del summary EVOS post-paridad sobre el bundle `MZP_TestEA_E5_13_6_3`; luego evaluar si corresponde avanzar a **E5.14** IFVG / BISI / SIBI.

---

## Referencias cruzadas

- Implementación E5.13.6: [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md)  
- Smoke feasibility: [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md)  
- Roadmap humanización: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)  
- Plan maestro V2: [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
