# Mapazapp_TestEA — export schema (E3.6)

## 1. Propósito

- **Congelar** el contrato de evidencia que escribe **`Mapazapp_TestEA`** antes del primer **smoke real** en MT5 Strategy Tester (**E4**). El smoke E4 valida en runtime que los exports reales respetan este documento — ver [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md).
- **E3.6** no ejecuta MT5 ni Strategy Tester; solo documentación, samples, validadores TypeScript y tests.

## 2. Archivos exportados (por corrida)

Bajo `MQL5\Files\<InpExportRoot>\<run_id>\` (por defecto `Mapazapp\TestEA\<run_id>\`):

| Archivo | Rol |
|---------|-----|
| `backtest_events.csv` | Traza temporal: bias, setup candidato, lifecycle. |
| `backtest_trades.csv` | **Solo cabecera** mientras `trade_count = 0`; sin filas sintéticas. |
| `backtest_summary.json` | Resumen de corrida, flags y contadores. |

**Relación con otros EAs:** **`Mapazapp_BridgeEA`** es **separado** (export read-only en terminal live, contrato `MZP_BRIDGE_V1`). **`Mapazapp_TestEA`** es el **único EA oficial** del Strategy Tester para evidencia de setup en esta fase.

## 3. `schema_version` y banderas

- **`schema_version`:** `backtest_ea_v1` (valor por defecto del EA).
- **`has_real_ifvg_logic: true`:** indica que existe **detección de FVG / candidato Setup V1** (geometría de tres velas cerradas, alineada con el core), **no** un pipeline IFVG completo.
- **`has_full_ifvg_pipeline: false`:** explícito desde **E3.6** — **no** hay conversión FVG→IFVG, ATR del pipeline IFVG, sweeps, liquidez objetivo ni simulación de trades en el EA.
- **`has_real_trading_orders: false`:** sin `OrderSend` / `CTrade`.
- **`has_real_daily_bias_logic: true`:** Daily Bias V1 operativo.

## 4. `backtest_events.csv`

- Cabecera fija: `run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details`.
- **`details`:** texto ASCII sanitizado (sin rutas de usuario tipo `C:\Users\...`); puede incluir `fvg_low`, `fvg_high`, `fvg_points`, `candle_time`, `gate_result`, etc.

**`event_type` soportados (E3.6):** `lifecycle_init`, `skeleton_ready`, `daily_bias_evaluated`, `setup_detected`, `setup_allowed`, `setup_rejected`, `setup_skipped`, `lifecycle_deinit`.

**`decision` soportados (validador TS):** incluye entre otros `bias_recorded`, `detected`, `setup_candidate_allowed`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `setup_ignored`, `ok`, `noop`, `lifecycle`.

## 5. `backtest_trades.csv`

- Cabecera **E3.4.2+:**  
  `run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason`
- **Sin filas de datos** hasta una fase aprobada de simulación de trades u órdenes en tester.
- El importador TypeScript (`importBacktestTradesFromCsv`) acepta **solo cabecera** con aviso `CSV_HEADER_ONLY_NO_TRADE_ROWS`.

## 6. `backtest_summary.json`

Campos clave además de identidad (`run_id`, `strategy_id`, `symbol`, timeframes, `tester_only`, `official_ea`, `backtest_role`):

- Contadores de bias: `total_bias_evaluated`, `bullish_bias_count`, …
- Contadores de setup: `total_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `ignored_small_fvg`, `last_setup_*`, `last_fvg_points`.
- **`trade_count`:** debe permanecer **0** en la fase actual.
- **`notes`:** texto libre ASCII; debe aclarar candidato FVG / limitaciones si aplica.

## 7. Samples y validación

- Samples oficiales: `APP/artifacts/mt5/experts/Mapazapp_TestEA/samples/`.
- Validación en memoria: `validateTestEaExportSample`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` en `@workspace/mapazapp-core`.
- Fixtures de tests: `export-sample-validation-fixtures.ts` (`v212E342TestEaBundleFiles`).

## 8. Limitaciones y no-objetivos

- **No** rentabilidad, **no** winrate obligatorio, **no** métricas de profit en summary mientras `trade_count = 0`.
- **No** pipeline IFVG completo en MQL5 (ver `has_full_ifvg_pipeline`).
- **No** dashboard ni API en E3.6.

## 9. Siguiente paso

- **E4 — First MT5 Strategy Tester smoke run** (manual, con checklist operador): [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md).

**Referencia detallada de columnas opcionales/obligatorias:** [`../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md).
