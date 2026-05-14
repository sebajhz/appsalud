# Mapazapp_TestEA — export contract (E3.6 + E5.3 virtual outcome)

> **Baseline E3.6** + **extensión E5.3** (simulación virtual sin órdenes). Resumen de mapa: [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md). Implementación: [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](../../../mapazapp/docs/TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md).

## Roles

| Componente | Rol |
|--------------|-----|
| **`Mapazapp_TestEA`** | **Único EA oficial** del MetaTrader 5 **Strategy Tester** para setup proof / exports de backtest en esta fase. |
| **`Mapazapp_BridgeEA`** | **Separado**: export read-only en terminal live (`MZP_BRIDGE_V1`); **no** sustituye al TestEA. |

**No hay órdenes reales:** sin `OrderSend`, sin `CTrade`, sin posiciones abiertas por el EA. Con **`InpEnableVirtualTrades`** y **`InpWriteVirtualTrades`** activos, el EA puede escribir **filas de trades virtuales** coherente con la simulación (no son órdenes MT5). **`trade_count`** en `backtest_summary.json` debe **igualar** el número de filas de datos en `backtest_trades.csv` (0 si solo cabecera o simulación desactivada / sin escritura de filas).

## Versión de schema

| Campo JSON | Valor |
|------------|--------|
| `schema_version` | **`backtest_ea_v1`** (default `InpSchemaVersion`) |

Fixtures históricos y herramientas pueden seguir usando **`MZP_TESTEA_V1`** (Checkpoint 14) para compatibilidad de importación; el EA actual escribe **`backtest_ea_v1`**.

---

## 1. Sandbox root

