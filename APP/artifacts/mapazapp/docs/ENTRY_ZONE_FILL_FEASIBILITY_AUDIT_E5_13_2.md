# Entry Zone / Fill Feasibility Audit V1 — Exporte de observación (E5.13.2)

## Por qué sigue a Premium/Discount (E5.13)

La evidencia **E5.13.1** mostró que el exporte Premium/Discount funciona técnicamente, pero **no separa con fuerza** wins de losses. Sin embargo, el bucket **`expired_unfilled`** tuvo el **promedio más bajo** de `premium_discount_score`, y aparecieron muchos diagnósticos de geometría de entrada (`pd_entry_zone_conflict`, `pd_entry_outside_range`, `pd_entry_too_deep`).

Eso apunta a un problema distinto al “valor” del setup: **¿el modelo virtual de entrada (midpoint FVG + expiración) es rellenable en la práctica?** E5.13.2 responde con una capa **post-candidato** que observa el camino del precio hasta fill, expiración o resolución.

## `expired_unfilled` no implica solo mala calidad de setup

Un trade puede tener sesgo alineado, FVG válido y liquidez razonable, y aun así quedar **`expired_unfilled`** si:

- el precio **no retrocede** lo suficiente dentro del FVG;
- toca el borde del FVG pero **no** el nivel virtual de entrada (CE / midpoint);
- el entry está **demasiado profundo** dentro del gap para un retest típico;
- el entry queda **fuera** del FVG por cómo se normalizó la zona.

E5.13.2 etiqueta estos patrones para auditoría, **sin** cambiar generación de trades ni outcomes.

## Pre-trade score vs diagnóstico post-candidato

| Capa | Cuándo | Uso |
|------|--------|-----|
| `entry_quality_score` (E5.8) | En exporte al cerrar la fila; componentes pre-trade | Observación / calibración; **no** gate en TestEA |
| `premium_discount_score` (E5.13) | En setup / candidato (rango medido sin lookahead de outcome) | ¿Entrada en premium/discount del dealing range? |
| `entry_fill_feasibility_score` (E5.13.2) | **Después** del candidato; usa barras hasta fill/expiración | ¿El precio volvió al entry? ¿Near miss? ¿Retrace superficial? |

**Regla explícita:** `entry_fill_feasibility_score` **no** debe incorporarse al `entry_quality_score` operativo ni usarse como gate sin un checkpoint de forward-readiness aparte (p. ej. E5.13.3 smoke).

## Medición: profundidad de entrada en el FVG

Con zona `[fvg_low, fvg_high]` y dirección del setup:

- **Largo:** borde cercano = `fvg_high`, lejano = `fvg_low`, CE = midpoint.
- **Corto:** borde cercano = `fvg_low`, lejano = `fvg_high`.

`entry_depth_in_fvg_pct` = distancia desde el borde cercano hacia el interior del gap, en % del ancho del FVG (0 % en el borde cercano, 100 % en el lejano). El entry virtual por defecto es **midpoint** → profundidad ~50 %.

## Diagnóstico de retrace / fill

Durante la ventana de espera (`InpVirtualEntryExpiryBars` o `InpEntryFillFeasibilityMaxBars` si > 0), solo velas **cerradas** del TF de ejecución:

- `fvg_touch_reached` — precio entra en la zona del FVG.
- `fvg_ce_touch_reached` — toca CE (midpoint).
- `entry_price_reached` — toca el nivel virtual de entrada (misma regla que el fill simulado).
- `max_retrace_into_fvg_pct` — máxima penetración en el gap antes de fill/expiración.
- `missed_entry_by_points` — menor distancia en points al entry sin tocarlo.
- `entry_near_miss` — no fill y `missed_entry_by_points` ≤ `InpEntryFillFeasibilityNearMissPoints`.
- `entry_missed_shallow_retrace` — tocó FVG pero retrace máximo &lt; umbral (~28 %).
- `entry_too_deep_for_retest` — profundidad geométrica ≥ ~72 % o status dedicado.

## Estados (`entry_fill_status`)

`filled`, `expired_unfilled`, `missed_shallow_retrace`, `near_miss`, `too_deep_for_retest`, `invalidated_before_fill`, `outside_fvg`, `unknown`.

## Comportamiento observation-only

- **No** aprueba trades, **no** modifica fills, outcomes, umbrales ni `entry_quality_score`.
- **No** `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- Eventos compactos: `fill_en`, `fill_status`, `fvg_touch`, `ce_touch`, `entry_touch`, `miss_pts`, `depth_pct`, `fill_score`.

## Inputs TestEA

| Input | Default | Notas |
|-------|---------|--------|
| `InpEnableEntryFillFeasibilityV1` | true | Activa exporte y tracking |
| `InpEntryFillFeasibilityMaxBars` | 0 | 0 = usar `InpVirtualEntryExpiryBars` |
| `InpEntryFillFeasibilityNearMissPoints` | 30 | Umbral near-miss |
| `InpEntryFillFeasibilityScoreEnabled` | true | Si false, score 0 / grade None |

## Summary / CSV

- Flag: `has_entry_fill_feasibility_v1_logic: true`
- Contadores: `entry_fill_filled_count`, `entry_fill_expired_unfilled_count`, `fvg_touch_reached_count`, …
- Promedios: `average_entry_fill_feasibility_score`, `average_entry_depth_in_fvg_pct`, `average_max_retrace_into_fvg_pct`, …

## Calibración (E5.9 analyzer)

Si el CSV incluye `entry_fill_feasibility_score`, el analyzer expone `entry_fill_feasibility_component_stats` por outcome. Documentar siempre como **diagnóstico post-candidato**, no score pre-trade.

## Smoke E5.13.3 (cerrado — docs)

**E5.13.3** — evidencia operador sobre bundle benchmark — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md) (**PASS** técnico; `BUNDLE_EVENTS_LARGE` único warning). Hallazgo: 1697/1697 tocan FVG; 1355/1697 alcanzan CE/entry; subconjunto sin fill coherente con retrace superficial.

## Fix E5.13.2.1 (cerrado — repo)

**E5.13.2.1** — `MapzEffAppendReasonOnce` / `MapzReasonBufHasToken`: cada token en `entry_fill_feasibility_reasons` aparece **como máximo una vez** por trade (p. ej. `max_retrace_shallow`, `max_retrace_deep_enough`). Build `MZP_TestEA_E5_13_2_1`. **No** cambia contadores summary, `entry_fill_status`, fill logic ni outcomes. La evidencia primaria de E5.13.3 sigue siendo válida.

## Siguiente paso

**E5.13.4** — Entry Variant Feasibility Audit (borde / 25 % / CE / 75 % / adaptivo) — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md). Build `MZP_TestEA_E5_13_4`.

**E5.13.5** — smoke cerrado — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md). **E5.13.6** — outcome/risk simulation (siguiente).
