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

- **Extensión outcome (E5.2 / E5.3 — implementada en E5.3):** tipos `virtual_trade_*` y columnas ampliadas de trades — ver [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md) e implementación [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md); los validadores TS en `@workspace/mapazapp-core` los aceptan.

**`decision` soportados (validador TS):** incluye entre otros `bias_recorded`, `detected`, `setup_candidate_allowed`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `setup_ignored`, `ok`, `noop`, `lifecycle`.

## 5. `backtest_trades.csv`

- **Cabecera E3.4.2 (legacy compacta):**  
  `run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason`
- **Cabecera E5.3 (virtual outcome):** ver [`EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md) §3 — incluye `setup_event_id`, `entry_time`, `exit_time`, `exit_price`, `result_money`, `outcome`, modos virtual, FVG metadata, `bars_to_fill`, `bars_held`.
- **Filas:** opcional **header-only** (0 trades). Con simulación virtual activa, **una fila por trade virtual cerrado**; `trade_count` en summary **debe coincidir** con el número de filas.
- El importador TypeScript (`importBacktestTradesFromCsv`) acepta **solo cabecera** con aviso `CSV_HEADER_ONLY_NO_TRADE_ROWS`.
- **E5.3 implementado:** detalle en [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md).

## 6. `backtest_summary.json`

Campos clave además de identidad (`run_id`, `strategy_id`, `symbol`, timeframes, `tester_only`, `official_ea`, `backtest_role`):

- Contadores de bias: `total_bias_evaluated`, `bullish_bias_count`, …
- Contadores de setup: `total_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `ignored_small_fvg`, `last_setup_*`, `last_fvg_points`.
- **`trade_count`:** con **E5.3**, número de **filas** exportadas en `backtest_trades.csv` (puede ser **0**). Con `trade_count = 0`, no se exigen métricas de profit en summary.
- **`notes`:** texto libre ASCII; debe aclarar candidato FVG / limitaciones si aplica.

## 7. Samples y validación

- Samples oficiales: `APP/artifacts/mt5/experts/Mapazapp_TestEA/samples/`.
- Validación en memoria: `validateTestEaExportSample`, `validateTestEaExportBundleTexts`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` en `@workspace/mapazapp-core`.
- Fixtures de tests: `export-sample-validation-fixtures.ts` (`v212E342TestEaBundleFiles`).
- **E4.1 — CLI bundle real (carpeta run):** `pnpm --filter @workspace/scripts mapazapp:testea-export-validate` — [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md).

## 8. Limitaciones y no-objetivos

- **No** rentabilidad, **no** winrate obligatorio, **no** métricas de profit en summary mientras `trade_count = 0`.
- **No** pipeline IFVG completo en MQL5 (ver `has_full_ifvg_pipeline`).
- **No** dashboard ni API en E3.6.

## 9. Siguiente paso

- **E4 — First MT5 Strategy Tester smoke run** (manual): [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md).
- **E4.1 — Validación bundle exportado** (read-only, sin MT5): [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md).
- **E5 — Campaña XAUUSD** (diseño): [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md).
- **E5.1 — Decisión modo outcome:** [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md) — virtual en TestEA primero.
- **E5.2 — Contrato simulación virtual (cerrado, docs):** [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md) — ver §4–§5 impacto en eventos/trades/summary.
- **E5.3 — Implementación virtual outcome (cerrado):** [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md) — `Mapazapp_TestEA` + `EXPORT_CONTRACT.md` + validadores TS.

**Referencia detallada de columnas opcionales/obligatorias:** [`../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md).
