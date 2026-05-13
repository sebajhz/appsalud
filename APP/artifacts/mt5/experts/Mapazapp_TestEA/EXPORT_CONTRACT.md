# Mapazapp_TestEA — export contract (E3.6)

> **Schema freeze (E3.6):** contrato de evidencia para **`Mapazapp_TestEA.mq5`** antes del primer smoke Strategy Tester (**E4**). Resumen de mapa: [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md).

## Roles

| Componente | Rol |
|--------------|-----|
| **`Mapazapp_TestEA`** | **Único EA oficial** del MetaTrader 5 **Strategy Tester** para setup proof / exports de backtest en esta fase. |
| **`Mapazapp_BridgeEA`** | **Separado**: export read-only en terminal live (`MZP_BRIDGE_V1`); **no** sustituye al TestEA. |

**No hay órdenes:** sin `OrderSend`, sin `CTrade`, sin filas de trade inventadas. **`trade_count`** permanece **0** hasta una fase explícita de simulación u órdenes en tester.

## Versión de schema

| Campo JSON | Valor |
|------------|--------|
| `schema_version` | **`backtest_ea_v1`** (default `InpSchemaVersion`) |

Fixtures históricos y herramientas pueden seguir usando **`MZP_TESTEA_V1`** (Checkpoint 14) para compatibilidad de importación; el EA actual escribe **`backtest_ea_v1`**.

---

## 1. Sandbox root

Todas las rutas son relativas al perfil activo **`MQL5\Files\`**.

```text
MQL5\Files\<InpExportRoot>\<run_id>\
```

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

### 2.2 `event_type` soportados (E3.6)

- `lifecycle_init`
- `skeleton_ready`
- `daily_bias_evaluated`
- `setup_detected`
- `setup_allowed`
- `setup_rejected`
- `setup_skipped`
- `lifecycle_deinit`

### 2.3 `decision` soportados (validación TypeScript E3.6)

Incluye (lista congelada en `parseBacktestEventsCsv`):  
`bias_recorded`, `setup_candidate_allowed`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `setup_ignored`, `lifecycle`, `detected`, `ok`, `noop`.

---

## 3. `backtest_trades.csv`

- **Encoding:** ANSI, ASCII-safe.
- **Cabecera obligatoria** cuando el EA escribe el archivo (E3.4.2+):  
  `run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason`
- **Filas de datos:** **ninguna** en la fase actual — **válido header-only**. **No** crear trades falsos ni `result_r` inventado.
- **Dirección en filas futuras:** `BUY`/`SELL` o `LONG`/`SHORT` (normaliza el importador TS).

### 3.1 Importador TypeScript (`importBacktestTradesFromCsv`)

- Con **solo cabecera** (0 filas de datos): **`ok: true`**, `trades: []`, aviso **`CSV_HEADER_ONLY_NO_TRADE_ROWS`**.
- Con filas en formato compacto: alias `timestamp` → `entry_time`, `entry` → `entry_price`; si faltan columnas literales `exit_time` / `exit_price` pero existen `timestamp` / `entry`, el importador duplica índices según `resolveHeaderIndex` en `backtest-importer.ts`.

### 3.2 Columnas extendidas (metadata futura)

Para bundles **`MZP_TESTEA_V1`** / filas con métricas opcionales, ver columnas adicionales en el importador (`commission`, `swap`, `zone_id`, …) — **opcionales** salvo las requeridas para filas con trade real.

---

## 4. `backtest_summary.json`

### 4.1 Obligatorios (`backtest_ea_v1`)

| Campo | Tipo | Notas |
|-------|------|--------|
| `schema_version` | string | `backtest_ea_v1` |
| `run_id` | string | Coherente con export. |
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
| `trade_count` | number | **0** en fase actual. |
| Contadores bias | number | `total_bias_evaluated`, `bullish_bias_count`, `bearish_bias_count`, `neutral_bias_count`, `unknown_bias_count`. |
| Contadores setup | number | `total_setup_candidates`, `bullish_setup_candidates`, `bearish_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `ignored_small_fvg`. |
| Último setup | string / number | `last_setup_direction`, `last_setup_decision`, `last_setup_reason`, `last_fvg_points`. |
| `exported_at_utc` | string | ISO UTC. |
| `notes` | string | Diagnósticos; debe aclarar limitaciones si aplica. |

### 4.2 Opcionales / echo

`ea_build`, `broker_symbol`, `use_h4_context`, `use_h1_context`, etc. — según el EA; no sustituyen campos obligatorios de identidad y flags de seguridad.

### 4.3 Significado de contadores (resumen)

- **Bias:** evaluaciones diarias registradas por outcome (bullish / bearish / neutral / unknown).
- **Setup:** candidatos FVG detectados; `allowed_setups` = pasaron gate de bias cuando el gate está activo; `rejected_by_daily_bias` / `skipped_neutral_bias` / `missing_bias_context` / `ignored_small_fvg` desglosan otros desenlaces.

### 4.4 Legacy `MZP_TESTEA_V1`

Ver tabla en versiones anteriores de este contrato y en tests `V2_12_TESTEA_BACKTEST_SUMMARY_JSON` — `execution_mode: virtual_export_only`, `live_trading_enabled: false`, etc.

---

## 5. Limitaciones actuales (no sobreprometer)

- **No** pipeline IFVG completo en MQL5: **no** FVG→IFVG como en `tryConvertFvgToIfvg`, **no** filtros ATR del pipeline IFVG del core, **no** sweeps, **no** target liquidity, **no** simulación de trades.
- **Sí** detección **FVG candidata** / **Setup V1 candidato** (tres velas cerradas, geometría alineada con `fvg-detector.ts`) + **Daily Bias gate**.

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
