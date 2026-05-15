# Liquidity Sweep V1 — detección y export (E5.10)

## Propósito

Añadir a **Mapazapp_TestEA** un componente **profesional de observación** que describa si, antes de la vela de setup, el precio **barrió niveles de liquidez** relevantes (PDH/PDL del día previo completado y swings locales en M15). Los resultados se exportan en CSV/JSON y alimentan **`liquidity_event_score`** dentro del **Entry Quality Score**, **sin bloquear trades** y **sin usar liquidez como compuerta dura**. **E5.10.2** refinó el significado de `liquidity_event_score` hacia un **modelo de calidad** (subscores + columnas `liquidity_sweep_quality_*`) — ver [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md). **E5.10.4** añade la **cadena causal** observación (`liquidity_chain_*`) y alinea el componente de liquidez al **score de cadena** cuando aplica — [`LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md`](./LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md).

## Por qué importa la liquidez

En marcos institucionales, los retrocesos o entradas suelen alinearse con **pools de liquidez** (máximos/mínimos previos, equal highs/lows, liquidez de sesión). Incorporar señal de **barrido previo** reduce el componente “ciego” del score que E5.9.1 mostró como `liquidity_event_not_implemented` en todos los trades.

## Alcance V1 (implementado)

- **PDH sweep:** antes de la vela de setup, en una ventana de **M15** de `InpLiquiditySweepLookbackBars`, el precio superó el **máximo D1 del día previo completado** (más `InpLiquiditySweepBufferPoints` en puntos).
- **PDL sweep:** análogo por debajo del **mínimo D1** del día previo completado.
- **Swing alto local (M15):** pivote swing high en M15 tomado por encima antes de un setup **bearish**.
- **Swing bajo local (M15):** pivote swing low en M15 tomado por debajo antes de un setup **bullish**.
- Solo **velas cerradas**. Un único evento “mejor” por setup: prioridad direccional favorable, luego **más reciente**.

## Fuera de alcance V1 (no implementado)

- Sweeps por **sesión** (Asia / London), equal highs/lows, filtros de noticias, veto por spread en este bloque.
- Cualquier **OrderSend**, **CTrade** o lógica live.

## Integración con el score (observación)

- Con **`InpEnableLiquiditySweepDetection = false`**: no se evalúa barrido; `missing_quality_components` puede incluir `liquidity_sweep_detection_disabled`; razón de calidad `liquidity_sweep_disabled`.
- Con detección **on** y **`InpLiquiditySweepScoreEnabled`**: PDH/PDL favorable → banda **15–20** según edad; swing local favorable → **10–15**; sin evento → **0** y `liquidity_sweep_not_found`; contexto **opuesto** → **0–5** y `opposite_liquidity_sweep`.
- **No** se rebajan umbrales globales del score para fabricar A/B; **no** se aprueba el score como compuerta de entrada.

## Exportes

### `backtest_trades.csv`

Columnas: `liquidity_event_detected`, `liquidity_event_type`, `liquidity_event_direction`, `liquidity_event_age_bars`, `liquidity_event_level`, `liquidity_event_sweep_price`, `liquidity_event_distance_points`, `liquidity_event_reasons`.

### `backtest_events.csv`

En `setup_allowed` y `virtual_trade_candidate_created` (y detalles de simulación que reutilizan el mismo sufijo), campos `liq_ev_det`, `liq_ev_type`, `liq_ev_dir`, `liq_age`, `liq_lvl`, `liq_sweep_px`, `liq_dist_pts`, `liq_rsn` junto al bloque `eq_*`.

### `backtest_summary.json`

- `has_liquidity_sweep_v1_logic`: **true** (build actual).
- `liquidity_sweep_detection_enabled`, `liquidity_sweep_score_enabled`.
- Contadores: `liquidity_sweep_*_count`, `average_liquidity_event_score`.
- `optimization_parameters`: eco de lookbacks y buffer.

## Compatibilidad hacia atrás

Bundles sin columnas de liquidez: el importador TypeScript las trata como **opcionales**. `has_liquidity_sweep_v1_logic` ausente o **false** no activa la validación estricta de cabecera E5.10.

## Evidencia operador (E5.10.1)

El **humo safe-export** del operador (XAUUSD M15/D1, bundle bajo `Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`), la validación de bundle y el **rerun de calibración** post–liquidez están documentados en [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md), incluido el **caveat**: la V1 actual es **demasiado permisiva** como separador de calidad por outcome. El siguiente hito planificado es **E5.10.2 — Liquidity Sweep Quality Refinement**.

## Referencias

- Contrato: [`EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md)
- Evidencia calibración previa: [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md)
- Evidencia smoke + calibración post–E5.10: [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md)