Todas las rutas son relativas al perfil activo **`MQL5\Files\`**.

**Modo legacy (`InpOptimizationSafeExports = false`, default):**

```text
MQL5\Files\<InpExportRoot>\<run_id>\
```

**Modo optimización seguro (`InpOptimizationSafeExports = true`, E5.5.0+):**

```text
MQL5\Files\<InpExportRoot>\<campaign_id>\<folder_leaf>\
```

`folder_leaf` es determinista (p. ej. desde `InpParameterSetId` + `InpVirtualMinTradeFvgPoints` + `InpVirtualRiskReward` + `InpDailyBiasMinBodyPoints` + `InpRequireDailyBiasAlignment` cuando `InpAutoBuildRunIdFromParams = true`). Ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](../../../mapazapp/docs/TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).

Por defecto `InpExportRoot` = `Mapazapp\TestEA`.

---

## 2. `backtest_events.csv` (E3.6)

- **Encoding:** ANSI (`FILE_ANSI`), contenido ASCII-safe.
- **Cabecera obligatoria (orden recomendado):**  
  `run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details`

### 2.1 Campos

| Columna | Obligatorio | Significado |
|---------|-------------|-------------|
| `run_id` | Sí | Identificador de corrida (coherente con carpeta / summary). |
| `event_id` | Sí | Id estable por evento (p. ej. `EVT_000001`). |
| `timestamp` | Sí | ISO UTC recomendado (`…Z`). |
| `symbol` | Sí | Símbolo canónico de trabajo (p. ej. `XAUUSD`). |
| `event_type` | Sí | Tipo de evento (catálogo congelado abajo). |
| `bias_direction` | Sí | `bullish` \| `bearish` \| `neutral` \| `unknown` (y `none` donde aplique en wire legacy). |
| `setup_direction` | Sí | `long` \| `short` \| `none`. |
| `decision` | Sí | Resultado lógico del paso (catálogo congelado abajo). |
| `reason` | Sí | Etiqueta corta legible / código de razón. |
| `details` | Sí | Texto sanitizado; puede incluir `fvg_low`, `fvg_high`, `fvg_points`, `candle_time`, `gate_result`, etc. **No** rutas privadas ni secretos. |

### 2.2 `event_type` soportados (E3.6 + E5.3)

- `lifecycle_init`
- `skeleton_ready`
- `daily_bias_evaluated`
- `setup_detected`
- `setup_allowed`
- `setup_rejected`
- `setup_skipped`
- `virtual_trade_candidate_created` (E5.3)
- `virtual_trade_entry_filled` (E5.3)
- `virtual_trade_closed` (E5.3)
- `virtual_trade_expired` (E5.3)
- `virtual_trade_ambiguous` (E5.3)
- `virtual_trade_skipped` (E5.3; E5.4.1: granular `reason` tags e.g. `invalid_geometry_entry_sl`, `fvg_below_virtual_trade_min`)
- `virtual_trade_unresolved` (E5.4.1 — active virtual trade at `OnDeinit`)
- `lifecycle_deinit`

### 2.3 `decision` soportados (validación TypeScript)

Incluye (lista en `parseBacktestEventsCsv`):  
`bias_recorded`, `setup_candidate_allowed`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `setup_ignored`, `lifecycle`, `detected`, `ok`, `noop`, **`created`**, **`filled`**, **`closed`**, **`expired`**, **`ambiguous`**, **`skipped`** (E5.3 virtual), **`unresolved`** (E5.4.1 `virtual_trade_unresolved`).

---

## 3. `backtest_trades.csv`

- **Encoding:** ANSI, ASCII-safe.
- **Cabecera E5.3 (cuando hay simulación virtual):**  
  `run_id,trade_id,setup_event_id,timestamp,entry_time,exit_time,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,exit_price,result_r,result_money,outcome,exit_reason,setup_reason,bias_reason,rejection_reason,bars_to_fill,bars_held,fvg_low,fvg_high,fvg_points,parameter_set_id,entry_mode,stop_mode,ambiguity_mode`
- **Cabecera E5.8 (extensión observación — columnas añadidas al final):**  
  `entry_quality_score,entry_quality_grade,htf_narrative_score,liquidity_event_score,displacement_fvg_quality_score,entry_confirmation_score,target_quality_score,session_news_spread_score,risk_overtrading_score,ambiguous_risk_score,quality_reasons,missing_quality_components,ambiguous_risk_reasons,liquidity_event_type,session_bucket,trade_window_status,spread_status,news_mode`  
  Los bundles **anteriores** sin estas columnas siguen siendo válidos (importador TS: columnas opcionales). Cuando existan, `validateTestEaExportSample` exige coherencia con `has_entry_quality_score_logic` / `score_observation_only` / `score_gate_enabled` en `backtest_summary.json` (ver validador en `@workspace/mapazapp-core`).
- **Filas de datos:** **ninguna** si la corrida no produce trades virtuales cerrados — **válido header-only**. Las filas deben corresponder a **cierres** de la simulación virtual (win/loss/expired/ambiguous/…); **no** filas sintéticas sin lógica del EA.
- **Dirección:** `BUY`/`SELL` o `LONG`/`SHORT` (normaliza el importador TS).

### 3.1 Importador TypeScript (`importBacktestTradesFromCsv`)

- Con **solo cabecera** (0 filas de datos): **`ok: true`**, `trades: []`, aviso **`CSV_HEADER_ONLY_NO_TRADE_ROWS`**.
- Con filas: columnas `entry` → `entry_price` (alias); `timestamp` opcional hacia `entry_time`/`exit_time` si faltan (legacy E3.4.2); columna **`outcome`** validada contra catálogo E5.3+ (**incluye `unresolved`**); avisos de geometría (SL vs entry, TP vs entry, riesgo ≤ 0).

### 3.2 Columnas extendidas (metadata futura)

Para bundles **`MZP_TESTEA_V1`** / filas con métricas opcionales, ver columnas adicionales en el importador (`commission`, `swap`, `zone_id`, …) — **opcionales** salvo las requeridas para filas importables.

---

## 4. `backtest_summary.json`

### 4.1 Obligatorios (`backtest_ea_v1`)

| Campo | Tipo | Notas |
|-------|------|--------|
| `schema_version` | string | `backtest_ea_v1` |
| `run_id` | string | Coherente con export / columnas CSV. Con **E5.5.0+** puede convivir con `effective_run_id` cuando la carpeta hoja difiere del id legacy. |
| `strategy_id` | string | Metadatos de estrategia (p. ej. `IFVG_XAUUSD_V1`). |
| `parameter_set_id` | string | Metadatos de set. |
| `symbol` | string | Canónico. |
| `execution_timeframe` | string | Wire `M15`, `H1`, … |
| `daily_bias_timeframe` | string | Wire `D1`, … |
| `backtest_mode` | string | p. ej. `virtual`. |
| `tester_only` | boolean | **true** |
| `official_ea` | string | **`Mapazapp_TestEA`** |
| `backtest_role` | boolean | **true** |
| `has_real_daily_bias_logic` | boolean | **true** |
| `has_real_ifvg_logic` | boolean | **true** — significa **detección FVG / candidato Setup V1 presente**, no pipeline IFVG completo. |
| `has_full_ifvg_pipeline` | boolean | **false** (E3.6+) — sin conversión FVG→IFVG completa, sin ATR/sweeps/target liquidity del pipeline IFVG en el EA. |
| `has_real_trading_orders` | boolean | **false** |
| `has_real_virtual_trade_logic` | boolean | **true** cuando la simulación virtual está habilitada en el EA (E5.3). |
| `has_entry_quality_score_logic` | boolean | **E5.8:** **true** cuando el EA exporta el modelo Entry Quality Score V1 (observación; no compuerta de trades). |
| `score_observation_only` | boolean | **E5.8:** debe ser **true** si `has_entry_quality_score_logic` es true (sin bloqueo por score). |
| `score_gate_enabled` | boolean | **E5.8:** debe ser **false** en modo observación (sin veto automático por umbral de score). |
| `entry_quality_score_export_enabled` | boolean | Eco de `InpEntryQualityScoreEnabled` (export numérico activo o filas en ceros con marca `off`). |
| Agregados score (E5.8) | number | `score_a_count`, `score_b_count`, `score_c_count`, `score_rejected_count`, `average_entry_quality_score`, `average_ambiguous_risk_score`, `average_score_win`, `average_score_loss`, `average_score_ambiguous` (promedios 0 si no hubo trades en esa categoría). |
| `trade_count` | number | **Debe igualar** el número de filas de datos en `backtest_trades.csv`. Con simulación virtual **E5.4.1+**, conviene que **`virtual_trade_count`** coincida con **`trade_count`** (paridad candidato/fila documentada en `TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`). |
| Contadores / métricas virtuales (E5.3) | number | p. ej. `virtual_trade_count`, `filled_trade_count`, `win_count`, `loss_count`, `unresolved_count` (E5.4.1), `total_r`, `average_r`, `winrate`, `expectancy_r`, `max_drawdown_r`, … — ver implementación E5.3 / E5.4.1. |
| Contadores bias | number | `total_bias_evaluated`, `bullish_bias_count`, `bearish_bias_count`, `neutral_bias_count`, `unknown_bias_count`. |
| Contadores setup | number | `total_setup_candidates`, `bullish_setup_candidates`, `bearish_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `ignored_small_fvg`. |
| Último setup | string / number | `last_setup_direction`, `last_setup_decision`, `last_setup_reason`, `last_fvg_points`. |
| `exported_at_utc` | string | ISO UTC. |
| `notes` | string | Diagnósticos; debe aclarar limitaciones si aplica. |

