# Entry Zone / Fill Feasibility — Evidencia smoke E5.13.3 (operador)

## Alcance

- **Checkpoint:** E5.13.3 — humo técnico post–**E5.13.2** (export Entry Fill Feasibility V1).
- **Contrato export:** [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md).
- **Implementación repo (referencia):** commit `5f73707` o posterior — `feat(mapazapp): E5.13.2 add entry fill feasibility diagnostics`.

Este documento registra **solo** validación de export / CLI y lectura de agregados del `backtest_summary.json`; **no** sustituye análisis multi-bundle, variantes de entrada ni decisiones de producto.

---

## Validación CLI (operador)

| Campo | Valor |
|-------|--------|
| `ea_build` | `MZP_TestEA_E5_13_2` |
| `ok` | `true` |
| `status` | `warning` |
| `errors` | `[]` |
| Warnings | únicamente `BUNDLE_EVENTS_LARGE` |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `trade_count` | 1697 |
| Bundle (carpeta) | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |

**Veredicto técnico:** **PASS** (export coherente; warning esperado por tamaño de eventos).

---

## Summary — flags Entry Fill Feasibility

| Campo | Valor |
|-------|--------|
| `has_entry_fill_feasibility_v1_logic` | `true` |
| `entry_fill_feasibility_enabled` | `true` |
| `entry_fill_filled_count` | 1355 |
| `entry_fill_expired_unfilled_count` | 22 |
| `entry_fill_near_miss_count` | 22 |
| `entry_fill_missed_shallow_retrace_count` | 298 |
| `entry_fill_too_deep_for_retest_count` | 0 |
| `entry_fill_invalidated_before_fill_count` | 0 |
| `entry_fill_outside_fvg_count` | 0 |
| `entry_fill_geometry_unknown_count` | 0 |
| `fvg_touch_reached_count` | 1697 |
| `fvg_ce_touch_reached_count` | 1355 |
| `entry_price_reached_count` | 1355 |
| `average_entry_fill_feasibility_score` | 12.839128 |
| `average_entry_depth_in_fvg_pct` | 49.932501 |
| `average_max_retrace_into_fvg_pct` | 405.705718 |
| `average_missed_entry_by_points` | 27.681791 |
| `average_bars_to_entry_fill` | 4.063469 |
| `average_bars_to_max_retrace` | 4.325280 |
| `average_entry_quality_score` | 52.812021 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1053 |
| `score_rejected_count` | 643 |

> **Nota:** `average_max_retrace_into_fvg_pct` puede superar 100 % cuando el precio penetra más allá del borde lejano del FVG en la ventana observada; es una métrica de penetración en la escala del gap, no un porcentaje acotado 0–100 estricto en todos los casos.

---

## Distribución `entry_fill_status` (conteo por trade)

| Status | Count |
|--------|------:|
| `filled` | 1355 |
| `missed_shallow_retrace` | 298 |
| `near_miss` | 22 |
| `expired_unfilled` | 22 |

**Suma status explícitos:** 1697 (= `trade_count`).

---

## Distribución `entry_fill_feasibility_grade` (conteo por trade)

| Grado | Count |
|-------|------:|
| A | 1355 |
| Weak | 298 |
| B | 22 |
| C | 22 |

---

## Por outcome (promedios agregados operador)

> Métricas de cohorte; **no** implican edge ni tuning automático. Fill feasibility es **post-candidato** — no usar como score pre-trade.

| Outcome | Count | Avg entry quality | Avg fill score | Avg entry depth % | Avg max retrace % | Avg missed pts | Fvg touch | CE touch | Entry reached |
|---------|------:|------------------:|---------------:|------------------:|------------------:|---------------:|----------:|---------:|--------------:|
| ambiguous | 436 | 51.9335 | 14.9197 | 50.0397 | 595.1395 | 0 | 436 | 436 | 436 |
| expired_open | 1 | 53 | 14 | 50.01 | 52.49 | 0 | 1 | 1 | 1 |
| expired_unfilled | 342 | 49.0409 | 4.6784 | 49.893 | 6.9383 | 137.3567 | 342 | 0 | 0 |
| loss | 507 | 54.5227 | 14.8935 | 49.9329 | 645.0324 | 0 | 507 | 507 | 507 |
| win | 411 | 54.7713 | 14.8856 | 49.851 | 242.2017 | 0 | 411 | 411 | 411 |

