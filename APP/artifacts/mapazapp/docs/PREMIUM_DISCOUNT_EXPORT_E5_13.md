# Premium / Discount Context V1 — Exporte de observación (E5.13)

## Motivación (después de E5.12.3)

La evidencia E5.12.3 mostró que el exporte de **relevancia temporal MSS/CHoCH** funciona técnicamente, pero muchas confirmaciones llegan tarde o fuera de la ventana de entrada. El bucket `expired_unfilled` destacó en puntuación temporal de MSS, lo que sugiere: el sistema detecta estructura, pero el modelo virtual de entrada/relleno puede estar esperando un nivel que el precio no revisita.

**E5.13** añade una capa distinta: *¿el nivel de entrada virtual está en una zona de precio lógica dentro de un rango medido?* No sustituye a MSS/CHoCH ni a la liquidez; responde a la pregunta discrecional de **premium/discount** respecto a un dealing range conservador en tiempo de setup.

## Por qué MSS/CHoCH solo no basta

MSS y CHoCH describen **ruptura / cambio de carácter** en swings internos. No indican por sí solos si la entrada queda en rebajo (favorable para largos) o en encare (favorable para cortos), ni si está en equilibrio (menor calidad discrecional), ni si queda fuera del rango medido.

## Dealing range V1 (sin lookahead)

- **Fuente principal:** máximo y mínimo de swings confirmados en el **timeframe de ejecución**, anteriores o en la vela de contexto del setup (`MapzMscFindLatestSwingHigh` / `Low`, mismas reglas que MSS, con `InpPremiumDiscountSwingLookbackBars` y `InpPremiumDiscountMaxBars`). Solo velas **cerradas**; sin barras futuras.
- **Reserva HTF:** si no hay swings válidos en ejecución, se puede usar el rango **H4 protected high/low** ya calculado en HTF Structure V1 (`pd_range_source = htf_h4_protected_range`), si la geometría es válida.
- **Sin outcome:** el rango no se redefine con barras posteriores al cierre del candidato.

## Midpoint, posición y banda de equilibrio

- `pd_midpoint_50 = (pd_range_high + pd_range_low) / 2`
- `pd_position_pct`: 0 % en el mínimo del rango, 100 % en el máximo.
- Banda de equilibrio: `InpPremiumDiscountEquilibriumBandPct` alrededor del 50 % (por defecto ±10 puntos porcentuales en la escala 0–100).

## Zonas y dirección

| Zona (V1)     | Criterio (aprox.)                          |
|---------------|---------------------------------------------|
| discount      | `pd_position_pct` por debajo de 50 − banda |
| premium       | `pd_position_pct` por encima de 50 + banda |
| equilibrium   | entre ambos                                 |
| unknown       | rango ausente / inválido / fuera de rango   |

- **Largo:** preferencia discrecional por **discount**; premium = conflicto con la dirección.
- **Corto:** preferencia por **premium**; discount = conflicto.
- **Equilibrio:** neutral (puntuación media/baja en el score de observación).

## Fuera de rango y profundidad (solo diagnóstico)

- **Fuera de rango:** precio de entrada estrictamente fuera de `[pd_range_low, pd_range_high]` (con tolerancia mínima de point). Se exporta explícitamente; no se trata como “bueno” por omisión.
- **Too deep / too shallow:** umbrales simples en % del rango (largos: muy cerca del mínimo; cortos: muy cerca del máximo; “shallow” en zona favorable pero lejos del extremo deseado). Son **penalizaciones suaves** en el score de observación, **no** gate de trading.

## Comportamiento observation-only

- **No** aprueba operaciones, **no** genera órdenes, **no** cambia fills ni outcomes, **no** reduce umbrales de sesgo/setup.
- `premium_discount_score` (0–15) y `premium_discount_grade` son **solo exporte** y calibración post-hoc.
- `InpPremiumDiscountScoreEnabled = false` deja el score en 0 con razón `pd_score_disabled`.

## Razonamientos (`premium_discount_reasons`)

Tokens concatenados (pipe `|`), incluyendo entre otros: `pd_valid_range`, `pd_missing_range`, `pd_invalid_range`, `pd_entry_discount`, `pd_entry_premium`, `pd_entry_equilibrium`, `pd_entry_outside_range`, `pd_zone_valid_for_long`, `pd_zone_valid_for_short`, `pd_zone_conflict_long_in_premium`, `pd_zone_conflict_short_in_discount`, `pd_entry_too_deep`, `pd_entry_too_shallow`, `pd_range_too_small`, `pd_range_too_large`, `pd_score_disabled`, `pd_unknown`.

## Próximo humo recomendado

**E5.13.1** — campaña ligera en Strategy Tester (recompilar EA, exportar bundle, validar CLI) para contrastar distribución de `premium_discount_score` con outcomes y con `expired_unfilled`, sin interpretación de trading en vivo.
