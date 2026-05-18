# Entry Variant Feasibility Audit V1 — Diagnóstico hipotético (E5.13.4)

## Por qué sigue a Entry Fill Feasibility (E5.13.3)

**E5.13.2** midió si el precio retrocede hasta el entry virtual oficial (~CE / 50 % del FVG). **E5.13.3** (smoke operador, build `MZP_TestEA_E5_13_2`) confirmó:

- `fvg_touch_reached_count` = **1697 / 1697** (todos los candidatos tocan el FVG).
- `fvg_ce_touch_reached_count` = **1355 / 1697**; `entry_price_reached_count` = **1355**; `filled` = **1355**.
- **342** trades con outcome `expired_unfilled` sin CE/entry: retrace superficial (`missed_shallow_retrace` = 298, `near_miss` = 22).

Interpretación: el mercado **suele** tocar el FVG, pero un subconjunto **no** alcanza el entry oficial en CE/50 %. Eso sugiere estudiar **variantes de entrada más superficiales** antes de cambiar el modelo de trading.

## Entry oficial vs variantes hipotéticas

| Variante | Profundidad (desde borde cercano) | Rol |
|----------|-----------------------------------|-----|
| **edge** | 0 % (borde cercano del FVG) | Entrada más superficial |
| **25 %** | 25 % del ancho del gap | Más superficial que CE |
| **50 % / CE** | 50 % | **Entry virtual oficial** (sin cambio en E5.13.4) |
| **75 %** | 75 % | Retrace más profundo (observación) |
| **adaptive** | edge o 25 % según heurística | Solo diagnóstico; no regla de trading |

Las variantes se exportan **en columnas separadas** (`entry_variant_*`). **No** sustituyen `entry`, fills simulados, outcomes ni P/L de estrategia.

## Adaptive shallow (observación)

Heurística simple post-candidato:

- Si **liquidity chain** fuerte (`chain_score` ≥ 7 o grade A/B), o
- MSS/CHoCH **demasiado tarde** (`mss_too_late` / `choch_too_late`), o
- relevancia temporal MSS/CHoCH **débil** (score ≤ 4),

→ la variante adaptiva apunta a **edge**; si no, a **25 %**.

Esto **no** aprueba trades ni modifica el entry real.

## Comportamiento observation-only

- **No** gate, **no** `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **No** cambia generación de trades, umbrales, grades A/B fabricados ni `entry_quality_score`.
- `entry_variant_feasibility_score` (0–15) es **diagnóstico post-candidato**; no entra en Entry Quality Score.

## Flags y agregados

- `entry_variant_shallow_would_fill` — no se alcanzó 50 % pero sí edge/25 %/adaptive shallow.
- `entry_variant_deeper_would_not_fill` — se alcanzó 25 % o 50 % pero no 75 %.
- `entry_variant_fill_gap_pct` — brecha entre profundidad oficial y la variante más superficial alcanzada.

## Inputs TestEA

| Input | Default |
|-------|---------|
| `InpEnableEntryVariantFeasibilityV1` | true |
| `InpEntryVariantFeasibilityScoreEnabled` | true |

Build: `MZP_TestEA_E5_13_4`.

## Summary / CSV

- `has_entry_variant_feasibility_v1_logic: true`
- Contadores: `entry_variant_*_reached_count`, `entry_variant_shallow_would_fill_count`, …
- Promedios: `average_entry_variant_feasibility_score`, `average_entry_variant_best_reached_depth_pct`, …

## Calibración (E5.9)

Si el CSV incluye `entry_variant_feasibility_score`, el analyzer expone `entry_variant_feasibility_component_stats`. Bundles antiguos sin la columna siguen parseando (`null`).

## Siguiente

**E5.13.5** — smoke operador: recompilar TestEA, Strategy Tester, validar bundle con flags E5.13.4 y contrastar con E5.13.3.