### 4.2 Opcionales / echo

`ea_build`, `broker_symbol`, `use_h4_context`, `use_h1_context`, **`campaign_id`**, **`optimization_safe_exports`**, **`effective_run_id`**, **`effective_export_folder_label`**, **`optimization_parameters`** (E5.5.0+) — según el EA; no sustituyen campos obligatorios de identidad y flags de seguridad.

### 4.3 Significado de contadores (resumen)

- **Bias:** evaluaciones diarias registradas por outcome (bullish / bearish / neutral / unknown).
- **Setup:** candidatos FVG detectados; `allowed_setups` = pasaron gate de bias cuando el gate está activo; `rejected_by_daily_bias` / `skipped_neutral_bias` / `missing_bias_context` / `ignored_small_fvg` desglosan otros desenlaces.

### 4.4 Legacy `MZP_TESTEA_V1`

Ver tabla en versiones anteriores de este contrato y en tests `V2_12_TESTEA_BACKTEST_SUMMARY_JSON` — `execution_mode: virtual_export_only`, `live_trading_enabled: false`, etc.

---

## 5. Limitaciones actuales (no sobreprometer)

- **No** pipeline IFVG completo en MQL5: **no** FVG→IFVG como en `tryConvertFvgToIfvg`, **no** filtros ATR del pipeline IFVG del core, **no** sweeps, **no** target liquidity.
- **Sí** detección **FVG candidata** / **Setup V1 candidato** + **Daily Bias gate** + **simulación virtual de outcome** (E5.3) sobre velas cerradas, **sin** ticks de orden intra-barra y **sin** órdenes MT5.

---

## 6. Non-goals

- Rentabilidad, listo para producción, u órdenes live desde estos exportes.
- Mutación automática de registry o aprobación de parameter sets.
- Dashboard, API, WebSocket, DB, watcher — fuera de alcance de E3.6.
- `OrderSend`, `CTrade`, `WebRequest`, DLL arbitrarias, command files — ver **`MANUAL_TEST_CHECKLIST.md`**.

---

## 7. Referencias

- **Core:** `APP/lib/mapazapp-core/src/backtest-importer.ts`, `backtest-events-csv.ts`, `export-sample-validation.ts`.
- **Setup / bias:** [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](../../../mapazapp/docs/BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md), [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](../../../mapazapp/docs/BACKTESTEA_IFVG_SETUP_V1_E3_5.md), [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](../../../mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md).
