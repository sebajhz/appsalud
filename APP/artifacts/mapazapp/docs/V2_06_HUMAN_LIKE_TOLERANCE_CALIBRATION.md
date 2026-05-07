# V2-06 — Human-like Tolerance Calibration Matrix

## Por qué existe

Los detectores históricos ya usaban `max(ATR·k, spread·k, tick·n)` en puntos concretos (sweep, zona, SL), pero el **modelo de decisión** y la narrativa de “casi válido vs roto” carecían de una **capa explícita** que unifique tolerancias por dimensión (near-sweep, oversweep, retest, chase, spread, wick, TP distante, etc.) con **clasificación de calidad** y **puntuación 0–100** trazable.

Este checkpoint introduce **`evaluateToleranceCalibration`** en `@workspace/mapazapp-core`: lógica pura, determinista, **sin ejecución** y **sin afirmar rentabilidad**.

## Cómo se aleja del “3 pips fijos”

- Cada dimensión define **multiplicadores distintos** sobre ATR, spread en precio y ticks mínimos; la banda es siempre `max(ATR·atrMultiplier, spreadPrice·spreadMultiplier, tickSize·minTicks)` salvo casos especiales (p. ej. `entry_chase` en unidades R).
- El **perfil de símbolo** (`tickSize`, `spreadPrice`, `digits` implícitos vía tick) y el **ATR** anclan la escala: el mismo “error relativo” no produce la misma banda absoluta en XAUUSD que en EURUSD o NAS100.

## Dimensiones (`ToleranceDimension`)

| Dimensión | Rol breve |
|-----------|------------|
| `liquidity_sweep` | Desajuste estructural vs sweep confirmado. |
| `near_sweep` | Cercanía sin penetración plena. |
| `over_sweep_break_risk` | Profundidad excesa vs banda protectora. |
| `retest_depth` | Miss vs midpoint / borde con posible compensación por toque de zona. |
| `zone_padding` | Tolerancia de padding / ancho útil. |
| `entry_chase` | Chase hacia TP medido en **R** (tarde / caro). |
| `spread_cost` | Régimen **spread/ATR** y penalización de coste. |
| `sl_buffer` | Deficiencia de buffer vs dinámica ATR/spread/tick. |
| `confirmation_wick` | Déficit de mecha vs cuerpo (proxy de confirmación). |
| `target_distance` | Shortfall vs distancia mínima deseada al TP. |

## Regímenes

- **Volatilidad (`ToleranceVolatilityRegime`):** `low_volatility` · `normal_volatility` · `high_volatility` · `extreme_volatility` — comparando `atr` frente a `referenceAtr` (por defecto el mismo `atr` si no se suministra referencia).
- **Spread (`ToleranceSpreadRegime`):** `normal_spread` · `elevated_spread` · `expensive_spread` — a partir de umbrales de razón `spreadPrice / atr` en `ToleranceCalibrationSettings.spreadRegime`.

## Clasificación de calidad (`ToleranceQualityClassification`)

`ideal` → `acceptable` → `weak_but_usable` → `observe_only` → `invalid`, derivada del cociente **medida / tolerancia** (o reglas específicas en `entry_chase` / `spread_cost`).

## Ejemplos multi-símbolo (fixtures)

`createToleranceCalibrationFixtures()` documenta escenarios sintéticos:

- XAUUSD near aceptado vs oversweep break-risk.
- EURUSD “tiny miss” dentro de banda dinámica.
- USDJPY caso de precisión.
- NAS100 / BTCUSD ticks y volatilidad mayores.
- Chase tarde, spread caro, retest imperfecto con `zoneTouchOccurred`.

**No son datos reales de mercado** ni evidencia de edge.

## Cómo alimenta el modelo de decisión (V2-06)

- `DecisionModelInput.toleranceCalibrationResult` opcional.
- `DecisionModelSettings.toleranceIntegration` opcional:
  - `blendToleranceIntoSoftScore`: mezcla ponderada (**35%** tolerancia media de dimensiones relevantes) en `sweepQuality`, `retestQuality`, `entrySlTpQuality`, `timingQuality`, `spreadVolatilityQuality`.
  - `invalidToleranceInvalidatesVariant` + `criticalInvalidDimensions`: fuerza `invalid_variant` si una dimensión crítica es `invalid` (sin bloqueo duro si no se activa lo siguiente).
  - `invalidToleranceAsHardBlock`: añade `TOLERANCE_CALIBRATION_INVALID` a **hard gates** cuando hay dimensión crítica `invalid`.

Si no hay `toleranceIntegration` o no hay resultado de calibración, el comportamiento coincide con **V2-05**.

## Limitaciones (honestas)

- Los regímenes de volatilidad v1 son **comparativos simples** (`atr` vs `referenceAtr`), no un motor de régimen de mercado completo.
- `spread_cost` usa principalmente la razón spread/ATR del perfil de entrada, no una serie temporal de spread intra-barra.
- La integración en el modelo de decisión es **ligera (blend + políticas de variante/gate)**; no sustituye la geometría de `liquidity-sweep.ts` ni reescribe el pipeline IFVG.
- **Sin prueba de rentabilidad:** solo coherencia técnica, tests deterministas y trazabilidad.

## Siguiente paso recomendado

**V2-08 — Entry variant model** u optimización por bloques según roadmap; el contexto HTF v1 quedó en `evaluateContextBias` (V2-07).
