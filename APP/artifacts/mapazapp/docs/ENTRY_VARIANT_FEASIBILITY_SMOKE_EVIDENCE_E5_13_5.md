# Entry Variant Feasibility — Evidencia smoke E5.13.5 (operador)

## Alcance

- **Checkpoint:** E5.13.5 — humo técnico post–**E5.13.4** (export Entry Variant Feasibility V1).
- **Contrato export:** [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md).
- **Implementación repo (referencia):** commit `e957d76` — `feat(mapazapp): E5.13.4 add entry variant feasibility diagnostics`.
- **Git remoto:** `17a75a9..e957d76` `master` → `master` (push operador completado).

Este documento registra **solo** validación de export / CLI y lectura de agregados del bundle benchmark; **no** sustituye simulación de outcomes por variante, multi-bundle ni decisiones de producto.

---

## Build y compilación

| Campo | Valor |
|-------|--------|
| `ea_build` | `MZP_TestEA_E5_13_4` |
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

**Veredicto técnico:** **PASS** (export coherente; warning esperado por tamaño de eventos).

---

## Distribución `entry_variant_feasibility_grade` (conteo por trade)

| Grado | Count |
|-------|------:|
| A | 1355 |
| B | 342 |

**Suma:** 1697 (= `trade_count`).

Coherente con cohortes que alcanzan CE/50 % (A) vs. solo variantes superficiales sin fill oficial (B).

---

## `entry_variant_best_reached` (conteo por trade)

| Best reached | Count |
|--------------|------:|
| `edge` | 1697 |

Todos los candidatos tienen como variante más superficial alcanzada el **borde** (0 % profundidad), coherente con E5.13.3 (`fvg_touch_reached_count = 1697`).

---

## Conteos de reason tokens (`entry_variant_*`)

| Token / agregado | Count | Notas |
|------------------|------:|-------|
| `entry_variant_edge_reached` | 1697 | = `trade_count` |
| `entry_variant_25_reached` | 1406 | +51 vs CE/50 % |
| `entry_variant_adaptive_reached` | 1406 | alineado con 25 % en este bundle |
| `entry_variant_50_reached` | 1355 | = CE oficial |
| `entry_variant_ce_reached` | 1355 | alias lógico de 50 % |
| `entry_variant_75_reached` | 1117 | retrace más profundo menos frecuente |
| `entry_variant_deep_reached` | 1117 | alineado con 75 % |
| `entry_variant_shallow_would_fill` | 342 | sin 50 % pero con shallow |
| `entry_variant_official_too_deep` | 342 | entry oficial ~50 % no alcanzado |
| `entry_variant_only_shallow_reached` | 342 | solo edge/25 %, no CE |
| `entry_variant_deeper_would_not_fill` | 289 | shallow/CE sí, 75 % no |

---

## Contraste con E5.13.3 (mismo bundle, misma escala)

| Métrica | E5.13.3 (fill feasibility) | E5.13.5 (variant feasibility) |
|---------|------------------------------|--------------------------------|
| FVG touch / edge | 1697 | 1697 (edge) |
| CE / 50 % | 1355 | 1355 |
| 25 % | — | 1406 (+51) |
| 75 % | — | 1117 |
| Subconjunto «shallow would fill» | diagnóstico fill (298 shallow + 22 near_miss + capas) | **342** `shallow_would_fill` / `only_shallow_reached` |

La hipótesis de E5.13.3 queda **confirmada a nivel de fillability**: el entry oficial en ~CE/50 % es más estricto que edge/25 % para un subconjunto material; el 75 % es claramente **menos** alcanzable.

---

## Outcomes — medias por cohorte (operador)

| Outcome | Count | avg Entry Quality | avg Variant score | avg best depth % | avg official depth % |
|---------|------:|------------------:|------------------:|-----------------:|---------------------:|
| `ambiguous` | 436 | 51.9335 | 15 | 0 | 50.0397 |
| `expired_open` | 1 | 53 | 15 | 0 | 50.01 |
| `expired_unfilled` | 342 | 49.0409 | 10.1491 | 0 | 49.893 |
| `loss` | 507 | 54.5227 | 15 | 0 | 49.9329 |
| `win` | 411 | 54.7713 | 15 | 0 | 49.851 |

- `avgBestReachedDepth = 0` en todas las cohortes: coherente con `best_reached = edge` (profundidad mínima 0 %).
- `expired_unfilled`: única cohorte con **avg variant score ≈ 10** (grade B dominante); alineado con **342** trades `shallow_would_fill` / sin CE.
- Entry Quality **no** separa fuertemente por outcome en este corte; variant score sí separa fillability, **no** rentabilidad.

---

## Interpretación (solo lectura de datos)

1. **Export estable:** flags `has_entry_variant_feasibility_v1_logic`, validador CLI y columnas `entry_variant_*` coherentes — **PASS** técnico.
2. **Entry oficial ≈ CE/50 %:** 1355/1697 alcanzan 50 %; igual que `entry_price_reached` / fill en E5.13.3.
3. **25 % ligeramente más alcanzable que CE:** 1406 vs 1355 (+51); el margen es **pequeño** — la mayoría que llega a CE ya pasó por zona superficial.
4. **Edge = 1697:** esperado; todo candidato toca el FVG (E5.13.3).
5. **75 % menos fillable:** 1117 — entrar más profundo en el gap es **menos** frecuente en retrace; no implica mejor edge.
6. **342 trades «official too deep»:** mismo orden de magnitud que `expired_unfilled` outcome (342); variante shallow **habría sido alcanzable** en diagnóstico, **no** demuestra que hubieran sido mejores trades.

### Caveat explícito

- Esto **no** prueba que edge o 25 % sean más rentables.
- Solo prueba que son **más fillables** (más fáciles de tocar en retrace).
- Un entry más temprano puede cambiar distancia a SL, RR efectivo, tasa de `ambiguous`, pérdidas y expectancy.
- **No** cambiar el modelo oficial CE/50 % solo con este smoke.

---

## Decisión de ingeniería (E5.13.5)

- **PASS** técnico del smoke.
- Mantener Entry Variant Feasibility **solo observación**; **sin** compuerta dura, **sin** aprobación live, **sin** cambiar umbrales de Entry Quality.
- **No** usar variant scores como score pre-trade.
- **No** cambiar el entry virtual oficial (CE/50 %) en este checkpoint.
- **No** calibrar ni tunear desde un solo bundle.

**Siguiente recomendado:** **E5.13.6** — implementado en repo — [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md). **Smoke operador:** **E5.13.7** (recompilar `MZP_TestEA_E5_13_6`) **antes** de **E5.14** IFVG / BISI / SIBI.

---

## Referencias cruzadas

- Implementación E5.13.4: [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md)  
- Smoke fill previo: [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md)  
- Roadmap humanización: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)  
- Plan maestro V2: [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