**Lectura clave:** en `expired_unfilled`, el precio **toca el FVG** (342/342) pero **no** CE ni entry virtual; fill score medio muy bajo (4.68) y `missed_entry_by_points` alto (137.36). Wins/losses/ambiguous con fill virtual muestran fill score ~14.9 y retrace profundo en la ventana.

---

## Frecuencia de tokens en `entry_fill_feasibility_reasons` (operador)

| Token | Frecuencia observada | Uso como evidencia |
|-------|---------------------:|--------------------|
| `entry_depth_reasonable` | 1697 | OK (= trade_count) |
| `fvg_touch_reached` | 1697 | OK |
| `fvg_ce_touch_reached` | 1355 | OK |
| `entry_price_reached` | 1355 | OK |
| `entry_fill_filled` | 1355 | OK |
| `entry_fill_fast` | 867 | OK (subconjunto de filled) |
| `entry_fill_late` | 137 | OK (subconjunto de filled) |
| `entry_missed_shallow_retrace` | 298 | OK |
| `entry_fill_near_miss` | 22 | OK |
| `entry_fill_expired_unfilled` | 22 | OK |
| `max_retrace_shallow` | 12118 | **No** usar como conteo por trade |
| `max_retrace_deep_enough` | 1906 | **No** usar como conteo por trade |

### Caveat — deduplicación de reason codes (resuelto en E5.13.2.1)

En el smoke **E5.13.3** (build `MZP_TestEA_E5_13_2`), las frecuencias de `max_retrace_shallow` (12118) y `max_retrace_deep_enough` (1906) **superaban** `trade_count` porque esos tokens se añadían **por barra** durante el seguimiento del retrace.

**E5.13.2.1** corrige la telemetría con `MapzEffAppendReasonOnce` (cada token ≤ 1 vez por fila CSV). **No** invalida la evidencia primaria de este smoke:

- contadores del **summary** y `entry_fill_status` siguen siendo la referencia;
- los hallazgos de FVG touch / CE+entry / retrace superficial **no** cambian.

Re-runs post–**E5.13.2.1** (`MZP_TestEA_E5_13_2_1`) deben mostrar frecuencias de reason acotadas a ≤ `trade_count` por token.

---

## Interpretación (solo lectura de datos)

1. **Export estable:** `has_entry_fill_feasibility_v1_logic`, validador CLI y agregados summary coherentes a escala de campaña (**PASS** técnico).
2. **Todo trade toca el FVG:** `fvg_touch_reached_count = 1697`; solo **1355 / 1697** alcanzan CE y precio de entry virtual — gap sistemático entre “entró en la zona” y “rellenó el modelo midpoint/CE”.
3. **No-fill estructural vs expiración:** de los **342** `expired_unfilled` (outcome), la mayoría del subconjunto sin fill virtual se explica por **retrace superficial** en el diagnóstico (`missed_shallow_retrace` = 298, `near_miss` = 22, `expired_unfilled` status = 22 en la capa fill). Sugiere que el entry en ~**50 % del FVG** (CE) puede ser **demasiado profundo o estricto** para un subconjunto material de candidatos — **no** demuestra que entrar más temprano mejore edge; solo que merece un estudio de **variantes de entrada** (E5.13.4).
4. **Fill feasibility ≠ Entry Quality:** medias de `entry_quality_score` similares entre cohortes con fill alto y `expired_unfilled` bajo en fill score; confirma que la capa E5.13.2 es ortogonal y **no** debe fusionarse al score pre-trade.
5. **Profundidad media ~50 %:** `average_entry_depth_in_fvg_pct ≈ 49.93` coherente con entry `fvg_midpoint`; no hay `entry_too_deep_for_retest` ni `outside_fvg` en este bundle.

---

## Decisión de ingeniería (E5.13.3)

- **PASS** técnico del smoke.
- Mantener Entry Fill Feasibility **solo observación**; **sin** compuerta dura, **sin** aprobación live, **sin** cambiar umbrales de Entry Quality, **sin** usar fill feasibility como score pre-trade, **sin** cambiar el modelo de entrada virtual en este checkpoint.
- **No** calibrar ni tunear solo desde este bundle.

**Siguiente recomendado:** **E5.13.4** — Entry Variant Feasibility Audit (comparar borde FVG / 25 % / CE / entry adaptivo). **E5.13.2.1** cerrado en repo.

---

## Referencias cruzadas

- Implementación E5.13.2: [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md)  
- Smoke PD previo: [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md)  
- Roadmap humanización: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)  
- Plan maestro V2: [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
