# Liquidity Sweep Quality V1 — refinamiento E5.10.2 (Mapazapp_TestEA)

## Contexto

**Liquidity Sweep V1 (E5.10)** detectaba correctamente barridos de liquidez (PDH/PDL y swings locales M15) y exportaba `liquidity_event_*` + `liquidity_event_score`. La evidencia E5.10.1 mostró que el modelo era **demasiado permisivo** como separador de calidad por *outcome*: casi todos los trades tenían sweep detectado, `liquidity_sweep_missing_count` podía ser 0, y **`average_liquidity_event_score`** apenas variaba entre wins, losses, ambiguous y expired_unfilled.

## Decisión de producto

- **No** bajar umbrales de score globales.
- **No** aprobar liquidez como compuerta dura.
- **No** aprobar live trading.
- **No** bloquear trades por liquidez en el EA.
- **Sí** mejorar la **diagnóstica de calidad** de liquidez con heurísticas en **velas cerradas** (observación / export).

## Qué añade E5.10.2 (Liquidity Sweep Quality V1)

Subscores (suma máx. **20** puntos en el componente de liquidez que alimenta `entry_quality_score` vía `liquidity_event_score` cuando el score de liquidez está habilitado):

| Dimensión | Rango | Idea |
|-----------|-------|------|
| Recencia | 0–4 | Sweep más reciente respecto al setup (≤4 barras fuerte; ≤12 media; resto débil dentro del lookback). |
| Dirección | 0–5 | Alineación PDH/PDL y swings con la dirección del setup; opuesto → casi nulo. |
| Reacción | 0–5 | Tras el sweep, al menos una vela cerrada “rechaza” el nivel; si no, **0** en componente bruto + `liquidity_sweep_no_reaction` (E5.10.2.1). |
| Desplazamiento | 0–4 | Entre el sweep y el setup: cuerpo direccional o mini-FVG coherente; si no hay evidencia, **0** en componente bruto + razón `liquidity_sweep_displacement_not_confirmed` (E5.10.2.1). |
| Distancia al FVG | 0–2 | Proximidad del nivel de liquidez al centro del FVG del setup; niveles muy lejos penalizan. |

**Grado de calidad** (`liquidity_sweep_quality_grade`): **A** ≥17, **B** 13–16, **C** 8–12, **Weak** 1–7, **None** 0.

**E5.10.2.1 — Topes de contexto (mismo máx. 20 en bruto, total final capado):** sin cambiar umbrales globales de Entry Quality, el total `liquidity_sweep_quality_score` aplica **mins** encadenados cuando no hay contexto “suficiente” para bandas altas: opuesto (≤7); sin reacción clara **y** sin desplazamiento (≤8); falta de reacción **o** desplazamiento (≤12); nivel lejos del FVG / `distQ==0` (≤10); dirección solo parcial (≤13); sin el conjunto **reacción + desplazamiento + proximidad + dirección ≥4 + recencia ≥4** barras fuertes (≤16) — así **A** exige más que mera detección. Tras el total capado, los cinco subscores exportados se **redistribuyen proporcionalmente** para que **sumen exactamente** el total mostrado.

### Razones (`liquidity_sweep_quality_reasons`)

- **E5.10.2.1 (actual):** la cadena es `|`-separada. Primero van tokens **específicos** por subcondición: `liquidity_sweep_old`, `opposite_liquidity_sweep`, `liquidity_directional_partial`, `liquidity_sweep_no_reaction`, `liquidity_sweep_displacement_not_confirmed`, `liquidity_level_far_from_fvg`. **`liquidity_sweep_quality_weak`** aparece **como máximo una vez** y **solo** si el grado final es **Weak** (1–7) — no se duplica por cada subfallo (corrige conteos de frecuencia inflados en análisis por token). **`liquidity_sweep_quality_ok`** se añade para grado **A** o **B**, y para **C** con total **≥ 12** (cohorte “fuerte” dentro de C). Sin compuerta dura.
- **E5.10.2 (histórico):** en builds anteriores `liquidity_sweep_quality_weak` podía repetirse junto a cada subcondición y `quality_ok` solo si la cadena quedaba vacía; usar **E5.10.2.1+** para analítica por razón.

**Importante:** no se reintroduce `liquidity_event_not_implemented`. Un sweep débil sigue siendo **detectado**; la calidad baja en score, no se marca como “no implementado”.

## Export

- **Trades:** columnas `liquidity_sweep_quality_*` además de las E5.10 existentes.
- **Summary JSON:** `has_liquidity_sweep_quality_v1_logic`, medias y conteos por banda de grado, medias de subscores, medias opcionales por outcome.
- **Eventos** (`setup_allowed`, `virtual_trade_candidate_created`, …): sufijo compacto `liq_q=… liq_q_grade=… liq_q_rec=…` en `details`.

## Integración con Entry Quality Score

Se prefiere **`liquidity_event_score` = `liquidity_sweep_quality_score`** (total 0–20 del bloque de calidad) cuando `InpLiquiditySweepScoreEnabled` está activo, para que el **Entry Quality Score** se beneficie del refinamiento. Si el score de liquidez está desactivado, `liquidity_event_score` puede seguir en 0 en el paquete de scoring, pero las columnas de calidad en CSV siguen exportándose para diagnóstico (según detección habilitada).

## Validación TS y analizador E5.9

- `validateTestEaExportSample`: si `has_liquidity_sweep_quality_v1_logic === true`, exige cabecera y campos de resumen E5.10.2.
- Bundles **antiguos** sin esas columnas **siguen parseando**.
- `testea-score-calibration`: si el CSV incluye columnas numéricas de calidad, rellena `liquidity_quality_component_stats` (min/max/media y *slices* por outcome cuando aplica).

## Próximo smoke recomendado — E5.10.3

1. Recompilar TestEA (`MZP_TestEA_E5_10_2_1`) y exportar un bundle real (Strategy Tester).
2. Ejecutar `mapazapp:testea-export-validate` y `mapazapp:testea-score-calibration`.
3. Comparar **distribución** de `liquidity_sweep_quality_score` por `outcome` y bandas de grado.

### Qué contaría como mejora

- El **quality score** varía de forma significativa por *outcome* (no plano como el V1 “plano”).
- Los sweeps **débiles** ya no reciben puntuaciones altas de liquidez.
- Correlación exploratoria con **menor ambiguous_rate** o **mayor expectancy** en cohortes de mayor calidad (hipótesis; no es aprobación de trading).
- La **banda superior** de calidad supera a la inferior en métricas de cohorte (expectancy / ambigüedad), sin convertirlo en gate.

## Referencias

- [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md)
- [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md)
- [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md)
- [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md)
